# Reference observations

Observed 21 October 2026 (Asia/Ho_Chi_Minh), existing authenticated Chrome tab at `https://byetoeic.com/arena`, discovered rather than hardcoded.

## REA evidence

| Operation | Evidence | Scope |
| --- | --- | --- |
| `list_browser_targets` | `ev_7e6249b3b4922f4e185a630ce0f3efcc7909c624198903f9e139212090879611` | Exact URL/origin/title and target identity |
| `inspect_web_page` | `ev_2ec76e98995046462b89b95471d39f84d4a465239cb6c0e8b87c58490d85ab9b` | DOM inventory, accessibility text, resources, one-second passive window |
| `capture_web_screenshot` | PNG SHA256 `2c8a953288f12cf4568ed55b6c30dec741b5cc08c7c4b214641ec7e672f014ff` | Visible 1920×900 viewport |
| `analyze_web_bundle` | `ev_7cc8d3151c1ecc15228fce5f54aafd649286b55ee65af5a9e645ec9cbd17ce1a` | Captured same-origin scripts, static route/vendor candidates |

The screenshot was visually inspected. It contains third-party player identities, so it is not committed or reused as an application asset. No third-party profiles, logos, avatars, question content, cookies or credentials were copied into the project. Raw bundles are not vendored.

## Observed lobby

- A narrow collapsed global sidebar and a light header surround a dark navy Arena. The existing TOEICMaster shell is retained instead of copying that global navigation.
- Arena header: crossed-sword identity, title, short subtitle, XP balance, history/ranking navigation, invitation quiet-mode toggle and sound toggle.
- Main content and right leaderboard use roughly a 2:1 split. At the observed viewport the content begins around x=121, y=100; the leaderboard begins around x=1288, y=196. These are approximate visual measurements, not computed CSS evidence.
- Mode buttons: **Part 5 Speed Duel**, **7 rounds, 15 seconds**; **Vocabulary Blitz**, **10 rounds, 10 seconds**; **Listening Fill-in**, **5 rounds, 20 seconds**. The selected button has a gold border, check mark and highlighted icon tile; accessibility exposes `aria-pressed`.
- Wager tiers: **Đồng 20**, **Bạc 100**, **Vàng 300 XP**. Displayed win amounts are **14/70/210**, displayed losses are the full wager. Locked tiers expose `disabled` and a missing-XP explanation.
- Custom numeric wager with decrease/increase buttons and projected win/loss. The reference displayed an inconsistent `10–7 XP` bound for the available balance; this is not treated as an intended business rule.
- Actions: quick matchmaking, create room, room-code entry (exact code format and validity rules not observed), join, history/ranking and full leaderboard.
- Leaderboard has a champion card, avatar, earnings, win/loss counts and scrollable player rows. Those identities and values are not implementation fixtures.
- Navy layered panels, gold/orange accents, rounded controls, fine background grid, diagonal highlights and scattered light particles are visible. Exact fonts, CSS tokens, hover values, animation timing and sounds were not measured.

## Transitions and limits

Normal browser/CDP inspection was used in addition to REA for UI controls. Selecting the history action navigated to `/arena/history`, confirmed by a subsequent REA target listing. Chrome's CDP endpoint then became unreachable. Further listing/inspection calls returned `provider_unavailable / endpoint_unreachable`, including after the user reported reopening Chrome.

An independent Playwright browser was redirected to login, so it did not establish authenticated gameplay evidence. No third-party create/join/matchmaking write was performed. No authentication material was extracted.

The bundle scan returned static route candidates and React/Vite fingerprints (inferences), but **no extracted endpoint candidates**. This does not establish absence of APIs. No original response schema, scoring algorithm, settlement, anti-cheat implementation, matchmaking algorithm or gameplay lifecycle is claimed.

Reference captures at 1920×1080, 1440×900, 1366×768, 768×1024 and 390×844, dialogs and live games remain blocked by the disconnected reference browser. Local screenshots at these sizes establish local responsiveness only.

REA scope/usage follows the [official browser observation documentation](https://github.com/morluto/rea/blob/main/docs/browser-observation.md). Passive captures are limited to their attach window; static script findings do not establish execution.
