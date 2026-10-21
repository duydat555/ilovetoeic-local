# Responsive annotation toolbar

The vertical annotation rail consumed reading width on phones. Fixed full-screen exams also positioned the rail alongside the page using desktop offsets.

Below 1024px the toolbar now occupies its own horizontal row above the exam. All tools remain accessible by horizontal scrolling, with at least 44px touch targets and rem sizing for larger display settings. Fixed exams reserve the corresponding top space, including the safe area, and no longer enforce a full viewport minimum height below that space. Desktop retains the separate vertical rail. The no-workspace fallback and Boneyard loading skeleton follow the same responsive layout.

Keyboard arrow navigation follows the toolbar orientation. The color palette measures its rendered size and stays within the viewport when opened from the horizontal row. Annotation persistence, IDs and API formats are unchanged.

Validation:

- `npm run build`: passed, exit 0; existing bundle-size advisory only.
- `node --test client/tests/exam-annotations.test.mjs client/tests/exam-annotation-sync.test.mjs`: 15 passed.
- `client/tests/annotation-toolbar.browser.mjs`: passed in Chrome with touch support, using the existing synthetic notes fixture. No real API writes. Tests cover 320/390/768/844/1024/1366px widths at root scale 0.8/1/1.3, landscape, 44px buttons, passage width and overlap, tool selection, keyboard navigation, palette positioning/color selection/Escape, and fixed full-screen layout at five sizes. No uncaught browser errors.
- Visual inspection: mobile portrait and landscape at scale 125%, synthetic text. Screenshots and machine-readable results: `.playwright-mcp/annotation-toolbar/`.

Physical iOS/Android devices were not tested. No deployment performed.

## Optional toolbar visibility

Added an accessible hide button as the first toolbar control. Hiding removes the toolbar portal and its reserved layout space; a compact “Công cụ” button in the passage summary restores it. The choice persists in localStorage across reloads and question groups. Hiding cancels drawing and switches to select, preserving annotation content and synchronization. Keyboard focus follows the hide/restore action after the dock becomes visible.

The browser regression also passes mobile and desktop hide/show, restored full-screen space, drawing reset, focus transfer, reload and group-change persistence.
