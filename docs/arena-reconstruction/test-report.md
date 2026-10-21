# Test report

## Winter/audio verification, 22 October 2026

`client/tests/arena.presentation.mjs` passed against the production bundle using browser-only response fixtures; no real API/DB requests were sent by this test. It verified edge-to-edge Arena bounds, zero outer padding/radius and no horizontal overflow at all five requested sizes; moving snow and static reduced-motion rendering; a running AudioContext with measurable nonzero waveform after the first gesture; immediate mute/scheduler stop and persisted preference; round/answer/result cues without repeated feedback on polling; and context cleanup on route departure. Zero console/page errors. Desktop/mobile screenshots and `winter-validation.json` are included under `screenshots/`.

`npm run build` and scoped ESLint checks on the five Arena TypeScript files passed. The existing local API returned healthy status. No production deployment or data changes were made.

Executed locally on 21 October 2026. No production database was used.

## MySQL and API

`ARENA_TEST_MYSQL=1 python -m unittest discover -s server/tests -p test_arena.py -v`

**13 tests passed**, including 11 integration tests and 2 unit tests. A fresh loopback-only `toeic_arena_test_<uuid>` database receives schema and synthetic fixtures, then is dropped by the harness. Production DB initialization is never imported by those tests.

Coverage: actual two-player pairing, all three complete modes, hidden/private content exclusion, insufficient balance/content, private room fullness/invalid code, authentication/feature/percentage gates, strict payloads, readiness/start/membership, stale/late/duplicate answers, concurrent same-user reservation, concurrent submissions and settlement, draw/cancel/forfeit, ledger equality, history/ranking, rollback, expiry, restart/reconnect and presence.

## Browser and production bundle

`npm run build` succeeded (`tsc` + Vite). Existing bundle-size warnings remain; Arena is a separate lazy chunk. A later preview build points only at the disposable local test API through a process environment value, without editing `.env`.

The actual `server/main.py` app started on 127.0.0.1:8009 with an injected isolated database and real session authentication; root and `/api/v1/status` returned successfully with MySQL connected. The browser harness excludes the production DB constructor and disables Redis. One ancillary announcement endpoint is fixture-isolated because its independent migrations are outside Arena scope; Arena, auth, flags, questions, scoring, XP, history and ranking use real code and MySQL.

`client/tests/arena.browser.mjs` ran against a production Vite preview on 127.0.0.1:5175. Two independent authenticated browser contexts completed 7/10/5 rounds. The script asserted XP against the actual ledger, history IDs, full ranking, Escape dismissal, sound-toggle state, in-game reload, room restoration/cancellation/refund, temporary offline/reconnect and horizontal overflow at all five requested viewports plus 1920×900. The accepted full runs had **zero unexpected console/page errors**; an explicit offline probe deliberately causes an aborted fetch. Screenshots are under `screenshots/`.

Synthetic test data never enters the production Arena implementation. The test audio is a generated tone: playback transport/metadata is tested; TOEIC listening semantic quality is not.

## Commands and reproducibility

```powershell
# Terminal 1, from server/ (creates only a fresh disposable loopback DB)
python tests/arena_browser_server.py

# Terminal 2, from client/
$env:VITE_API_BASE_URL='http://127.0.0.1:8009/api/v1'
npm run build
npm run preview -- --port 5175 --strictPort --host 127.0.0.1

# Terminal 3, repository root; provide an installed Playwright module if needed
# Default module resolution uses an installed playwright package.
# If missing, from client/: npm install --no-save --package-lock=false playwright
node client/tests/arena.browser.mjs
```

The browser harness listens on loopback only, uses a fresh database and test-only accounts. Never run it as a production service. Ctrl+C closes it and drops its own temporary database.

`npm run lint` was attempted and failed because `eslint` is not installed; the repository has no ESLint configuration. A separate cache-only ESLint 9 / TypeScript parser 8 invocation passed on the new Arena TypeScript files, checking unused variables, explicit `any`, unreachable code and constant conditions. It did not modify dependencies or claim to lint the whole application. `git diff --check` and Python compilation passed. New frontend sources were formatted with Prettier.

## Reference comparison

REA established the original lobby at 1920×900; local captures include that viewport and all requested sizes. Manual visual comparison checks the navy/gold language, mode/wager grouping, header actions and right-hand champion layout. Existing project navigation is intentionally retained, and ranking data is independent. No automated pixel-diff pass or original responsive/gameplay equivalence is claimed.

## Environment interruption

Docker/MySQL stopped during the first browser setup after the initial 9-test integration run had passed. Docker Desktop was restarted locally, then the disposable test service was recreated and all tests rerun. Console errors from that interrupted setup are not counted as an accepted browser run. The later full Playwright run passed with zero errors.

One subsequent app restart hit a host `MemoryError` while importing the existing PyTorch dependencies. After the concurrent browser/build processes completed, the isolated actual app started successfully again. This is recorded as an environment interruption, not suppressed as a passing startup.

After verification the temporary API/preview processes were stopped. Four browser-test databases left by interrupted process shutdowns were inspected individually: each contained exactly four `example.invalid` fixture users and only the fixture test bank. Those exact verified databases were removed; existing application databases were untouched. The final normal `npm run build` passed again after restoring the standard build environment.
