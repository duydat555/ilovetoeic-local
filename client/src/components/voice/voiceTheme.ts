import type { CSSProperties } from 'react';

// One night-sky palette for the whole voice screen. Text pairs below all pass 4.5:1 on the ground.
export const VOICE_THEME: CSSProperties = {
  ['--vo-ground' as string]: '#0c1118',
  ['--vo-surface' as string]: '#151c26',
  ['--vo-surface-2' as string]: '#1e2735',
  ['--vo-line' as string]: '#2c3748',
  ['--vo-text' as string]: '#f1f4f9',
  ['--vo-muted' as string]: '#a6b2c5',
  ['--vo-accent' as string]: '#7db0ff',
  ['--vo-warm' as string]: '#ffb4a2',
};

export const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vo-accent)]';
