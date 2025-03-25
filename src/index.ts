import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { AuthService } from "./services/AuthService";
import { ConversationService } from "./services/ConversationService";
import { DataFaker } from "./services/DataFakerService";
import { TokenManager } from "./services/tokenManager";
import { MockMessage, SeedConfig } from "./services/types";
// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const port = process.env.PORT || 3000;

// Admin configuration
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// Microsoft OAuth configuration
const authConfig = {
  clientId: process.env.MS_CLIENT_ID || "",
  clientSecret: process.env.MS_CLIENT_SECRET || "",
  redirectUri:
    process.env.REDIRECT_URI || "http://localhost:3000/auth/callback",
  authorityUrl: "https://login.microsoftonline.com/common/oauth2/v2.0",
  scopes: [
    "user.read",
    "offline_access",
    "ChatMessage.Send",
    "ChannelMessage.Send",
    "Chat.Read",
  ],
};

// Initialize the token manager
const tokenManager = new TokenManager();

// Initialize the auth service
const authService = new AuthService(authConfig, tokenManager);

// Initialize the conversation service
const conversationService = new ConversationService(tokenManager);

// Initialize the data faker service
const dataFaker = new DataFaker(tokenManager);

// Admin authentication middleware
const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const adminAuthHeader = req.headers["admin-auth"];

  if (adminAuthHeader === ADMIN_PASSWORD) {
    next();
  } else {
    res
      .status(401)
      .json({ error: "Unauthorized: Admin authentication required" });
  }
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")));

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// Authentication page endpoint
app.get("/authenticate", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "public", "authenticate.html"));
});

// Admin page endpoint
app.get("/admin", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Generate authorization URL
app.get("/auth/url", (req: Request, res: Response) => {
  const authUrl = authService.getAuthorizationUrl();
  res.json({ authUrl });
});

// Handle the callback, exchange code for tokens, verify with Graph API, and save tokens
app.get("/auth/callback", async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code) {
    res.redirect("/authenticate?error=Authorization code not received");
    return;
  }

  try {
    const user = await authService.exchangeCodeForToken(code.toString());

    // Redirect back to authenticate page with success message
    res.redirect(
      `/authenticate?success=true&user=${encodeURIComponent(
        user.userPrincipalName || user.email || "User"
      )}`
    );
  } catch (error) {
    console.error("Authentication error:", error);
    res.redirect("/authenticate?error=Authentication failed");
  }
});

// Endpoint to refresh a token for a specific user ID
app.get("/auth/refresh/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const result = await authService.refreshToken(userId);

    res.json({
      success: true,
      message: "Token refreshed successfully",
      userId: result.userId,
      expiresIn: result.expiresIn,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to refresh token";
    console.error("Error refreshing token:", error);

    if (errorMessage === "User not found") {
      res.status(404).json({ error: errorMessage });
    } else {
      res.status(500).json({ error: errorMessage });
    }
  }
});

// Endpoint to get all tokens (for development purposes)
// Protected with admin authentication
app.get("/tokens", adminAuth, (req: Request, res: Response) => {
  res.json(authService.getAllTokens());
});

// Endpoint to get all conversations
app.get("/conversations", adminAuth, (req: Request, res: Response) => {
  try {
    const conversations = conversationService.getAllConversations();
    res.json(conversations);
  } catch (error) {
    console.error("Error retrieving conversations:", error);
    res.status(500).json({ error: "Failed to retrieve conversations" });
  }
});

// Endpoint to fetch conversations from Microsoft Graph
app.get(
  "/conversations/graph",
  adminAuth,
  async (req: Request, res: Response) => {
    try {
      const userChats = await conversationService.fetchAllUserChats();
      res.json(userChats);
    } catch (error) {
      console.log("Error fetching conversations from Graph:", error);
      res.status(500).json({
        error: "Failed to fetch conversations from Microsoft Graph",
      });
    }
  }
);

// Endpoint to fetch a single user's conversations from Microsoft Graph
app.get(
  "/conversations/graph/:userId",
  adminAuth,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const userChats = await conversationService.fetchUserChats(userId);
      res.json(userChats);
    } catch (error) {
      console.error(
        `Error fetching conversations for user ${req.params.userId}:`,
        error
      );
      res.status(500).json({
        error: "Failed to fetch user conversations from Microsoft Graph",
      });
    }
  }
);

