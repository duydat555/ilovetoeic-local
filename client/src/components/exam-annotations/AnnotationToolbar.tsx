import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnnotationDock } from '../exam-notes/AnnotationDock';
import { ArrowUpRight, BookOpen, Eraser, Eye, EyeOff, Highlighter, MousePointer2, Palette, Pencil, Redo2, Square, StickyNote, Trash2, Type, Underline, Undo2 } from 'lucide-react';
import type { Tool } from './model';
import { COLORS } from './model';

const tools: { tool: Tool; label: string; icon: typeof Pencil }[] = [
  { tool: 'select', label: 'Chuột và tra từ', icon: MousePointer2 },
  { tool: 'highlight', label: 'Tô sáng', icon: Highlighter },
  { tool: 'underline', label: 'Gạch chân', icon: Underline },
  { tool: 'pen', label: 'Bút vẽ', icon: Pencil },
  { tool: 'eraser', label: 'Tẩy', icon: Eraser },
  { tool: 'text', label: 'Hộp chữ', icon: Type },
  { tool: 'sticky', label: 'Giấy nhớ', icon: StickyNote },
  { tool: 'rectangle', label: 'Khoanh vùng', icon: Square },
  { tool: 'arrow', label: 'Mũi tên', icon: ArrowUpRight },
];

const COLOR_NAMES = ['Đỏ', 'Cam', 'Xanh lá', 'Xanh dương', 'Tím', 'Hồng'];

interface Props {
  tool: Tool; onTool: (value: Tool) => void; color: string; onColor: (value: string) => void;
  width: number; onWidth: (value: number) => void; hidden: boolean; onHidden: () => void;
  undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean; onClear: () => void;
  onNotebook: () => void; notebookOpen: boolean; count: number; hasContent: boolean;
}

