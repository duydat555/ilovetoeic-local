# Arena architecture

## Integration

React 18, React Router 6, TypeScript, Vite, Tailwind 3, existing Lucide icons and Framer Motion are retained. `/arena` is lazy-loaded under `AppLayout` and `FeatureRouteGuard`; navigation uses the existing centralized configuration. `authFetch` reuses the existing bearer session. No new runtime package is required.

The page composes mode/rank/wager selection, lobby, match, waiting room and results. Avatar, leaderboard and dialog components are reused within Arena. Local state controls forms/dialogs; server responses own room, score, XP, round and result state. Boneyard matches loading content. Dialogs use the shared motion contract, portal, Escape, focus trap/restore and scroll lock. Dark navy, gold, Be Vietnam Pro and the existing icons form the Arena theme. Solid layered panels follow the project motion/design rules.

FastAPI `app/routers/arena.py` uses the existing authentication dependency and `ArenaService`. It neither initializes schema nor seeds questions at import/startup.

## Persistence and transactions

Manual additive migration: `server/migrations/20261021_01_add_arena.sql`.

| Table | Role |
| --- | --- |
| `arena_control` | One row locked for short Arena transactions across API workers |
| `arena_matches` | Room code, queue, lifecycle, deadlines, server-only question snapshot and result |
| `arena_players` | Participant score, readiness, answers, presence, XP delta; unique nullable active-user key |
| `arena_stats` | Indexed ranking aggregate of wins/losses/draws/positive match earnings |
| Existing `users` | Identity, profile, authoritative `xp` and learning `level` |
| Existing `user_xp_ledger` | Immutable unique hold/settlement entries |

Transactions acquire control row, then account locks, write ledger before balance changes, and commit state/XP/stats together. Error rolls back all changes. Deterministic keys `arena:hold:<match>:<user>` and `arena:settle:<match>:<user>` prevent repeat debits/payouts. Session and existing ranking cache invalidations occur after commit; the global RAM query cache is not cleared.

Entry holds the full wager immediately, so other Arena reservations cannot reuse it. Cancel before play and draws refund it. A winner receives the held wager plus `floor(0.70*wager)`; a loser receives zero back. This is a local settlement design inferred from the observed projected payouts. `users.level` is recalculated from existing level definitions; wager tiers are separate from learning levels.

The mutex prioritizes correctness over large-scale throughput. All work inside it is bounded DB work, with no waits or network calls. The existing pool has 25 connections. Observe p95 transaction latency and pool use before expanding rollout; this implementation has not been load-tested at production scale.

## Question and game lifecycle

- Speed: eligible Part 5 questions from non-hidden project tests, four choices, existing answer key.
- Vocabulary: words from public system sets, four distinct meaning choices.
- Listening: existing sentence/audio bank, one word blanked, server text comparison. Existing sentence start/end offsets are retained so clips embedded in a longer audio file play at their intended segment.
- At most 500 eligible source rows per mode are sampled with `SystemRandom`; insufficient content fails clearly without debiting XP. This bounded initial bank is not claimed to cover every project question.
- Both participants ready, host starts with a three-second countdown. Server timestamps govern all deadlines and speed points. Correct answers receive 100 plus up to 50 points based on remaining time.
- Both answers or deadline reveal the correct answer, then 1.5s feedback before advancement. Client payload accepts only round and answer; no score/XP/correctness inputs.
- Only current prompt/options/audio are exposed. Future question snapshots and answer keys stay server-side. Opponent scores are hidden until round reveal. A composite player key and serialized first-answer check reject score duplication.
- Search expires after 60s; private room after 300s; a filled room must start within 120s. Explicit in-game leave forfeits. Temporary disconnection can rejoin while game timers continue. If both disappear, remaining rounds time out and server settles actual scores.

## Synchronization

Existing community-chat WebSocket is an in-process unauthenticated broadcast and is unsuitable for persisted financial-like match state. Arena uses authenticated, non-overlapping polling: 1s in play, 2.5s waiting, paused for hidden tabs, exponential retry up to 15s after failures. Reopening the route restores the persisted active match. Presence is refreshed at most once per 15s and becomes offline after 35s. A disabled-by-default background task expires abandoned sessions every 15s when Arena is enabled; lazy recovery also runs on entry/state requests. Multiple workers use the same DB lock and persistent queue.

This is near-realtime polling, not a new WebSocket service. A future shared pub/sub transport can deliver updates without changing server authority.

## API surface

All paths are project-owned `/api/v1/arena` routes, not discovered ByeTOEIC APIs.

`GET /lobby`, `/leaderboard`, `/history`, `/transactions`, `/matches/{id}`; `POST /rooms`, `/queue`, `/join`, `/matches/{id}/ready`, `/start`, `/leave`, `/answer`.

Authentication, strict input schemas, membership checks, server-owned question/XP values and atomic transactions apply. History/transactions are scoped to the current user. Ranking exposes only existing public display name/avatar and match stats.

## Rollout and rollback

Three gates: `ARENA_ENABLED=false`, `ARENA_ROLLOUT_PERCENT=0` and global feature flag `arena=0`. The percentage gate hashes the user ID into a stable cohort. Admin bypasses percentage only. Before opening: owner review, verified backup, migration prerequisites (`user_xp_ledger`, `level_definitions`), manual migration and limited cohort enablement.

No deployment workflow, production environment or production data was changed. To roll back access, close new entry through gates; settle active holds before permanently disabling the expiry worker. Preserve the additive tables and ledger for audit/recovery. Do not drop Arena data as a routine rollback.
