import * as fs from "fs";
import * as path from "path";

export interface UserToken {
  userId: string;
  userPrincipalName: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  timestamp: string;
}

export class TokenManager {
  private tokensFilePath: string;
  private tokens: Map<string, UserToken>;

  constructor(filePath: string = path.join(__dirname, "../data/tokens.json")) {
    this.tokensFilePath = filePath;
    this.tokens = new Map<string, UserToken>();
    this.loadTokens();
  }

  private loadTokens() {
    try {
      if (fs.existsSync(this.tokensFilePath)) {
        const rawData = fs.readFileSync(this.tokensFilePath, "utf-8");
        const jsonData = JSON.parse(rawData);
        this.tokens = new Map(Object.entries(jsonData));
      } else {
        // Ensure directory exists
        const dir = path.dirname(this.tokensFilePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        this.saveTokens();
      }
    } catch (error) {
      console.error("Error loading tokens:", error);
      this.tokens = new Map<string, UserToken>();
    }
  }

  private saveTokens() {
    try {
      const jsonData = Object.fromEntries(this.tokens);
      const dir = path.dirname(this.tokensFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.tokensFilePath, JSON.stringify(jsonData, null, 2));
    } catch (error) {
      console.error("Error saving tokens:", error);
    }
  }

  storeUserToken(token: UserToken) {
    this.tokens.set(token.userId, token);
    this.saveTokens();
  }

  getUserToken(userId: string): UserToken | undefined {
    return this.tokens.get(userId);
  }

  getAllTokens(): Record<string, UserToken> {
    return Object.fromEntries(this.tokens);
  }
}