export function AnnotationToolbar(p: Props) {
  const latest = useRef(p); latest.current = p;
  const dock = useAnnotationDock();
  const rail = useRef<HTMLDivElement>(null);
  const paletteBtnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updatePopoverPos = useCallback(() => {
    if (!paletteBtnRef.current) return;
    const rect = paletteBtnRef.current.getBoundingClientRect();
    const popoverWidth = 210;
    const popoverHeight = 220;
    let left = rect.right + 8;
    if (left + popoverWidth > window.innerWidth - 8) {
      left = Math.max(8, rect.left - popoverWidth - 8);
    }
    let top = Math.max(8, rect.top);
    if (top + popoverHeight > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - popoverHeight - 8);
    }
    setPopoverPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (paletteOpen) {
      updatePopoverPos();
    }
  }, [paletteOpen, updatePopoverPos]);

  useEffect(() => {
    if (!paletteOpen) return;
    const onScroll = () => updatePopoverPos();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [paletteOpen, updatePopoverPos]);

  useEffect(() => {
    if (!paletteOpen) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (paletteBtnRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setPaletteOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setPaletteOpen(false);
        paletteBtnRef.current?.focus();
      } else if (e.key >= '1' && e.key <= '6' && e.target instanceof Node && (popoverRef.current?.contains(e.target) || paletteBtnRef.current?.contains(e.target)) && !(e.target instanceof HTMLInputElement)) {
        const idx = parseInt(e.key, 10) - 1;
        if (COLORS[idx]) { e.preventDefault(); latest.current.onColor(COLORS[idx]); }
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    const focus = requestAnimationFrame(() => popoverRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus());
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(focus);
    };
  }, [paletteOpen]);

  useLayoutEffect(() => {
    const element = rail.current;
    if (!element) return;
    let scroller: HTMLElement | null = element.parentElement;
    while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
    const resize = () => element.style.setProperty('--annotation-rail-max-height', `${Math.max(120, Math.min(window.innerHeight, scroller?.clientHeight || window.innerHeight) - 48)}px`);
    const observer = new ResizeObserver(resize);
    if (scroller) observer.observe(scroller);
    window.addEventListener('resize', resize); resize();
    return () => { observer.disconnect(); window.removeEventListener('resize', resize); };
  }, [dock]);

  const sliderPct = Math.max(0, Math.min(100, ((p.width - 1) / (8 - 1)) * 100));

  const toolbar = (
    <div ref={rail} className="exam-annotation-toolbar" role="toolbar" aria-label="Công cụ chú thích" aria-orientation="vertical"
      onKeyDown={e => {
        if ((e.target as HTMLElement).tagName === 'SELECT' || !['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
        const controls = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),select'));
        const index = controls.indexOf(e.target as HTMLElement);
        if (index < 0) return;
        e.preventDefault();
        const next = e.key === 'Home' ? 0 : e.key === 'End' ? controls.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + controls.length) % controls.length;
        controls[next]?.focus();
      }}>
      <div className="exam-annotation-tool-row">
        {tools.map(({ tool, label, icon: Icon }) => (
          <button type="button" key={tool} title={label} aria-label={label}
            aria-pressed={p.tool === tool} onClick={() => p.onTool(tool)}>
            <Icon size={18} strokeWidth={1.8} />
          </button>
        ))}
        <button
          ref={paletteBtnRef}
          type="button"
          title="Màu và độ dày nét"
          aria-label="Màu và độ dày nét"
          aria-expanded={paletteOpen}
          aria-haspopup="dialog"
          aria-pressed={paletteOpen}
          className="exam-annotation-palette-btn"
          onClick={() => setPaletteOpen(v => !v)}
        >
          <Palette size={18} strokeWidth={1.8} />
          <span className="exam-annotation-palette-dot" style={{ backgroundColor: p.color }} />
        </button>
        <span className="exam-annotation-divider" />
        <button type="button" title="Hoàn tác (Ctrl+Z)" aria-label="Hoàn tác" disabled={!p.canUndo} onClick={p.undo}><Undo2 size={18} /></button>
        <button type="button" title="Làm lại (Ctrl+Shift+Z)" aria-label="Làm lại" disabled={!p.canRedo} onClick={p.redo}><Redo2 size={18} /></button>
        <button type="button" title={p.hidden ? 'Hiện chú thích' : 'Ẩn chú thích'} aria-label={p.hidden ? 'Hiện chú thích' : 'Ẩn chú thích'} aria-pressed={p.hidden} onClick={p.onHidden}>
          {p.hidden ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        <button type="button" title="Sổ ghi chú" aria-label={`Sổ ghi chú (${p.count})`} aria-expanded={p.notebookOpen} onClick={p.onNotebook}>
          <BookOpen size={18} /><span className="exam-annotation-badge">{p.count}</span></button>
        <button type="button" title="Xoá chú thích của nhóm này" aria-label="Xoá chú thích của nhóm này" disabled={!p.hasContent} onClick={p.onClear}><Trash2 size={18} /></button>
      </div>
      {paletteOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          className="exam-annotation-palette-popover exam-annotations"
          style={{ top: popoverPos.top, left: popoverPos.left }}
          role="dialog"
          aria-label="Màu và độ dày nét"
          onPointerDown={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
        >
          <div className="exam-annotation-palette-colors" role="group" aria-label="Màu chú thích">
            {COLORS.map((c, i) => {
              const isSelected = p.color.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  className={`exam-annotation-palette-color-btn ${isSelected ? 'selected' : ''}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Màu ${COLOR_NAMES[i]} (${i + 1})`}
                  title={`Màu ${COLOR_NAMES[i]} (${i + 1})`}
                  aria-pressed={isSelected}
                  onClick={() => p.onColor(c)}
                >
                  <span className="exam-annotation-palette-color-number">{i + 1}</span>
                </button>
              );
            })}
          </div>
          <div className="exam-annotation-palette-weight-section">
            <div className="exam-annotation-palette-weight-label">Độ dày nét</div>
            <div className="exam-annotation-palette-slider-wrapper">
              <input
                type="range"
                min={1}
                max={8}
                step={1}
                value={p.width}
                onChange={e => p.onWidth(Number(e.target.value))}
                className="exam-annotation-palette-slider"
                style={{ '--slider-pct': `${sliderPct}%` } as React.CSSProperties}
                aria-label="Độ dày nét"
              />
            </div>
          </div>
        </div>,
        document.fullscreenElement || document.body
      )}
    </div>
  );
  return dock ? createPortal(toolbar, dock) : toolbar;
}
