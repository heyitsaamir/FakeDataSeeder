import axios from "axios";
import { TokenManager, UserToken } from "./tokenManager";

export interface AuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorityUrl: string;
  scopes: string[];
}

export class AuthService {
  private tokenManager: TokenManager;
  private config: AuthConfig;

  constructor(config: AuthConfig, tokenManager: TokenManager) {
    this.config = config;
    this.tokenManager = tokenManager;
  }

  public getAuthorizationUrl(): string {
    return `${this.config.authorityUrl}/authorize?client_id=${
      this.config.clientId
    }&response_type=code&redirect_uri=${encodeURIComponent(
      this.config.redirectUri
    )}&response_mode=query&scope=${encodeURIComponent(
      this.config.scopes.join(" ")
    )}&state=12345`;
  }

  public async exchangeCodeForToken(code: string): Promise<{
    userId: string;
    displayName: string;
    email: string;
    userPrincipalName: string;
  }> {
    // Step 6: Exchange authorization code for access token
    const tokenResponse = await axios.post(
      `${this.config.authorityUrl}/token`,
      new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: code,
        redirect_uri: this.config.redirectUri,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Step 7: Verify token by calling Microsoft Graph API
    const graphResponse = await axios.get(
      "https://graph.microsoft.com/v1.0/me",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const userId = graphResponse.data.id;

    // Step 8: Save tokens
    const userToken: UserToken = {
      userId,
      userPrincipalName: graphResponse.data.userPrincipalName,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      timestamp: new Date().toISOString(),
    };

    this.tokenManager.storeUserToken(userToken);

    return {
      userId,
      displayName: graphResponse.data.displayName,
      email: graphResponse.data.userPrincipalName,
      userPrincipalName: graphResponse.data.userPrincipalName,
    };
  }

  public async refreshToken(userId: string): Promise<{
    userId: string;
    expiresIn: number;
  }> {
    // Check if we have tokens for this user
    const userToken = this.tokenManager.getUserToken(userId);

    if (!userToken) {
      throw new Error("User not found");
    }

    const refreshToken = userToken.refreshToken;

    if (!refreshToken) {
      throw new Error("No refresh token available for this user");
    }

    // Step 4: Use the refresh token to get a new access token
    const tokenResponse = await axios.post(
      `${this.config.authorityUrl}/token`,
      new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: this.config.scopes.join(" "),
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Update the tokens in storage
    const updatedToken: UserToken = {
      ...userToken,
      accessToken: access_token,
      refreshToken: refresh_token || userToken.refreshToken, // Use new refresh token if provided, otherwise keep the old one
      expiresIn: expires_in,
      timestamp: new Date().toISOString(),
    };

    this.tokenManager.storeUserToken(updatedToken);

    return {
      userId,
      expiresIn: expires_in,
    };
  }

  public getAllTokens(): Record<string, UserToken> {
    return this.tokenManager.getAllTokens();
  }
}
