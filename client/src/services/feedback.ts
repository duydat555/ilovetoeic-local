import { authFetch } from './backend';

export type FeedbackType = 'feature_request' | 'suggestion';
export type FeedbackStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';

export interface FeedbackItem {
  id: string;
  userId: string;
  type: FeedbackType;
  title: string;
  description: string;
  images: string[];
  status: FeedbackStatus;
  adminResponse?: string | null;
  respondedAt?: string | null;
  respondedBy?: string | null;
  createdAt: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
}

export interface FeedbackCreateInput {
  type: FeedbackType;
  title: string;
  description: string;
  images?: string[];
}

export interface FeedbackAdminUpdateInput {
  status?: FeedbackStatus;
  admin_response?: string;
}

export const feedbackService = {
  async submitFeedback(input: FeedbackCreateInput): Promise<FeedbackItem> {
    const response = await authFetch<{ data: FeedbackItem }>('/feedback', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.data;
  },

  async getMyFeedback(): Promise<FeedbackItem[]> {
    const response = await authFetch<{ data: FeedbackItem[] }>('/feedback/my-feedback');
    return response.data;
  },

  async getAdminFeedbackList(params?: {
    status?: FeedbackStatus;
    type?: FeedbackType;
    search?: string;
  }): Promise<FeedbackItem[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.type) query.set('type', params.type);
    if (params?.search) query.set('search', params.search);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const response = await authFetch<{ data: FeedbackItem[] }>(`/feedback/admin/list${queryString}`);
    return response.data;
  },

  async updateAdminFeedback(
    feedbackId: string,
    input: FeedbackAdminUpdateInput,
  ): Promise<FeedbackItem> {
    const response = await authFetch<{ data: FeedbackItem }>(
      `/feedback/admin/${encodeURIComponent(feedbackId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    );
    return response.data;
  },

  async deleteAdminFeedback(feedbackId: string): Promise<boolean> {
    const response = await authFetch<{ message: string }>(
      `/feedback/admin/${encodeURIComponent(feedbackId)}`,
      { method: 'DELETE' },
    );
    return Boolean(response.message);
  },
};
