# Implementation report

Arena is integrated at `/arena`, behind the existing feature guard. The current production environment and data have not been migrated, seeded, pushed or deployed.

## Local activation follow-up

The local admin flag had been switched on while `ARENA_ENABLED` / `ARENA_ROLLOUT_PERCENT` were missing and the local Arena tables were absent. The effective feature endpoint therefore hid navigation. `scripts/enable_arena_local.py` now provides a loopback-only preparation path: it verifies the Docker MySQL server identity, creates and fully validates a compressed backup, backs up `.env`, applies the additive migration, preserves the admin flag and enables the local environment. It refuses a remote or mismatched database.

Applied locally on 21 October 2026 after backup `before_arena_local_20261021_021019.sql.gz` (28,960,752 bytes). Four Arena tables were confirmed, the API was restarted successfully, and both admin/student visibility conditions returned true. The local rollout is 100%; production defaults and production data remain unchanged. Existing browser tabs need to refresh their cached feature flags.

## Changes

### Winter/audio update, 22 October 2026

- Arena's shell now removes the outer `p-3 sm:p-4 md:p-5`, maximum width and rounded page edge for this route only. The background reaches both edges beneath the existing header/sidebar; controls retain their own readable inset.
- Added a decorative snow canvas with 38 flakes on mobile / 85 on larger screens, capped at 30fps and 1.5 device pixel ratio. It does not receive pointer events, pauses in hidden tabs and becomes static under reduced motion.
- Replaced the single generic beep with an Arena-owned audio engine: original synthesized winter background music, tap, opponent found, countdown, round, correct/wrong and win/loss/draw cues. Background music pauses for listening questions. Sound is enabled by default after a user gesture, mute preference persists, polling does not repeat feedback, and leaving Arena closes its context.
- No runtime packages, backend or database changes for this update. Existing Boneyard loading and modal motion are retained.

- Added project-owned Arena REST API, persistent room/queue/game engine, server scoring/timing, per-user history/transactions and indexed match ranking.
- Added additive migration for four Arena tables, one transactional coordination row and a disabled feature flag. Existing user/profile/XP ledger tables are reused.
- Added server-authoritative wager holds, refunds/payouts, duplicate protection, rollback, learning-level recalculation and scoped cache invalidation.
- Added responsive navy/gold Arena page, wager tiers, custom input, quick search, room creation/join, readiness/start, live rounds, listening audio, countdown/feedback/results/replay, ranking and XP history.
- Added reconnect/presence handling, exponential polling backoff, no-client expiry recovery, Boneyard loading and shared modal motion.
- Added domain safety contract in `docs/agents/arena.md` and routing entry in `AGENTS.md`.
- Added isolated MySQL/API tests, real-auth browser harness and reproducible two-browser Playwright script. Synthetic fixtures exist only in disposable test databases; production Arena reads actual project banks.

No runtime dependency or package lock change. Existing unrelated modules and the global shell are retained.

## Deliberate alternatives

Question generation, score formula, timers between rounds, room expiry, readiness flow, code alphabet, custom wager maximum and settlement mechanics are local designs where original gameplay was not observed. Original audio is replaced by synthesized feedback; no copied sound/brand/avatars are shipped. Invitation/quiet-mode behavior remains outside this implementation.

See `reference-observations.md` for the actual REA evidence and `known-gaps.md` for the remaining boundaries.
