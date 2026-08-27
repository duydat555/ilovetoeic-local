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
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const wsScheme = isHttps ? 'wss:' : 'ws:';
  const currentHost = typeof window !== 'undefined' ? window.location.host : '127.0.0.1:8000';

  if (!API_BASE_URL || API_BASE_URL.startsWith('/')) {
    const basePath = (API_BASE_URL || '/api/v1').replace(/\/$/, '');
    return `${wsScheme}//${currentHost}${basePath}/community-chat/ws`;
  }

  try {
    const url = new URL(API_BASE_URL);
    // If frontend is HTTPS but API_BASE_URL host is localhost/127.0.0.1, fallback to location.host
    if (isHttps && (url.hostname === '127.0.0.1' || url.hostname === 'localhost')) {
      return `${wsScheme}//${currentHost}/api/v1/community-chat/ws`;
    }
    url.protocol = wsScheme;
    url.pathname = `${url.pathname.replace(/\/$/, '')}/community-chat/ws`;
    return url.toString();
  } catch {
    return `${wsScheme}//${currentHost}/api/v1/community-chat/ws`;
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
