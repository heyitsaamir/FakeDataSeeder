import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { TokenManager } from "./tokenManager";
import { Conversation, ConversationMember } from "./types";

export class ConversationService {
  private conversationsFilePath: string;
  private conversations: Map<string, Conversation>;
  private tokenManager: TokenManager;

  constructor(
    tokenManager: TokenManager,
    filePath: string = path.join(__dirname, "../data/conversations.json")
  ) {
    this.conversationsFilePath = filePath;
    this.conversations = new Map<string, Conversation>();
    this.tokenManager = tokenManager;
    this.loadConversations();
  }

  private loadConversations() {
    try {
      if (fs.existsSync(this.conversationsFilePath)) {
        const rawData = fs.readFileSync(this.conversationsFilePath, "utf-8");
        const jsonData = JSON.parse(rawData);
        this.conversations = new Map(Object.entries(jsonData));
      } else {
        // Ensure directory exists
        const dir = path.dirname(this.conversationsFilePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        this.saveConversations();
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
      this.conversations = new Map<string, Conversation>();
    }
  }

  private saveConversations() {
    try {
      const jsonData = Object.fromEntries(this.conversations);
      const dir = path.dirname(this.conversationsFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.conversationsFilePath,
        JSON.stringify(jsonData, null, 2)
      );
    } catch (error) {
      console.error("Error saving conversations:", error);
    }
  }

  public getAllConversations(): Conversation[] {
    return Array.from(this.conversations.values());
  }

  public getConversation(conversationId: string): Conversation | undefined {
    return this.conversations.get(conversationId);
  }

  public saveConversation(conversation: Conversation) {
    this.conversations.set(conversation.id, conversation);
    this.saveConversations();
  }

  public addMemberToConversation(
    conversationId: string,
    member: ConversationMember
  ) {
    const conversation = this.getConversation(conversationId);

    if (!conversation) {
      // Create new conversation if it doesn't exist
      const newConversation: Conversation = {
        id: conversationId,
        createdDateTime: new Date().toISOString(),
        lastUpdatedDateTime: new Date().toISOString(),
        members: [member],
      };
      this.saveConversation(newConversation);
      return;
    }

    // Check if member already exists by userId
    const existingMember = conversation.members.find(
      (m) => m.userId === member.userId
    );

    if (existingMember) {
      // Update existing member
      Object.assign(existingMember, member);
    } else {
      // Add new member
      conversation.members.push(member);
    }

    // Update lastUpdatedDateTime
    conversation.lastUpdatedDateTime = new Date().toISOString();

    this.saveConversation(conversation);
  }

  public deleteConversation(conversationId: string): boolean {
    const deleted = this.conversations.delete(conversationId);
    if (deleted) {
      this.saveConversations();
    }
    return deleted;
  }

  /**
   * Fetch conversations from Microsoft Graph API for a specific user
   */
  public async fetchUserChats(userId: string): Promise<Conversation[]> {
    const userToken = this.tokenManager.getUserToken(userId);

    if (!userToken || !userToken.accessToken) {
      throw new Error("User not authenticated or token not found");
    }

    try {
      // Fetch chats from Microsoft Graph API
      const chatsResponse = await axios.get(
        "https://graph.microsoft.com/v1.0/me/chats?$expand=members",
        {
          headers: {
            Authorization: `Bearer ${userToken.accessToken}`,
          },
        }
      );

      if (!chatsResponse.data || !chatsResponse.data.value) {
        return [];
      }

      const chats: Conversation[] = chatsResponse.data.value.map(
        (chat: any) => {
          // Extract members from the chat
          const members: ConversationMember[] = chat.members.map(
            (member: any) => {
              const displayName = member.displayName || "Unknown";
              const userId = member.userId || "";

              return {
                userId,
                displayName,
                email: "",
                userPrincipalName: "",
              };
            }
          );

          // Create a Conversation object
          const conversation: Conversation = {
            id: chat.id,
            topic: chat.topic || chat.chatType || "Chat",
            createdDateTime: chat.createdDateTime,
            lastUpdatedDateTime: chat.lastModifiedDateTime,
            members,
            chatType: chat.chatType,
          };

          // Store the conversation for future reference
          this.saveConversation(conversation);

          return conversation;
        }
      );

      return chats;
    } catch (error) {
      console.error("Error fetching chats from Graph API:", error);
      throw new Error("Failed to fetch chats from Microsoft Graph");
    }
  }

  /**
   * Fetch all user chats from Microsoft Graph for all authenticated users
   */
  public async fetchAllUserChats(): Promise<Record<string, Conversation[]>> {
    const tokens = this.tokenManager.getAllTokens();
    const results: Record<string, Conversation[]> = {};

    for (const userId in tokens) {
      try {
        const chats = await this.fetchUserChats(userId);
        results[userId] = chats;
      } catch (error) {
        console.error(`Error fetching chats for user ${userId}:`, error);
        results[userId] = [];
      }
    }

    return results;
  }
}
