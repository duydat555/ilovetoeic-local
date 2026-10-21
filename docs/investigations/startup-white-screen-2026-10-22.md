# White-screen investigation — 2026-10-22

## Observations

A read-only check of `https://ilovetoeic.com/` returned HTTP 200 for the HTML and its entry JS/CSS. A fresh Chrome session rendered the public landing page with no uncaught browser errors. This does not establish the cause of an earlier failure on a specific user's browser.

Local reproduction before the fixes:

1. Aborting the landing page module produced `Failed to fetch dynamically imported module`; React removed all children from `#root`. There was Suspense loading UI but no application error boundary. Missing files, network interruptions and old asset URLs after updates can trigger this failure path.
2. Cached `display_settings` with `fontSizeScale: 0.001` made the main heading approximately `0.00064px` and invisible to browser visibility checks. The scale service accepted arbitrary numerical values and the initial HTML applied them before React mounted.
3. Session helpers passed the `localStorage`/`sessionStorage` object into a guarded function. Browsers that throw on the property getter bypassed that guard. Auth initialization accessed the token before its try/finally, so this could leave protected-page loading unresolved. The legacy migration marker had a similar unguarded access.

## Changes

- Added an outer React error boundary around all providers, plus lazy App loading inside it. It shows a recovery message with manual reload/home actions for module or render failures.
- Added initial HTML, a reload button, resource/startup error handling, slow-start messaging and noscript guidance. It works even when React or the entry JS is unavailable.
- Resolved storage properties inside the session helper try blocks, retaining in-memory token behavior. Moved the migration marker read inside the existing try block.
- Both initial HTML and settings service reject unsupported scales and use the default; supported presets retain their original mappings.
- No automatic reload, storage clearing, deployment or production-data writes.

## Verification

`npm run build` passed (exit 0, existing bundle-size advisory). All 16 production-preview browser checks passed in `client/tests/startup.browser.mjs`: normal entry/login with API offline; missing entry/App/route modules; manual reload recovery without a loop; render exceptions; blocked storage getters; five invalid display caches; all four supported presets; JavaScript disabled. Tests route API calls to synthetic responses.

Results and recovery screenshots: `.playwright-mcp/startup-audit/`.

The deployment workflow builds directly into the served `client/dist` path. Vite's normal cleanup/replacement can invalidate asset URLs held by older tabs. The new recovery UI handles the resulting failed imports; this audit did not change server cache headers or deployment publishing, and does not claim that invalidation caused the reported production incident.

## Follow-up: first Chrome visit to /dashboard stays white until refresh

The owner clarified that this happens on Chrome at `/dashboard`. A cold-load reproduction held the Google Fonts stylesheet response open. After 2.5 seconds, HTML content already existed but `document.readyState` was still `loading` and the browser recorded no paint entries. The blocking stylesheet in the document head also delayed module execution and the recovery script. Refresh can mask this dependency by using a cached stylesheet or a recovered connection. This reproduces a matching failure path; it is not a capture of the owner's original session.

Changed the preset font link, custom font links inserted by initial HTML, and later font links to load with `media="print"`, switching to `all` on completion. The browser can paint using the system fallback while fonts are pending. Existing Google Fonts URLs retain `display=swap` for font-file loading.

The production-preview regression now has 18 passing cases. Two added cases restore a synthetic authenticated student on `/dashboard` while all Google Fonts responses remain stalled, using both default and saved custom fonts. They verify first contentful paint, the dashboard shell, absence of uncaught errors and successful content display without reload. Ancillary API failures are simulated; no real user credentials/data are used. Build passed, exit 0.
