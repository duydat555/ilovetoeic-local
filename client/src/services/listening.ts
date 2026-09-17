import { API_BASE_URL, sessionService } from './backend';
import type {
  DifficultyOverview,
  ListeningCategory,
  ListeningMode,
  ListeningNote,
  ListeningSentence,
  ListeningSet,
  ListeningTestSummary,
  UserListeningProgress,
} from '../types';

export interface GetSetsParams {
  viewMode?: 'study' | 'difficulty' | 'needs_review' | 'progress';
  categoryId?: string;
  testNumber?: number;
  part?: string;
  search?: string;
  uncompletedOnly?: boolean;
  page?: number;
  pageSize?: number;
}

interface SetDetailResponse {
  success: boolean;
  set: ListeningSet;
  sentences: ListeningSentence[];
  progress: Record<string, UserListeningProgress>;
}

interface MixRandomResponse {
  success: boolean;
  total: number;
  videoCount: number;
  audioCount: number;
  sets: ListeningSet[];
}

const getAuthHeaders = (): HeadersInit => {
  const token = sessionService.getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const listeningService = {
  async getCategories(): Promise<ListeningCategory[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/listening/categories`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Không thể tải danh mục luyện nghe.');
      const data = await response.json();
      return data.categories || [];
    } catch (error) {
      console.warn('[!] Error loading listening categories:', error);
      return [];
    }
  },

  async getSets(params: GetSetsParams = {}): Promise<{
    sets: ListeningSet[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params.viewMode) query.set('view_mode', params.viewMode);
    if (params.categoryId && params.categoryId !== 'all') query.set('category_id', params.categoryId);
    if (params.testNumber !== undefined && params.testNumber !== null) query.set('test_number', String(params.testNumber));
    if (params.part && params.part !== 'all') query.set('part', params.part);
    if (params.search?.trim()) query.set('search', params.search.trim());
    if (params.uncompletedOnly) query.set('uncompleted_only', 'true');
    if (params.page !== undefined && params.page !== null) query.set('page', String(params.page));
    if (params.pageSize !== undefined && params.pageSize !== null) query.set('page_size', String(params.pageSize));

    try {
      const response = await fetch(`${API_BASE_URL}/listening/sets?${query.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Không thể tải danh sách bộ đề luyện nghe.');
      const data = await response.json();
      const pageSize = data.pageSize || params.pageSize || 12;
      const total = data.total || 0;
      return {
        sets: data.sets || [],
        total,
        page: data.page || params.page || 1,
        pageSize,
        totalPages: data.totalPages || Math.max(1, Math.ceil(total / pageSize)),
      };
    } catch (error) {
      console.warn('[!] Error loading listening sets:', error);
      return { sets: [], total: 0, page: 1, pageSize: params.pageSize || 12, totalPages: 1 };
    }
  },

  async getTestsSummary(year = 2026): Promise<{ success: boolean; year: number; tests: ListeningTestSummary[] }> {
    try {
      const response = await fetch(`${API_BASE_URL}/listening/tests-summary?year=${year}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Không thể tải danh sách đề thi.');
      return await response.json();
    } catch (error) {
      console.warn('[!] Error loading listening tests summary:', error);
      return { success: false, year, tests: [] };
    }
  },

  async getMixRandom(count = 6, videoRatio = 0.5, excludeIds: string[] = []): Promise<MixRandomResponse> {
    const query = new URLSearchParams({
      count: String(count),
      video_ratio: String(videoRatio),
    });
    if (excludeIds.length > 0) {
      query.set('exclude_ids', excludeIds.join(','));
    }

    try {
      const response = await fetch(`${API_BASE_URL}/listening/mix-random?${query.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Không thể tạo bộ đề ngẫu nhiên.');
      return await response.json();
    } catch (error) {
      console.warn('[!] Error getting mix random listening sets:', error);
      return {
        success: false,
        total: 0,
        videoCount: 0,
        audioCount: 0,
        sets: [],
      };
    }
  },

  async getSetDetail(setId: string): Promise<SetDetailResponse> {
    const response = await fetch(`${API_BASE_URL}/listening/sets/${setId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.detail || 'Không thể tải chi tiết bộ đề luyện nghe.';
      throw new Error(message);
    }
    return await response.json();
  },

  async saveProgress(payload: {
    setId: string;
    mode: ListeningMode;
    sentenceId: string;
    sentenceIndex: number;
    completed: boolean;
    score: number;
    hintCount: number;
  }) {
    // Optimistically save to localStorage
    const localKey = `toeic_listening_progress_${payload.setId}_${payload.mode}`;
    try {
      const stored = JSON.parse(localStorage.getItem(localKey) || '{}');
      const completedList = new Set(stored.completedSentences || []);
      if (payload.completed) {
        completedList.add(payload.sentenceId);
      } else {
        completedList.delete(payload.sentenceId);
      }
      localStorage.setItem(
        localKey,
        JSON.stringify({
          ...stored,
          lastSentenceIndex: payload.sentenceIndex,
          completedSentences: Array.from(completedList),
          lastUpdated: new Date().toISOString(),
        })
      );
    } catch {
      // Ignore local storage error
    }

    // Sync to backend if authenticated
    try {
      const response = await fetch(`${API_BASE_URL}/listening/progress`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          set_id: payload.setId,
          mode: payload.mode,
          sentence_id: payload.sentenceId,
          sentence_index: payload.sentenceIndex,
          completed: payload.completed,
          score: payload.score,
          hint_count: payload.hintCount,
        }),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('[!] Failed to sync listening progress to backend:', err);
    }
    return null;
  },

  async getNotes(setId: string): Promise<ListeningNote[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/listening/sets/${setId}/notes`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.notes || [];
    } catch {
      return [];
    }
  },

  async saveNote(setId: string, note: { sentenceId?: string; word: string; note: string }): Promise<ListeningNote | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/listening/sets/${setId}/notes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          sentence_id: note.sentenceId,
          word: note.word,
          note: note.note,
        }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.note || null;
    } catch (err) {
      console.warn('[!] Failed to save listening note:', err);
      return null;
    }
  },

  async resetProgress(setId: string, mode?: ListeningMode): Promise<boolean> {
    try {
      const url = mode
        ? `${API_BASE_URL}/listening/sets/${setId}/progress?mode=${mode}`
        : `${API_BASE_URL}/listening/sets/${setId}/progress`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  async getDifficultyOverview(): Promise<DifficultyOverview | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/listening/difficulty-overview`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Không thể tải dữ liệu tổng quan độ khó.');
      return await response.json();
    } catch (err) {
      console.warn('[!] Error fetching difficulty overview:', err);
      return null;
    }
  },

  async getDifficultySets(params: {
    level: number;
    part?: string;
    search?: string;
    uncompletedOnly?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<{
    sets: ListeningSet[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams({
      level: String(params.level),
    });
    if (params.part && params.part !== 'all') query.set('part', params.part);
    if (params.search?.trim()) query.set('search', params.search.trim());
    if (params.uncompletedOnly) query.set('uncompleted_only', 'true');
    if (params.page !== undefined && params.page !== null) query.set('page', String(params.page));
    if (params.pageSize !== undefined && params.pageSize !== null) query.set('page_size', String(params.pageSize));

    try {
      const response = await fetch(`${API_BASE_URL}/listening/difficulty-sets?${query.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Không thể tải danh sách bài theo độ khó.');
      const data = await response.json();
      const pageSize = data.pageSize || params.pageSize || 12;
      const total = data.total || 0;
      return {
        sets: data.sets || [],
        total,
        page: data.page || params.page || 1,
        pageSize,
        totalPages: data.totalPages || Math.max(1, Math.ceil(total / pageSize)),
      };
    } catch (err) {
      console.warn('[!] Error fetching difficulty sets:', err);
      return { sets: [], total: 0, page: 1, pageSize: params.pageSize || 12, totalPages: 1 };
    }
  },

  async getDifficultyRandom(level: number, part?: string, count = 1): Promise<ListeningSet[]> {
    const query = new URLSearchParams({
      level: String(level),
      count: String(count),
    });
    if (part && part !== 'all') query.set('part', part);

    try {
      const response = await fetch(`${API_BASE_URL}/listening/difficulty-random?${query.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Không thể lấy bài ngẫu nhiên theo độ khó.');
      const data = await response.json();
      return data.sets || [];
    } catch (err) {
      console.warn('[!] Error fetching difficulty random:', err);
      return [];
    }
  },
};
