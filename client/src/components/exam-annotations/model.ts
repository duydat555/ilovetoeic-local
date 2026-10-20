export const MAX_ITEMS = 400;
export const MAX_POINTS = 4000;
export const MAX_STORAGE_LENGTH = 2_000_000;
export const COLORS = ['#ef4444', '#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'] as const;
export type Tool = 'select' | 'highlight' | 'underline' | 'pen' | 'eraser' | 'text' | 'sticky' | 'rectangle' | 'arrow';
export interface QuoteAnchor { start: number; end: number; quote: string; prefix: string; suffix: string }
export interface BlockAnchor { index: number; fingerprint: string }
export interface Point { x: number; y: number; offset?: number; dx?: number; dy?: number }
interface Base { id: string; color: string; width: number }
export type Annotation =
  | (Base & { kind: 'highlight' | 'underline'; anchor: QuoteAnchor })
  | (Base & { kind: 'pen' | 'rectangle' | 'arrow'; block: BlockAnchor; points: Point[] })
  | (Base & { kind: 'text' | 'sticky'; block: BlockAnchor; points: Point[]; text: string });
export interface AnnotationDocument { version: 1; items: Annotation[]; note: string; review: boolean }
export interface History { past: AnnotationDocument[]; present: AnnotationDocument; future: AnnotationDocument[] }
export const emptyDocument = (): AnnotationDocument => ({ version: 1, items: [], note: '', review: false });
export const storageKeyFor = (user: string, scope: string, group: string) =>
  `ilovetoeic.annotations.v1:${[user, scope, group].map(encodeURIComponent).join(':')}`;
export const fingerprint = (text: string) => {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `${text.length}-${(hash >>> 0).toString(36)}`;
};
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const number = (value: unknown, min = 0, max = 1_000_000): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const integer = (value: unknown, max = 1_000_000) => number(value, 0, max) && Number.isInteger(value);
const string = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max;
const validPoint = (p: unknown) => object(p) && number(p.x, -10, 10) && number(p.y, -10, 10)
  && (p.offset === undefined || (integer(p.offset) && number(p.dx, -1000, 1000) && number(p.dy, -1000, 1000)));
const validAnnotation = (a: unknown): a is Annotation => {
  if (!object(a) || !string(a.id, 150) || !a.id || !string(a.color, 7) || !/^#[0-9a-f]{6}$/i.test(a.color) || !number(a.width, 1, 8)) return false;
  if (a.kind === 'highlight' || a.kind === 'underline') {
    const q = a.anchor;
    return object(q) && integer(q.start) && integer(q.end) && Number(q.end) > Number(q.start)
      && string(q.quote, 2000) && !!q.quote && Number(q.end) - Number(q.start) === q.quote.length
      && string(q.prefix, 80) && string(q.suffix, 80);
  }
  return ['pen', 'rectangle', 'arrow', 'text', 'sticky'].includes(String(a.kind))
    && object(a.block) && integer(a.block.index, 10000) && string(a.block.fingerprint, 80)
    && Array.isArray(a.points) && a.points.length > 0 && a.points.length <= MAX_POINTS && a.points.every(validPoint)
    && (a.kind === 'pen' ? a.points.length >= 2 : a.kind === 'rectangle' || a.kind === 'arrow'
      ? a.points.length === 2 : a.points.length === 1 && string(a.text, 2000));
};
export function deserialize(raw: string): AnnotationDocument {
  if (raw.length > MAX_STORAGE_LENGTH) throw new Error('too-large');
  const value: unknown = JSON.parse(raw);
  if (!object(value) || value.version !== 1 || !Array.isArray(value.items) || value.items.length > MAX_ITEMS
    || !value.items.every(validAnnotation) || new Set(value.items.map(a => a.id)).size !== value.items.length
    || !string(value.note, 10000) || typeof value.review !== 'boolean') throw new Error('invalid-document');
  return value as unknown as AnnotationDocument;
}
export function serialize(doc: AnnotationDocument): string {
  const raw = JSON.stringify(doc);
  deserialize(raw);
  return raw;
}
export function historyStep(state: History, action: { type: 'edit'; document: AnnotationDocument } | { type: 'undo' | 'redo' }): History {
  if (action.type === 'edit') {
    if (JSON.stringify(state.present) === JSON.stringify(action.document)) return state;
    return { past: [...state.past, state.present].slice(-80), present: action.document, future: [] };
  }
  if (action.type === 'undo' && state.past.length) return {
    past: state.past.slice(0, -1), present: state.past[state.past.length - 1], future: [state.present, ...state.future],
  };
  if (action.type === 'redo' && state.future.length) return {
    past: [...state.past, state.present].slice(-80), present: state.future[0], future: state.future.slice(1),
  };
  return state;
}
/** Refuse ambiguous matches rather than attaching a mark to the wrong sentence. */
export function resolveQuote(text: string, anchor: QuoteAnchor): [number, number] | null {
  if (text.slice(anchor.start, anchor.end) === anchor.quote) return [anchor.start, anchor.end];
  const candidates: number[] = [];
  for (let at = text.indexOf(anchor.quote); at >= 0; at = text.indexOf(anchor.quote, at + 1)) {
    if ((!anchor.prefix || text.slice(Math.max(0, at - anchor.prefix.length), at) === anchor.prefix)
      && (!anchor.suffix || text.slice(at + anchor.quote.length, at + anchor.quote.length + anchor.suffix.length) === anchor.suffix)) candidates.push(at);
    if (candidates.length > 1) return null;
  }
  return candidates.length === 1 ? [candidates[0], candidates[0] + anchor.quote.length] : null;
}
export function adaptLegacy(items: readonly { id: string; start: number; end: number; text: string; type: 'highlight' | 'underline' }[]): Annotation[] {
  return items.slice(0, MAX_ITEMS).map(a => ({ id: `legacy-${a.id}`, kind: a.type, color: '#fbbf24', width: 2,
    anchor: { start: a.start, end: a.end, quote: a.text, prefix: '', suffix: '' } } as Annotation)).filter(validAnnotation);
}
