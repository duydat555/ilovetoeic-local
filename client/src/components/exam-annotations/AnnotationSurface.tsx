import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import { PassageContent } from '../common/PassageContent';
import { createClientId } from '../../utils/id';
import type { PracticeAnnotation } from '../common/AnnotatablePassage';
import { AnnotationToolbar } from './AnnotationToolbar';
import { adaptLegacy, COLORS, emptyDocument, MAX_ITEMS, MAX_POINTS, storageKeyFor } from './model';
import type { Annotation, BlockAnchor, Point, Tool } from './model';
import { anchorPoint, blockAt, findBlock, quoteRects, resolvePoint, selectionAnchor } from './anchors';
import { useAnnotationDocument } from './useAnnotationDocument';
import { useExamNotes } from '../exam-notes/ExamNotesWorkspace';
import { useAnnotationDock } from '../exam-notes/AnnotationDock';
import './annotations.css';

export interface AnnotationSurfaceProps {
  html: string; passageId?: string; userId: string; scope: string; group: string;
  progress: string; legacy?: PracticeAnnotation[]; legacyNotes?: string[];
}
type Drawing = { pointerId: number; tool: 'pen' | 'rectangle' | 'arrow'; block: BlockAnchor; element: HTMLElement; points: Point[]; pixels: [number, number][]; origin: DOMRect };
type Editor = { kind: 'text' | 'sticky'; block: BlockAnchor; points: Point[]; text: string; id?: string };
const drawingTools = new Set<Tool>(['pen', 'rectangle', 'arrow', 'text', 'sticky', 'eraser']);
const hintFor: Record<Tool, string> = {
  select: 'Chọn chữ để tra từ như bình thường.', highlight: 'Bôi đen đoạn chữ cần tô sáng.', underline: 'Bôi đen đoạn chữ cần gạch chân.',
  pen: 'Kéo để vẽ. Chọn Chuột để cuộn bằng cảm ứng.', eraser: 'Chạm vào chú thích để xoá.', text: 'Chạm vào bài đọc để thêm chữ.',
  sticky: 'Chạm vào bài đọc để thêm giấy nhớ.', rectangle: 'Kéo để khoanh một vùng.', arrow: 'Kéo từ điểm đầu đến điểm cuối.',
};
const pathFor = (points: [number, number][]) => points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
export default function AnnotationSurface(p: AnnotationSurfaceProps) {
  const notesPanel = useExamNotes();
  const toolbarDock = useAnnotationDock();
  const key = storageKeyFor(p.userId, p.scope, p.group);
  const [initial] = useState(() => ({ ...emptyDocument(), items: adaptLegacy(p.legacy || []) }));
  const saved = useAnnotationDocument(key, initial);
  const doc = saved.document;
  const publishNotes = notesPanel?.publish;
  useEffect(() => {
    publishNotes?.({ document: doc, remove: id => saved.edit({ ...doc, items: doc.items.filter(item => item.id !== id) }) });
    return () => publishNotes?.(undefined);
  }, [publishNotes, doc, saved.edit]);
  const [tool, setTool] = useState<Tool>('select');
  const [color, setColor] = useState<string>(COLORS[0]);
  const [width, setWidth] = useState(2);
  const [hidden, setHidden] = useState(false);
  const [notebook, setNotebook] = useState(false);
  const [noteDraft, setNoteDraft] = useState(doc.note);
  const [confirmClear, setConfirmClear] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [notice, setNotice] = useState('');
  const [layout, setLayout] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const preview = useRef<SVGPathElement>(null);
  const draw = useRef<Drawing | null>(null);
  const frame = useRef(0);
  const touchTimer = useRef(0);
  const selecting = useRef(false);
  const activeRef = useRef(false);
  const editorTrigger = useRef<HTMLElement | null>(null);
  const editorField = useRef<HTMLTextAreaElement>(null);
  const editorDismissed = useRef(false);
  const noteField = useRef<HTMLTextAreaElement>(null);

  const cancelDrawing = useCallback(() => {
    const stroke = draw.current; draw.current = null;
    cancelAnimationFrame(frame.current);
    if (preview.current) preview.current.setAttribute('d', '');
    if (stroke && root.current?.hasPointerCapture(stroke.pointerId)) root.current.releasePointerCapture(stroke.pointerId);
  }, []);
  useEffect(() => () => { cancelDrawing(); window.clearTimeout(touchTimer.current); }, [cancelDrawing]);
  useEffect(() => { cancelDrawing(); }, [tool, hidden, cancelDrawing]);
  useEffect(() => { if (editor) editorField.current?.focus(); }, [editor?.id, !!editor]);
  useLayoutEffect(() => {
    if (!editor || !editorField.current) return;
    const field = editorField.current;
    const minHeight = editor.kind === 'text' ? 36 : 44;
    field.style.height = `${minHeight}px`;
    field.style.height = `${Math.min(220, Math.max(minHeight, field.scrollHeight + 2))}px`;
  }, [editor?.kind, editor?.text]);
  useEffect(() => { if (notebook) { setNoteDraft(doc.note); noteField.current?.focus(); } }, [notebook]);
  useEffect(() => { setNoteDraft(doc.note); }, [doc.note]);
  useLayoutEffect(() => {
    const el = content.current;
    if (!el) return;
    let alive = true;
    const update = () => { if (alive) { cancelDrawing(); setLayout(n => n + 1); } };
    const observer = new ResizeObserver(update); observer.observe(el);
    const mutation = new MutationObserver(update); mutation.observe(el, { childList: true, subtree: true, attributes: true });
    el.addEventListener('load', update, true); window.addEventListener('resize', update);
    document.fonts?.ready.then(update);
    update();
    return () => { alive = false; observer.disconnect(); mutation.disconnect(); el.removeEventListener('load', update, true); window.removeEventListener('resize', update); };
  }, [p.html, cancelDrawing]);

  const add = (item: Annotation) => {
    if (doc.items.length >= MAX_ITEMS) { setNotice('Nhóm này đã có nhiều chú thích. Hãy xoá bớt trước khi thêm.'); return false; }
    const result = saved.edit({ ...doc, items: [...doc.items, item] });
    if (result) { setNotice(''); setHidden(false); }
    return result;
  };
  const captureText = () => {
    if (!content.current || (tool !== 'highlight' && tool !== 'underline') || hidden) return;
    const anchor = selectionAnchor(content.current);
    if (!anchor) return;
    if (add({ id: createClientId(), kind: tool, anchor, color, width })) window.getSelection()?.removeAllRanges();
  };
  const changeTool = (value: Tool) => { setTool(value); setEditor(null); setConfirmClear(false); if (value !== 'select') setHidden(false); };
  const closeClear = () => {
    setConfirmClear(false);
    requestAnimationFrame(() => {
      const trigger = (toolbarDock || root.current?.closest('.exam-annotations'))?.querySelector<HTMLButtonElement>('[aria-label="Xoá chú thích của nhóm này"]');
      if (trigger && !trigger.disabled) trigger.focus(); else root.current?.focus();
    });
  };
  const deleteItem = (id: string) => saved.edit({ ...doc, items: doc.items.filter(a => a.id !== id) });
  const finishEditor = (returnFocus = true) => {
    if (!editor || editorDismissed.current) return;
    if (!editor.text.trim()) {
      if (editor.id && !deleteItem(editor.id)) return;
      editorDismissed.current = true; setEditor(null);
      if (returnFocus) editorTrigger.current?.focus();
      return;
    }
    const item: Annotation = { ...editor, id: editor.id || createClientId(), text: editor.text.trim(), color, width };
    const ok = editor.id
      ? saved.edit({ ...doc, items: doc.items.map(a => a.id === editor.id ? item : a) })
      : add(item);
    if (ok) { editorDismissed.current = true; setEditor(null); if (returnFocus) editorTrigger.current?.focus(); }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    activeRef.current = true;
    if (!e.isPrimary || e.button !== 0 || hidden || editor || !content.current || !root.current) return;
    selecting.current = tool === 'highlight' || tool === 'underline';
    if (!drawingTools.has(tool)) return;
    const marked = (e.target as Element).closest('[data-annotation-id]');
    if (tool === 'eraser') {
      const id = marked?.getAttribute('data-annotation-id');
      if (id) { e.preventDefault(); deleteItem(id); }
      return;
    }
    if (marked) return;
    e.preventDefault();
    const block = blockAt(content.current, e.clientX, e.clientY);
    if (!block) return;
    const point = anchorPoint(block.element, e.clientX, e.clientY);
    if (tool === 'text' || tool === 'sticky') {
      editorTrigger.current = root.current;
      editorDismissed.current = false;
      setEditor({ kind: tool, block: block.anchor, points: [point], text: '' });
      return;
    }
    if (tool !== 'pen' && tool !== 'rectangle' && tool !== 'arrow') return;
    const origin = root.current.getBoundingClientRect();
    root.current.setPointerCapture(e.pointerId);
    draw.current = { pointerId: e.pointerId, tool, block: block.anchor, element: block.element, points: [point], pixels: [[e.clientX - origin.left, e.clientY - origin.top]], origin };
  };
  const updateDrawing = (e: React.PointerEvent<HTMLDivElement>) => {
    const stroke = draw.current;
    if (!stroke || stroke.pointerId !== e.pointerId) return;
    e.preventDefault();
    const point = anchorPoint(stroke.element, e.clientX, e.clientY);
    const pixel: [number, number] = [e.clientX - stroke.origin.left, e.clientY - stroke.origin.top];
    if (stroke.tool === 'pen') {
      if (stroke.points.length >= MAX_POINTS) return;
      const last = stroke.pixels[stroke.pixels.length - 1];
      if (Math.hypot(pixel[0] - last[0], pixel[1] - last[1]) < 2) return;
      stroke.points.push(point); stroke.pixels.push(pixel);
    } else { stroke.points[1] = point; stroke.pixels[1] = pixel; }
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (!preview.current || !draw.current) return;
      const points = stroke.pixels;
      if (stroke.tool === 'rectangle' && points.length > 1) {
        const [a, b] = points;
        preview.current.setAttribute('d', `M${a[0]},${a[1]}H${b[0]}V${b[1]}H${a[0]}Z`);
      } else preview.current.setAttribute('d', pathFor(points));
    });
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const stroke = draw.current;
    if (stroke?.pointerId === e.pointerId) {
      updateDrawing(e);
      if (stroke.points.length >= 2) add({ id: createClientId(), kind: stroke.tool, block: stroke.block, points: stroke.points, color, width });
      cancelDrawing();
    }
    if (selecting.current) {
      selecting.current = false;
      window.clearTimeout(touchTimer.current);
      touchTimer.current = window.setTimeout(captureText, e.pointerType === 'touch' ? 250 : 0);
    }
  };
  // Native mobile selection handles may finish without another pointerup on the passage.
  useEffect(() => {
    if (tool !== 'highlight' && tool !== 'underline') return;
    const changed = () => {
      if (selecting.current) return;
      window.clearTimeout(touchTimer.current);
      touchTimer.current = window.setTimeout(captureText, 450);
    };
    document.addEventListener('selectionchange', changed);
    return () => { document.removeEventListener('selectionchange', changed); window.clearTimeout(touchTimer.current); };
  }, [tool, color, width, hidden, doc]);
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (!activeRef.current || (!root.current?.parentElement?.contains(target) && !toolbarDock?.contains(target)) || target.closest('input,textarea,select,[contenteditable="true"],[role="dialog"]') || editor || confirmClear) return;
      if (e.key === 'Escape') { cancelDrawing(); changeTool('select'); return; }
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault(); cancelDrawing(); if (e.shiftKey) saved.redo(); else saved.undo();
      } else if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'y') { e.preventDefault(); cancelDrawing(); saved.redo(); }
    };
    const outside = (e: PointerEvent) => { activeRef.current = !!(e.target instanceof Node && (root.current?.parentElement?.contains(e.target) || toolbarDock?.contains(e.target))); };
    window.addEventListener('keydown', keydown); document.addEventListener('pointerdown', outside, true);
    return () => { window.removeEventListener('keydown', keydown); document.removeEventListener('pointerdown', outside, true); };
  }, [saved.undo, saved.redo, editor, confirmClear, cancelDrawing, toolbarDock]);

  const origin = root.current?.getBoundingClientRect();
  const annotations = !hidden && origin && content.current ? doc.items.flatMap(item => {
    const erase = tool === 'eraser';
    const action = { 'data-annotation-id': item.id, onPointerDown: (e: React.PointerEvent) => {
      if (erase) { e.preventDefault(); e.stopPropagation(); deleteItem(item.id); }
    } };
    if (item.kind === 'highlight' || item.kind === 'underline') {
      return quoteRects(content.current!, item.anchor).map((r, i) => <rect key={`${item.id}-${i}`} {...action}
        x={r.left - origin.left} y={r.top - origin.top + (item.kind === 'underline' ? r.height - 2 : 0)}
        width={r.width} height={item.kind === 'underline' ? Math.max(2, item.width / 2) : r.height}
        fill={item.color} fillOpacity={item.kind === 'underline' ? 0.9 : 0.28} pointerEvents={erase ? 'all' : 'none'} />);
    }
    if (!('block' in item)) return [];
    const block = findBlock(content.current!, item.block);
    if (!block) return [];
    const points = item.points.map(point => resolvePoint(block, point, origin));
    if (item.kind === 'text' || item.kind === 'sticky') return [];
    const [a, b = a] = points;
    const d = item.kind === 'rectangle' ? `M${a[0]},${a[1]}H${b[0]}V${b[1]}H${a[0]}Z` : pathFor(points);
    return <g key={item.id}>
      <path {...action} d={d} fill="none" stroke="transparent" strokeWidth={Math.max(14, item.width + 10)} pointerEvents={erase ? 'stroke' : 'none'} />
      <path d={d} fill="none" stroke={item.color} strokeWidth={item.width} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
      {item.kind === 'arrow' && <ArrowHead start={a} end={b} color={item.color} width={item.width} />}
    </g>;
  }) : [];
  const texts = !hidden && origin && content.current ? doc.items.flatMap(item => {
    if (item.kind !== 'text' && item.kind !== 'sticky') return [];
    if (editor?.id === item.id) return [];
    const block = findBlock(content.current!, item.block);
    if (!block) return [];
    const [left, top] = resolvePoint(block, item.points[0], origin);
    return <button type="button" key={item.id} data-annotation-id={item.id}
      className={`exam-annotation-text ${item.kind === 'sticky' ? 'exam-annotation-sticky' : 'exam-annotation-text-box'}`}
      style={item.kind === 'sticky'
        ? { left: Math.max(0, Math.min(left, origin.width - Math.min(204, origin.width))), top: Math.max(0, top), width: 'max-content', maxWidth: Math.min(204, origin.width), background: item.color, color: stickyInk(item.color) }
        : { left: Math.max(0, Math.min(left, origin.width - Math.min(204, origin.width))), top: Math.max(0, top), width: 'max-content', maxWidth: Math.min(204, origin.width), color: item.color }}
      aria-label={`${item.kind === 'sticky' ? 'Giấy nhớ' : 'Hộp chữ'}: ${item.text}`}
      onPointerDown={e => { e.stopPropagation(); if (tool === 'eraser') { e.preventDefault(); deleteItem(item.id); } }}
      onClick={() => { if (tool === 'eraser') return; editorTrigger.current = root.current; editorDismissed.current = false; setTool(item.kind); setColor(item.color); setWidth(item.width); setEditor(item); }}>
      {item.text}
    </button>;
  }) : [];
  const editorBlock = editor && content.current ? findBlock(content.current, editor.block) : null;
  const editorPoint = editor && editorBlock && origin ? resolvePoint(editorBlock, editor.points[0], origin) : null;
  const editorWidth = editor?.kind === 'text' ? 140 : 168;
  const noteCount = doc.items.filter(a => a.kind === 'text' || a.kind === 'sticky').length + Number(!!doc.note.trim()) + (p.legacyNotes?.length || 0);
  // layout is incremented by observers so all Range/anchor coordinates are recomputed after reflow.
  void layout;
  return <section className="exam-annotations" aria-label="Chú thích bài đọc" onFocusCapture={() => { activeRef.current = true; }}>
    <div className={`exam-annotation-layout ${toolbarDock ? 'exam-annotation-layout-docked' : ''}`}>
    <AnnotationToolbar tool={tool} onTool={changeTool} color={color} onColor={setColor} width={width} onWidth={setWidth}
      hidden={hidden} onHidden={() => { setHidden(v => !v); setTool('select'); }} undo={() => { cancelDrawing(); saved.undo(); }} redo={() => { cancelDrawing(); saved.redo(); }}
      canUndo={saved.canUndo} canRedo={saved.canRedo} hasContent={!!doc.items.length || !!doc.note}
      onClear={() => { cancelDrawing(); setEditor(null); setConfirmClear(true); }} onNotebook={() => notesPanel ? notesPanel.dispatch({ type: 'toggle' }) : setNotebook(v => !v)} notebookOpen={notesPanel ? notesPanel.ui.open : notebook} count={notesPanel ? notesPanel.count : noteCount} />
    <div className="exam-annotation-body">
    <div className="exam-annotation-summary"><span>Nhóm {p.progress}</span><label><input type="checkbox" checked={doc.review}
      onChange={e => saved.edit({ ...doc, review: e.target.checked })} /> Đánh dấu xem lại</label></div>
    <p className="exam-annotation-hint">{hintFor[tool]}</p>
    {saved.error && <div className="exam-annotation-message" role="alert"><p>{saved.error}</p>
      <button type="button" onClick={saved.conflict ? saved.loadServer : saved.unsaved || saved.needsRemoteRetry ? saved.retry : saved.reload}>
        {saved.conflict ? 'Đọc bản máy chủ' : saved.unsaved || saved.needsRemoteRetry ? 'Thử lưu lại' : 'Đọc bản mới'}</button>
      {!saved.conflict && <button type="button" onClick={saved.loadServer}>Đọc bản máy chủ</button>}
      {saved.unsaved && <button type="button" onClick={() => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(doc)], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url; link.download = 'ghi-chu-bai-doc.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}>Tải bản sao</button>}</div>}
    {notice && <p className="exam-annotation-message" role="status">{notice}</p>}
    {confirmClear && <div className="exam-annotation-message" role="alertdialog" aria-label="Xoá chú thích nhóm này?"
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); closeClear(); } }}>
      <p>Xoá chú thích và ghi chú nhóm trên bài đọc? Ghi chú riêng từng câu được giữ lại. Bạn có thể hoàn tác.</p>
      <button type="button" autoFocus onClick={closeClear}>Giữ lại</button>
      <button type="button" onClick={() => { if (saved.edit({ ...doc, items: [], note: '' })) { closeClear(); setNoteDraft(''); } }}>Xoá chú thích</button>
    </div>}
    {notebook && <div className="exam-annotation-notebook">
      <div className="exam-annotation-editor-heading"><strong><BookOpen size={16} /> Sổ ghi chú</strong><button type="button" aria-label="Đóng sổ ghi chú" onClick={() => setNotebook(false)}><X size={18} /></button></div>
      <label>Ghi chú cho nhóm này<textarea ref={noteField} maxLength={10000} rows={4} value={noteDraft} onChange={e => setNoteDraft(e.target.value)}
        onBlur={() => { if (noteDraft !== doc.note) saved.edit({ ...doc, note: noteDraft }); }} /></label>
      <button type="button" className="exam-annotation-save" onClick={() => { if (saved.edit({ ...doc, note: noteDraft })) { setNotice('Đã ghi nhận ghi chú.'); } }}>Lưu ghi chú</button>
      {p.legacyNotes?.map((note, i) => <p className="exam-annotation-old-note" key={i}>{note}</p>)}
      {doc.items.filter(a => a.kind === 'text' || a.kind === 'sticky').map(a => <p className="exam-annotation-old-note" key={a.id}>{'text' in a ? a.text : ''}</p>)}
      {!noteCount && <p className="exam-annotation-hint">Ghi lại điều bạn muốn nhớ khi xem lại bài.</p>}
    </div>}
    <div ref={root} tabIndex={0} className={`exam-annotation-paper ${drawingTools.has(tool) && !hidden ? 'exam-annotation-drawing' : ''}`}
      data-no-translate={tool !== 'select' ? true : undefined} data-tool={tool}
      onPointerDown={onPointerDown} onPointerMove={updateDrawing} onPointerUp={onPointerUp} onPointerCancel={() => { selecting.current = false; cancelDrawing(); }}
      onLostPointerCapture={cancelDrawing}>
      <div ref={content}><PassageContent html={p.html} passageId={p.passageId} /></div>
      <svg className="exam-annotation-overlay" aria-hidden="true" width="100%" height="100%">
        {annotations}<path ref={preview} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
      </svg>
      {texts}
      {editor && editorPoint && origin && <textarea ref={editorField}
        className={`exam-annotation-inline-input ${editor.kind === 'sticky' ? 'exam-annotation-sticky-input' : 'exam-annotation-text-input'}`}
        aria-label={editor.kind === 'sticky' ? 'Nội dung giấy nhớ' : 'Nội dung hộp chữ'} placeholder="..." rows={1} maxLength={2000}
        data-no-translate value={editor.text}
        title="Bấm ra ngoài để lưu · Ctrl+Enter lưu · Escape huỷ"
        style={{ left: Math.max(0, Math.min(editorPoint[0], origin.width - Math.min(editorWidth, origin.width))), top: Math.max(0, editorPoint[1]), width: Math.min(editorWidth, origin.width), background: editor.kind === 'sticky' ? color : 'transparent', color: editor.kind === 'sticky' ? stickyInk(color) : color }}
        onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
        onChange={e => setEditor({ ...editor, text: e.target.value })}
        onBlur={() => finishEditor(false)}
        onKeyDown={e => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); editorDismissed.current = true; setEditor(null); editorTrigger.current?.focus(); }
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); finishEditor(); }
        }} />}
    </div>
    <p className="exam-annotation-footnote" role="status">{saved.syncStatus}</p>
    </div>
    </div>
  </section>;
}
function stickyInk(color: string) {
  const channels = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255)
    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  const luminance = .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
  return luminance > .179 ? '#111827' : '#ffffff';
}
function ArrowHead({ start, end, color, width }: { start: [number, number]; end: [number, number]; color: string; width: number }) {
  const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
  const length = 10 + width;
  const side = (offset: number) => `${end[0] - length * Math.cos(angle + offset)},${end[1] - length * Math.sin(angle + offset)}`;
  return <path d={`M${side(-0.45)}L${end[0]},${end[1]}L${side(0.45)}`} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" pointerEvents="none" />;
}
