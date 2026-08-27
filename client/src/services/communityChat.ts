import { API_BASE_URL, authFetch } from './backend';

export interface MessageReaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  userName: string;
  userEmail: string;
  userRole: 'admin' | 'student' | string;
  userAvatar: string;
  replyTo?: {
    id: string;
    userName: string;
    content: string;
  } | null;
  reactions?: MessageReaction[];
}

export const getCommunityChatWebSocketUrl = (): string => {
  try {
    const wsScheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = new URL(API_BASE_URL);
    url.protocol = wsScheme;
    url.pathname = `${url.pathname.replace(/\/$/, '')}/community-chat/ws`;
    return url.toString();
  } catch {
    const wsHost = window.location.hostname || '127.0.0.1';
    const wsScheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsScheme}//${wsHost}:8000/api/v1/community-chat/ws`;
  }
};

export const communityChatService = {
  async getMessages(limit = 50): Promise<ChatMessage[]> {
    const response = await authFetch<{ data: ChatMessage[] }>(
      `/community-chat/messages?limit=${limit}`,
    );
    return response.data;
  },

  async sendMessage(content: string, replyToId?: string): Promise<ChatMessage> {
    const response = await authFetch<{ data: ChatMessage }>('/community-chat/messages', {
      method: 'POST',
      body: JSON.stringify({ content, reply_to_id: replyToId }),
    });
    return response.data;
  },

  async toggleReaction(messageId: string, emoji: string): Promise<MessageReaction[]> {
    const response = await authFetch<{ data: MessageReaction[] }>(
      `/community-chat/messages/${encodeURIComponent(messageId)}/react`,
      {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      },
    );
    return response.data;
  },

  async deleteMessage(messageId: string): Promise<boolean> {
    const response = await authFetch<{ message: string }>(
      `/community-chat/messages/${encodeURIComponent(messageId)}`,
      { method: 'DELETE' },
    );
    return Boolean(response.message);
  },
};
