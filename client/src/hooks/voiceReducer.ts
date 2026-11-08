// Pure state machine for a voice conversation. No browser APIs, so it can be tested in plain Node.
import type { VoiceMistake, VoiceNewWord } from '../services/ai';

export type AgentState =
  | 'connecting' | 'listening' | 'user-speaking' | 'thinking' | 'ai-speaking' | 'muted' | 'idle';

export type Phase = 'idle' | 'connecting' | 'live' | 'ending' | 'summary' | 'error';

export interface TranscriptEntry {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  lang?: string;
  interrupted?: boolean;
  source?: 'voice' | 'text';
}

export interface VoiceSummaryData {
  durationSeconds: number;
  turns: number;
  mistakes: VoiceMistake[];
  newWords: VoiceNewWord[];
  tip: string;
  conversationId: string | null;
}

export interface VoiceState {
  phase: Phase;
  agent: AgentState;
  entries: TranscriptEntry[];
  serverLabel: string;
  notice: string;
  error: string;
  errorCode: string;
  summary: VoiceSummaryData | null;
  muted: boolean;
  nextId: number;
}

export const initialVoiceState: VoiceState = {
  phase: 'idle', agent: 'idle', entries: [], serverLabel: '', notice: '', error: '', errorCode: '',
  summary: null, muted: false, nextId: 1,
};

// One event from the server, loosely typed on purpose: unknown fields are ignored.
export interface ServerEvent {
  type: string;
  value?: string;
  final?: boolean;
  text?: string;
  lang?: string;
  source?: 'voice' | 'text';
  label?: string;
  code?: string;
  message?: string;
  duration_seconds?: number;
  turns?: number;
  mistakes?: VoiceMistake[];
  new_words?: VoiceNewWord[];
  tip?: string;
  conversationId?: string | null;
}

export type VoiceAction =
  | { type: 'connect' }
  | { type: 'event'; event: ServerEvent }
  | { type: 'mute'; value: boolean }
  | { type: 'ending' }
  | { type: 'socket_closed' }
  | { type: 'local_error'; message: string; code?: string }
  | { type: 'reset' };

const FATAL_CODES = new Set(['auth', 'feature_off', 'ai_unavailable', 'already_active', 'session_limit', 'mic']);

const FRIENDLY_ERRORS: Record<string, string> = {
  ai_unavailable: 'Trợ lý AI hiện chưa sẵn sàng. Bạn thử lại sau ít phút nhé.',
  feature_off: 'Tính năng này chưa được mở.',
  already_active: 'Bạn đang có một cuộc trò chuyện khác đang mở.',
  session_limit: 'Cuộc trò chuyện đã đạt thời gian tối đa.',
  auth: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
};

const lastAssistantOpen = (entries: TranscriptEntry[]) => {
  const last = entries[entries.length - 1];
  return last && last.role === 'assistant' && !last.interrupted ? last : null;
};

const appendEntry = (state: VoiceState, entry: Omit<TranscriptEntry, 'id'>): VoiceState => ({
  ...state,
  entries: [...state.entries, { ...entry, id: state.nextId }],
  nextId: state.nextId + 1,
});

const reduceEvent = (state: VoiceState, event: ServerEvent): VoiceState => {
  switch (event.type) {
    case 'server':
      return { ...state, serverLabel: event.label ?? state.serverLabel, notice: '',
        phase: state.phase === 'connecting' ? 'live' : state.phase };
    case 'state': {
      const agent = (event.value ?? 'idle') as AgentState;
      const phase = state.phase === 'connecting' && agent !== 'idle' ? 'live' : state.phase;
      // The server's muted state is only informational; the local mute switch is the source of truth.
      return { ...state, agent: state.muted && agent === 'listening' ? 'muted' : agent, phase };
    }
    case 'transcript':
      if (!event.final || !event.text) return state;
      return appendEntry(state, { role: 'user', text: event.text, lang: event.lang, source: event.source });
    case 'assistant_delta': {
      const open = lastAssistantOpen(state.entries);
      if (open) {
        return { ...state, entries: state.entries.map((e) =>
          e.id === open.id ? { ...e, text: `${e.text} ${event.text ?? ''}`.trim() } : e) };
      }
      return appendEntry(state, { role: 'assistant', text: event.text ?? '', lang: event.lang });
    }
    case 'interrupted': {
      const open = lastAssistantOpen(state.entries);
      if (!open) return state;
      return { ...state, entries: state.entries.map((e) => (e.id === open.id ? { ...e, interrupted: true } : e)) };
    }
    case 'failover':
      return { ...state, notice: 'Đang chuyển sang chế độ dự phòng, bạn đợi một chút nhé…' };
    case 'error': {
      const code = event.code ?? 'unknown';
      if (FATAL_CODES.has(code)) {
        return { ...state, phase: 'error', agent: 'idle', errorCode: code,
          error: FRIENDLY_ERRORS[code] ?? event.message ?? 'Có lỗi xảy ra.' };
      }
      return { ...state, notice: 'Mình chưa nghe rõ, bạn nói lại giúp mình nhé.' };
    }
    case 'summary':
      return { ...state, phase: 'summary', agent: 'idle', notice: '', summary: {
        durationSeconds: event.duration_seconds ?? 0,
        turns: event.turns ?? 0,
        mistakes: event.mistakes ?? [],
        newWords: event.new_words ?? [],
        tip: event.tip ?? '',
        conversationId: event.conversationId ?? null,
      } };
    default:
      return state;
  }
};

export const voiceReducer = (state: VoiceState, action: VoiceAction): VoiceState => {
  switch (action.type) {
    case 'connect':
      return { ...initialVoiceState, phase: 'connecting', agent: 'connecting' };
    case 'event':
      return reduceEvent(state, action.event);
    case 'mute':
      return { ...state, muted: action.value,
        agent: action.value ? (state.agent === 'listening' || state.agent === 'user-speaking' ? 'muted' : state.agent)
          : (state.agent === 'muted' ? 'listening' : state.agent) };
    case 'ending':
      return state.phase === 'live' ? { ...state, phase: 'ending', agent: 'thinking' } : state;
    case 'socket_closed':
      if (state.phase === 'summary' || state.phase === 'idle' || state.phase === 'error') return state;
      return { ...state, phase: 'error', agent: 'idle', errorCode: 'closed',
        error: 'Kết nối bị gián đoạn. Bạn có thể bắt đầu lại.' };
    case 'local_error':
      return { ...state, phase: 'error', agent: 'idle', errorCode: action.code ?? 'local', error: action.message };
    case 'reset':
      return initialVoiceState;
    default:
      return state;
  }
};

export const hasConversation = (state: VoiceState) => state.entries.some((e) => e.role === 'user');
