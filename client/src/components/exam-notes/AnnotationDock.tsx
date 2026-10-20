import React, { createContext, useContext, useLayoutEffect, useState } from 'react';

const AnnotationDockContext = createContext<HTMLDivElement | null>(null);
export const useAnnotationDock = () => useContext(AnnotationDockContext);

/** The page is child one; its persistent toolbar host is child two. */
export function AnnotationDockWorkspace({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const [dock, setDock] = useState<HTMLDivElement | null>(null);
  const [occupied, setOccupied] = useState(false);
  useLayoutEffect(() => {
    if (!dock) return;
    const update = () => setOccupied(dock.childElementCount > 0);
    const observer = new MutationObserver(update);
    observer.observe(dock, { childList: true }); update();
    return () => observer.disconnect();
  }, [dock]);
  useLayoutEffect(() => {
    const page = dock?.previousElementSibling;
    if (!dock || !(page instanceof HTMLElement)) return;
    const resize = () => {
      const top = Math.max(0, page.getBoundingClientRect().top);
      dock.style.setProperty('--annotation-dock-height', `${Math.max(100, Math.min(page.clientHeight || window.innerHeight, window.innerHeight - top) - 8)}px`);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(page); window.addEventListener('resize', resize); resize();
    return () => { observer.disconnect(); window.removeEventListener('resize', resize); };
  }, [dock]);
  return <AnnotationDockContext.Provider value={dock}>
    <div className={`exam-notes-workspace ${occupied ? 'exam-workspace-has-toolbar' : ''} ${className}`}>
      {children}
      <div ref={setDock} className="exam-annotation-dock exam-annotations" />
    </div>
  </AnnotationDockContext.Provider>;
}
