import axios from "axios";
import { GraphAccount } from "./types";

interface GraphClientOptions {
  accessToken: string;
}

export class GraphClient {
  private accessToken: string;
  private baseUrl = "https://graph.microsoft.com/v1.0";

  constructor(options: GraphClientOptions) {
    this.accessToken = options.accessToken;
  }

  private async request<T>(
    method: string,
    path: string,
    data?: any
  ): Promise<T> {
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${path}`,
        data,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      });
      return response.data as T;
    } catch (error) {
      console.error(`Graph API request failed: ${method} ${path}`, error);
      throw error;
    }
  }

  async getChatMembers(chatId: string): Promise<GraphAccount[]> {
    const response = await this.request<{ value: GraphAccount[] }>(
      "GET",
      `/chats/${chatId}/members`
    );
    return response.value;
  }

  async sendMessageToChat(
    chatId: string,
    content: string
  ): Promise<{ id: string }> {
    const message = {
      body: {
        content,
        contentType: "html",
      },
    };

    return this.request<{ id: string }>(
      "POST",
      `/chats/${chatId}/messages`,
      message
    );
  }

  async sendReplyToMessage(
    chatId: string,
    messageId: string,
    content: string
  ): Promise<{ id: string }> {
    const message = {
      body: {
        content,
        contentType: "html",
      },
    };

    return this.request<{ id: string }>(
      "POST",
      `/chats/${chatId}/messages/${messageId}/replies`,
      message
    );
  }
}
