import { fingerprint, resolveQuote } from './model';
import type { BlockAnchor, Point, QuoteAnchor } from './model';

export function textNodes(root: Node): Text[] {
  const walker = root.ownerDocument!.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const result: Text[] = [];
  while (walker.nextNode()) result.push(walker.currentNode as Text);
  return result;
}
export function rangeAt(root: HTMLElement, start: number, end: number): Range | null {
  let at = 0;
  const range = root.ownerDocument.createRange();
  let begun = false;
  for (const node of textNodes(root)) {
    const next = at + node.length;
    if (!begun && start <= next) { range.setStart(node, Math.max(0, start - at)); begun = true; }
    if (begun && end <= next) { range.setEnd(node, Math.max(0, end - at)); return range; }
    at = next;
  }
  return null;
}
export function selectionAnchor(root: HTMLElement): QuoteAnchor | null {
  const selection = window.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const before = range.cloneRange();
  before.selectNodeContents(root);
  before.setEnd(range.startContainer, range.startOffset);
  const raw = range.toString();
  const quote = raw.trim();
  if (!quote || quote.length > 2000) return null;
  const start = before.toString().length + raw.length - raw.trimStart().length;
  const end = start + quote.length;
  const text = root.textContent || '';
  return { start, end, quote, prefix: text.slice(Math.max(0, start - 40), start), suffix: text.slice(end, end + 40) };
}
export function quoteRects(root: HTMLElement, anchor: QuoteAnchor) {
  const offsets = resolveQuote(root.textContent || '', anchor);
  const range = offsets && rangeAt(root, ...offsets);
  return range ? Array.from(range.getClientRects()).filter(r => r.width && r.height) : [];
}
export function blocks(root: HTMLElement): HTMLElement[] {
  const passage = root.querySelector<HTMLElement>('.toeic-passage') || root;
  const candidates = Array.from(passage.querySelectorAll<HTMLElement>('p,li,td,th,h1,h2,h3,h4,blockquote,pre'));
  const leaves = candidates.filter(el => !candidates.some(other => other !== el && el.contains(other)));
  return leaves.length ? leaves : [passage];
}
export function blockAt(root: HTMLElement, clientX: number, clientY: number): { element: HTMLElement; anchor: BlockAnchor } | null {
  const list = blocks(root);
  let best: HTMLElement | null = null, distance = Infinity;
  for (const el of list) {
    const r = el.getBoundingClientRect();
    const d = Math.hypot(Math.max(r.left - clientX, 0, clientX - r.right), Math.max(r.top - clientY, 0, clientY - r.bottom));
    if (r.width && r.height && d < distance) { best = el; distance = d; }
  }
  return best ? { element: best, anchor: { index: list.indexOf(best), fingerprint: fingerprint(best.textContent || '') } } : null;
}
export function findBlock(root: HTMLElement, anchor: BlockAnchor): HTMLElement | null {
  const list = blocks(root), at = list[anchor.index];
  if (at && fingerprint(at.textContent || '') === anchor.fingerprint) return at;
  const matches = list.filter(el => fingerprint(el.textContent || '') === anchor.fingerprint);
  return matches.length === 1 ? matches[0] : null;
}
type CaretDocument = Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null; caretRangeFromPoint?: (x: number, y: number) => Range | null };
export function anchorPoint(block: HTMLElement, clientX: number, clientY: number): Point {
  const r = block.getBoundingClientRect();
  const point: Point = { x: (clientX - r.left) / (r.width || 1), y: (clientY - r.top) / (r.height || 1) };
  const doc = block.ownerDocument as CaretDocument;
  const caret = doc.caretPositionFromPoint?.(clientX, clientY);
  const fallback = !caret && doc.caretRangeFromPoint?.(clientX, clientY);
  const node = caret?.offsetNode || (fallback && fallback.startContainer);
  const offset = caret?.offset ?? (fallback ? fallback.startOffset : 0);
  if (node && block.contains(node) && node.nodeType === Node.TEXT_NODE) {
    const before = doc.createRange(); before.selectNodeContents(block); before.setEnd(node, offset);
    const at = before.toString().length;
    const rect = caretRect(block, at);
    if (rect) {
      const font = parseFloat(getComputedStyle(block).fontSize) || 16;
      Object.assign(point, { offset: at, dx: (clientX - rect.left) / font, dy: (clientY - rect.top) / font });
    }
  }
  return point;
}
function caretRect(block: HTMLElement, offset: number) {
  const text = block.textContent || '';
  if (!text.length || offset > text.length) return null;
  // A non-empty character range works on browsers returning an empty collapsed rect.
  const range = rangeAt(block, Math.min(offset, text.length - 1), Math.min(offset + 1, text.length));
  const rect = range?.getBoundingClientRect();
  return rect?.height ? { left: offset === text.length ? rect.right : rect.left, top: rect.top } : null;
}
export function resolvePoint(block: HTMLElement, point: Point, origin: DOMRect): [number, number] {
  const r = block.getBoundingClientRect();
  const caret = point.offset === undefined ? null : caretRect(block, point.offset);
  const font = parseFloat(getComputedStyle(block).fontSize) || 16;
  return caret && point.dx !== undefined && point.dy !== undefined
    ? [caret.left + point.dx * font - origin.left, caret.top + point.dy * font - origin.top]
    : [r.left + point.x * r.width - origin.left, r.top + point.y * r.height - origin.top];
}