// Endpoint to get a specific conversation
app.get("/conversations/:id", adminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const conversation = conversationService.getConversation(id);

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    res.json(conversation);
  } catch (error) {
    console.error("Error retrieving conversation:", error);
    res.status(500).json({ error: "Failed to retrieve conversation" });
  }
});

// Endpoint to list available mocks
app.get("/mocks", adminAuth, (req: Request, res: Response) => {
  try {
    const mocksBaseDir = path.join(__dirname, "mocks");
    const mockFiles = [];

    // Get all subdirectories in the mocks directory
    const mockSubdirs = fs
      .readdirSync(mocksBaseDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    // Process each subdirectory
    for (const subdir of mockSubdirs) {
      const sanitizedDataPath = path.join(
        mocksBaseDir,
        subdir,
        "sanitizedData"
      );

      // Skip if sanitizedData doesn't exist in this subdirectory
      if (!fs.existsSync(sanitizedDataPath)) {
        continue;
      }

      // Get all JSON files in the sanitizedData directory
      const files = fs
        .readdirSync(sanitizedDataPath)
        .filter((file) => file.endsWith(".json"));

      // Process each JSON file
      for (const file of files) {
        try {
          const filePath = path.join(sanitizedDataPath, file);
          const content = fs.readFileSync(filePath, "utf8");
          const messages = JSON.parse(content);

          mockFiles.push({
            name: file.replace(".json", ""),
            path: file,
            folder: subdir,
            messageCount: Array.isArray(messages) ? messages.length : 0,
          });
        } catch (error) {
          console.error(`Error processing mock file ${file}:`, error);
          mockFiles.push({
            name: file.replace(".json", ""),
            path: file,
            folder: subdir,
            messageCount: 0,
          });
        }
      }
    }

    res.json(mockFiles);
  } catch (error) {
    console.error("Error retrieving mocks:", error);
    res.status(500).json({ error: "Failed to retrieve mocks" });
  }
});

// Endpoint to get mock data preview
app.get(
  "/mock-preview/:folder/:mockPath",
  adminAuth,
  (req: Request, res: Response) => {
    try {
      const { folder, mockPath } = req.params;

      if (!folder || !mockPath) {
        res.status(400).json({ error: "Missing folder or mock path" });
        return;
      }

      const mockFilePath = path.join(
        __dirname,
        "mocks",
        folder,
        "sanitizedData",
        mockPath
      );

      if (!fs.existsSync(mockFilePath)) {
        res
          .status(404)
          .json({ error: `Mock file not found: ${folder}/${mockPath}` });
        return;
      }

      try {
        const mockDataStr = fs.readFileSync(mockFilePath, "utf8");
        const mockData = JSON.parse(mockDataStr);

        if (!Array.isArray(mockData)) {
          res.status(400).json({ error: "Invalid mock data format" });
          return;
        }

        res.json(mockData);
      } catch (parseError) {
        console.error("Error parsing mock data for preview:", parseError);
        res.status(500).json({ error: "Failed to parse mock data" });
      }
    } catch (error) {
      console.error("Error fetching mock preview:", error);
      res.status(500).json({ error: "Failed to fetch mock preview" });
    }
  }
);

app.post("/seed/chat", async (req: Request, res: Response) => {
  try {
    const input: {
      conversationId: string;
      folder?: string;
      mockFile?: string;
    } = req.body;

    if (!input.conversationId) {
      res.status(400).json({ error: "Missing conversation ID" });
      return;
    }

    const folder = input.folder || "reddit";
    const mockFile = input.mockFile || "nextjs_1jiieu5.json";

    const mockFilePath = path.join(
      __dirname,
      "mocks",
      folder,
      "sanitizedData",
      mockFile
    );

    if (!fs.existsSync(mockFilePath)) {
      res
        .status(404)
        .json({ error: `Mock file not found: ${folder}/${mockFile}` });
      return;
    }

    const sanitizedMessage = fs.readFileSync(mockFilePath, "utf8");
    const sanitizedMessages: MockMessage[] = JSON.parse(sanitizedMessage);
    const seedConfig: SeedConfig = {
      conversationId: input.conversationId,
      conversation: sanitizedMessages,
    };
    await dataFaker.seedGroup(seedConfig);

    res.json({
      success: true,
      message: `Successfully seeded ${seedConfig.conversation.length} messages to the chat`,
    });
  } catch (error) {
    console.error("Error seeding chat:", error);
    res.status(500).json({ error: "Failed to seed chat" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
