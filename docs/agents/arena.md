# Arena: production contract

- Arena is additive and off by default. Never apply its migration or enable the flag on production without owner review and a verified backup.
- Keep `ARENA_ENABLED=false`, `ARENA_ROLLOUT_PERCENT=0` and the `arena` feature flag off until review. Percentage rollout uses a stable hash of user ID; admin still needs the server switch and global flag.
- `arena_control` serializes short transactions across API workers. Do not hold its lock while waiting for clients or doing network work.
- Every XP hold/refund/payout must use `user_xp_ledger` and a unique `arena:hold/settle:<match>:<user>` key in the same transaction as balance and match state updates. Client XP and correctness are never accepted.
- `users.xp` is the existing authoritative field. Preset ranks are wager tiers, separate from the existing learning level system. Update the existing `users.level` from `level_definitions` after balance changes.
- Only the two participants can read or mutate a match. Never send answer keys, future questions or unrevealed opponent scores to clients.
- Questions come from the existing project question, system vocabulary and listening banks. Never seed or copy third-party question content into production.
- Arena ranking is a separate indexed aggregate of match earnings and wins. Do not change the existing learning leaderboard rules.
- Tests may create/drop only fresh loopback `toeic_arena_test_<uuid>` databases. Fixtures and test-only endpoints must never be registered by production `main.py`.
- Current synchronization uses authenticated, non-overlapping polling (1s in play, 2.5s in waiting room, paused for hidden tabs). Measure lock latency/pool use before increasing rollout. No process-local matchmaking state.
- Expiry runs every 15 seconds when `ARENA_ENABLED` is true, with request-time recovery as a fallback. Drain active holds before permanently stopping recovery.
