import { useEffect } from 'react';

const owners = new Set<symbol>();
let previousOverflow = '';

/** Nested drawers release only their own lock, including on route unmount. */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const owner = Symbol('scroll-lock');
    if (!owners.size) previousOverflow = document.body.style.overflow;
    owners.add(owner);
    document.body.style.overflow = 'hidden';
    return () => {
      owners.delete(owner);
      if (!owners.size) document.body.style.overflow = previousOverflow;
    };
  }, [active]);
}
