import { API_BASE_URL, authFetch } from './backend';
import type { VocabularyWord } from '../types';

export interface SystemVocabularySet {
  id: string;
  name: string;
  description: string;
  cover_url: string;
  category: 'toeic' | 'ielts' | 'oxford' | 'general' | 'other';
  source: string;
  total_tests: number;
  total_words: number;
  order_index: number;
  visibility: string;
  created_at?: string;
  topics?: SystemVocabularyTopic[];
}

export interface SystemVocabularyTopic {
  id: string;
  set_id: string;
  name: string;
  order_index: number;
  total_words: number;
  created_at?: string;
  set_name?: string;
  set_cover_url?: string;
}

export const systemVocabularyService = {
  async getSets(category?: string, search?: string): Promise<SystemVocabularySet[]> {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.set('category', category);
    if (search && search.trim()) params.set('q', search.trim());
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await authFetch<{ data: SystemVocabularySet[] }>(`/vocabulary/sets${query}`);
    return res.data || [];
  },

  async getSetDetail(setId: string): Promise<SystemVocabularySet> {
    const res = await authFetch<{ data: SystemVocabularySet }>(`/vocabulary/sets/${setId}`);
    return res.data;
  },

  async getTopicDetail(topicId: string): Promise<SystemVocabularyTopic> {
    const res = await authFetch<{ data: SystemVocabularyTopic }>(`/vocabulary/topics/${topicId}`);
    return res.data;
  },

  async getTopicWords(topicId: string): Promise<{ words: VocabularyWord[]; total: number; topicName: string }> {
    const res = await authFetch<{ data: VocabularyWord[]; total: number; topicName: string }>(
      `/vocabulary/topics/${topicId}/words`
    );
    return {
      words: res.data || [],
      total: res.total || 0,
      topicName: res.topicName || 'Chủ đề từ vựng',
    };
  },

  async bookmarkWord(wordId: string): Promise<{ success: boolean; bookmarked: boolean }> {
    const res = await authFetch<{ success: boolean; bookmarked: boolean }>(
      `/vocabulary/words/${wordId}/bookmark`,
      { method: 'POST' }
    );
    return res;
  },
};
