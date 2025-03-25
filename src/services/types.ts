export interface GraphAccount {
  userId: string;
  displayName?: string;
  userPrincipalName?: string;
}

export interface MockMessage {
  id: string;
  userId: string;
  sender: string;
  content: string;
  timestamp: number;
  parentId?: string;
}

export interface UserMapping {
  mockUserId: string;
  realUserId: string;
}

export interface SeedConfig {
  conversationId: string;
  conversation: MockMessage[];
  userMappings?: UserMapping[]; // Optional, can be auto-assigned if not provided
  delayBetweenMessages?: number; // In milliseconds
}

export interface ConversationMember {
  userId: string;
  email?: string;
  displayName?: string;
  userPrincipalName?: string;
}

export interface Conversation {
  id: string;
  topic?: string;
  createdDateTime?: string;
  lastUpdatedDateTime?: string;
  members: ConversationMember[];
  chatType?: string;
}
