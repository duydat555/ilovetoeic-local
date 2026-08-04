# Project collaboration rules

## UI motion consistency

- Every centered modal dialog must use the shared motion contract in `client/src/components/common/modalMotion.ts`.
- Do not create modal-specific opening or closing durations, easing curves, offsets, or scale values.
- Modal dismissal by close button, Cancel, Escape, or backdrop click must run the same exit animation before unmounting.
- Modal motion must respect `prefers-reduced-motion`.
- Drawers and anchored popovers may use directional motion appropriate to their interaction, but their opening and closing behavior must remain symmetrical.
- When changing a modal interaction, audit other modal dialogs that use the same pattern and keep them synchronized.
