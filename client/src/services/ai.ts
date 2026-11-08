import { API_BASE_URL, authFetch, sessionService } from './backend';

export type VoiceMode = 'assistant' | 'speaking' | 'roleplay' | 'examiner';
export type VoicePersona = 'friendly' | 'strict' | 'humorous' | 'colleague';
export type VoiceCorrection = 'instant' | 'summary';

export interface VoiceSettings {
  mode: VoiceMode;
  persona: VoicePersona;
  correction: VoiceCorrection;
  speed: number;
  voices: { en?: string; vi?: string };
  captions: boolean;
  scenario?: string;
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  mode: 'assistant',
  persona: 'friendly',
  correction: 'summary',
  speed: 1,
  voices: {},
  captions: true,
};

export interface AiServerInfo {
  key: string;
  label: string;
  ok: boolean;
  model: string;
  profile: string;
  rttMs: number;
}

export interface AiStatus {
  enabled: boolean;
  available: boolean;
  active: AiServerInfo | null;
  servers: AiServerInfo[];
  voiceEnabled: boolean;
}

export interface VoiceMistake {
  original: string;
  better: string;
  note: string;
}

export interface VoiceNewWord {
  word: string;
  meaning_vi: string;
}

export interface VoiceSummary {
  durationSeconds: number;
  turns: number;
  mistakes: VoiceMistake[];
  newWords: VoiceNewWord[];
  tip: string;
  conversationId: string | null;
}

export interface ConversationListItem {
  id: string;
  mode: VoiceMode;
  persona: VoicePersona;
  server: string;
  durationSeconds: number;
  turns: number;
  createdAt: string;
}

export interface ConversationDetail extends ConversationListItem {
  summary: { mistakes?: VoiceMistake[]; new_words?: VoiceNewWord[]; tip?: string } | null;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/** Voice goes through the same backend as everything else; only the scheme differs. */
export const getVoiceSocketUrl = () => {
  const base = API_BASE_URL.replace(/^http/, 'ws');
  return `${base}/ai/voice/ws`;
};

export const aiService = {
  getToken: sessionService.getToken,

  async getStatus(): Promise<AiStatus> {
    const res = await authFetch<{ data: AiStatus }>('/ai/status');
    return res.data;
  },

  async listConversations(): Promise<ConversationListItem[]> {
    const res = await authFetch<{ data: ConversationListItem[] }>('/ai/conversations');
    return res.data;
  },

  async getConversation(id: string): Promise<ConversationDetail> {
    const res = await authFetch<{ data: ConversationDetail }>(`/ai/conversations/${encodeURIComponent(id)}`);
    return res.data;
  },

  async deleteConversation(id: string): Promise<void> {
    await authFetch(`/ai/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};

const SETTINGS_KEY = 'toeic_voice_settings';

export const loadVoiceSettings = (): VoiceSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_VOICE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<VoiceSettings>;
    const speed = typeof parsed.speed === 'number' ? Math.min(1.3, Math.max(0.7, parsed.speed)) : 1;
    return { ...DEFAULT_VOICE_SETTINGS, ...parsed, speed, voices: { ...parsed.voices } };
  } catch {
    return DEFAULT_VOICE_SETTINGS;
  }
};

export const saveVoiceSettings = (settings: VoiceSettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // The settings still apply for this visit.
  }
};
