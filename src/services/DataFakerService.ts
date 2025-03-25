import { GraphClient } from "./GraphClient";
import { TokenManager } from "./tokenManager";
import { GraphAccount, SeedConfig } from "./types";

export class DataFaker {
  private tokenManager: TokenManager;

  constructor(tokenManager: TokenManager) {
    this.tokenManager = tokenManager;
  }

  /**
   * Get existing members in a chat from Microsoft Graph
   */
  private async getExistingMembersInChat(
    chatId: string
  ): Promise<GraphAccount[]> {
    try {
      // Find at least one token we can use to query graph
      const allTokens = Object.values(this.tokenManager.getAllTokens());
      if (allTokens.length === 0) {
        throw new Error("No tokens available to call Microsoft Graph API");
      }

      // Use the first available token to create a GraphClient and get chat members
      const token = allTokens[0];
      const graphClient = new GraphClient({ accessToken: token.accessToken });

      return await graphClient.getChatMembers(chatId);
    } catch (error) {
      console.error(`Failed to get members for chat ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Assign real users to mock users if not already provided
   */
  private assignUsers(
    realUsers: GraphAccount[],
    config: SeedConfig
  ): Map<string, string> {
    if (config.userMappings && config.userMappings.length > 0) {
      return new Map(
        config.userMappings.map((mapping) => [
          mapping.mockUserId,
          mapping.realUserId,
        ])
      );
    }

    const tokensSaved = Object.values(this.tokenManager.getAllTokens());
    const usersSaved = new Set(tokensSaved.map((token) => token.userId));
    const validUsers = realUsers.filter((user) => usersSaved.has(user.userId));
    const allMockUsers = new Set<string>(
      config.conversation.map((message) => message.userId)
    );

    const mapping: Map<string, string> = new Map();
    const realUserIds: string[] = validUsers.map((user) => user.userId);
    const mockUserIds: string[] = Array.from(allMockUsers);

    if (realUserIds.length === 0) {
      throw new Error(
        "No authenticated users found in the chat. Please authenticate at least one user who is a member of this chat."
      );
    }

    for (let i = 0; i < mockUserIds.length; i++) {
      const mockUserId = mockUserIds[i];
      const realUserId = realUserIds[i % realUserIds.length];
      mapping.set(mockUserId, realUserId);
    }

    return mapping;
  }

  /**
   * Send a message to a Teams chat using a user's token
   */
  private async sendMessage(
    content: string,
    chatId: string,
    userId: string,
    parentMessageId?: string
  ): Promise<string> {
    const token = this.tokenManager.getUserToken(userId);
    if (!token) {
      throw new Error(`Token not found for user ${userId}`);
    }

    console.log(`Sending message as ${token.userPrincipalName}`);

    const graphClient = new GraphClient({ accessToken: token.accessToken });

    let result = await graphClient.sendMessageToChat(chatId, content);

    console.log(`Message sent with ID: ${result.id}`);
    return result.id;
  }

  /**
   * Seed a Teams group with mock conversation
   */
  async seedGroup(config: SeedConfig): Promise<void> {
    try {
      const graphConversationId = config.conversationId;

      // Get existing members in the chat
      const existingMembersInChat =
        await this.getExistingMembersInChat(graphConversationId);

      // Map mock users to real users
      const userMappings = this.assignUsers(existingMembersInChat, config);

      // Set delay between messages
      const delayMs = config.delayBetweenMessages || 1000; // Default 1 second delay

      // Track message IDs for threading
      const mockMessageIdToTeamsMessageId: Map<string, string> = new Map();

      // Send the messages
      for (const message of config.conversation) {
        // Find the real user mapping for this mock message
        const realUserId = userMappings.get(message.userId);
        if (!realUserId) {
          console.warn(
            `No real user mapping found for mock user ID: ${message.userId}`
          );
          continue;
        }

        // Check if this is a reply to another message
        let parentTeamsMessageId: string | undefined;
        if (
          message.parentId &&
          mockMessageIdToTeamsMessageId.has(message.parentId)
        ) {
          parentTeamsMessageId = mockMessageIdToTeamsMessageId.get(
            message.parentId
          );
        }

        // Send the message
        const teamsMessageId = await this.sendMessage(
          message.content,
          graphConversationId,
          realUserId,
          parentTeamsMessageId
        );

        // Store the mapping for potential replies
        mockMessageIdToTeamsMessageId.set(message.id, teamsMessageId);

        // Wait for the specified delay
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      console.log(
        `Successfully seeded ${config.conversation.length} messages to group ${config.conversationId}`
      );
    } catch (error) {
      console.error("Error seeding group:", error);
      throw error;
    }
  }
}
