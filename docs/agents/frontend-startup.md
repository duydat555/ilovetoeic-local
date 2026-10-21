# Frontend startup and recovery

- `client/index.html` must contain useful initial HTML and a working reload action even if the entry bundle cannot load. Keep the pre-entry error/slow-load message independent of React, external stylesheets and browser storage.
- Mount `AppErrorBoundary` outside all application providers. Load App within its Suspense/error boundary so dependency evaluation errors and failed route imports cannot unmount the entire UI into an empty root.
- Recovery requires the user's reload action; never automatically reload an active exam or clear storage/session/drafts to fix a failed chunk. Do not display raw error details or session data in the recovery UI.
- Reading `window.localStorage` or `window.sessionStorage` can itself throw. Resolve the storage property inside the try block, not as a function argument outside it. Authentication must settle when storage is blocked.
- Validate cached display scale against the four supported presets before applying root CSS, in both the initial HTML and display settings service. Keep the existing 90/100/110/125 mappings.
- Run `client/tests/startup.browser.mjs` against a production build on preview port 5175. It injects failures locally and mocks API traffic; never inject failures into production.
