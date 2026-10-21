import { authFetch } from "./backend";

export type ArenaMode = "speed" | "vocabulary" | "listening";
export interface ArenaPlayer {
  id: string;
  name: string;
  avatar: string | null;
  ready: boolean;
  online: boolean;
  score: number | null;
  answered: boolean;
  xpDelta: number;
}
export interface ArenaMatch {
  id: string;
  code: string;
  hostId: string;
  mode: ArenaMode;
  wager: number;
  status: "waiting" | "searching" | "playing" | "finished" | "cancelled";
  round: number;
  rounds: number;
  expiresAt: number;
  endsAt: number | null;
  serverTime: number;
  winnerId: string | null;
  players: ArenaPlayer[];
  question: {
    prompt: string;
    options: string[];
    audio?: string;
    audioStart?: number;
    audioEnd?: number | null;
  } | null;
  feedback: { correct: boolean; answer: string } | null;
  submitted: boolean;
}
export interface ArenaLeader {
  user_id: string;
  name: string;
  avatar: string | null;
  wins: number;
  losses: number;
  draws: number;
  earned_xp: number;
}
export interface ArenaHistoryItem {
  id: string;
  mode: ArenaMode;
  wager: number;
  status: string;
  winner_id: string | null;
  finished_at: number;
  score: number;
  xp_delta: number;
  opponent: string | null;
}
export interface ArenaTransaction {
  id: number;
  xp_amount: number;
  dedupe_key: string;
  created_at: string;
}
export interface ArenaLobby {
  balance: number;
  modes: { id: ArenaMode; name: string; rounds: number; seconds: number }[];
  ranks: { name: string; wager: number }[];
  stats: { wins: number; losses: number; draws: number; earned_xp: number };
  active: ArenaMatch | null;
}
const post = <T>(path: string, data?: unknown) =>
  authFetch<T>(`/arena${path}`, {
    method: "POST",
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
export const arenaApi = {
  lobby: () => authFetch<ArenaLobby>("/arena/lobby"),
  leaders: () => authFetch<ArenaLeader[]>("/arena/leaderboard"),
  history: () => authFetch<ArenaHistoryItem[]>("/arena/history"),
  transactions: () => authFetch<ArenaTransaction[]>("/arena/transactions"),
  create: (mode: ArenaMode, wager: number, quick = false) =>
    post<ArenaMatch>(quick ? "/queue" : "/rooms", { mode, wager }),
  join: (code: string) => post<ArenaMatch>("/join", { code }),
  state: (id: string) => authFetch<ArenaMatch>(`/arena/matches/${id}`),
  action: (id: string, action: "ready" | "start" | "leave") =>
    post<ArenaMatch>(`/matches/${id}/${action}`),
  answer: (id: string, round: number, answer: string) =>
    post<ArenaMatch>(`/matches/${id}/answer`, { round, answer }),
};
