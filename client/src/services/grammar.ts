import { API_BASE_URL } from './backend';

export type GrammarMode = 'topic' | 'bank' | 'difficulty';

export interface GrammarSubtopic {
  id: string;
  topic_id: string;
  title_vi: string;
  description_vi?: string;
  level?: number;
  question_count: number;
}

export interface GrammarTopic {
  id: string;
  title_vi: string;
  description_vi?: string;
  icon?: string;
  question_count: number;
  subtopics: GrammarSubtopic[];
}

export interface GrammarBankTest {
  test_id: string;
  test_name: string;
  question_count: number;
}

export interface GrammarBank {
  set_id: string;
  set_name: string;
  year?: number;
  question_count: number;
  test_count: number;
  tests: GrammarBankTest[];
}

export interface GrammarDifficulty {
  level: number;
  name_vi: string;
  question_count: number;
}

export interface GrammarCatalog {
  question_count: number;
  mode_counts: Record<GrammarMode, number>;
  topics: GrammarTopic[];
  banks: GrammarBank[];
  difficulties: GrammarDifficulty[];
}

export interface GrammarQuestion {
  membership_id: string;
  question_id: string;
  source_mode: GrammarMode;
  question_text: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer: string;
  explanation_en?: string;
  explanation_vi?: string;
  translation_vi?: string;
  answer_translation_vi?: string;
  vocabulary?: string;
  difficulty_level?: number;
  difficulty_name_vi?: string;
  topic_name_vi?: string;
  subtopic_name_vi?: string;
  bank_set_name?: string;
  test_name?: string;
  question_number?: number;
}

export interface GrammarQuestionFilters {
  mode: GrammarMode;
  topicId?: string;
  subtopicId?: string;
  bankSetId?: string;
  testId?: string;
  difficultyLevel?: number;
  offset?: number;
  limit?: number;
}

export interface GrammarQuestionPage {
  data: GrammarQuestion[];
  pagination: { offset: number; limit: number; total: number; has_more: boolean };
}

const parseResponse = async <T>(response: Response): Promise<T> => {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.detail || 'Không thể tải dữ liệu ngữ pháp.');
  return body as T;
};

export const grammarService = {
  async getCatalog(): Promise<GrammarCatalog> {
    const response = await fetch(`${API_BASE_URL}/grammar/catalog`);
    const body = await parseResponse<GrammarCatalog & { success: boolean }>(response);
    return body;
  },

  async getQuestions(filters: GrammarQuestionFilters, signal?: AbortSignal): Promise<GrammarQuestionPage> {
    const params = new URLSearchParams({
      mode: filters.mode,
      offset: String(filters.offset || 0),
      limit: String(filters.limit || 20),
    });
    if (filters.topicId) params.set('topic_id', filters.topicId);
    if (filters.subtopicId) params.set('subtopic_id', filters.subtopicId);
    if (filters.bankSetId) params.set('bank_set_id', filters.bankSetId);
    if (filters.testId) params.set('test_id', filters.testId);
    if (filters.difficultyLevel) params.set('difficulty_level', String(filters.difficultyLevel));
    const response = await fetch(`${API_BASE_URL}/grammar/questions?${params.toString()}`, { signal });
    return parseResponse<GrammarQuestionPage>(response);
  },
};
