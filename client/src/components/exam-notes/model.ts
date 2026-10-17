import DOMPurify from 'dompurify';

export interface NoteDocument { version: 1; format: 'html'; html: string }
export interface NoteQuestion { id: string; questionNumber: number; partId: number }
export const emptyNote = (): NoteDocument => ({ version: 1, format: 'html', html: '' });
export const NOTE_TRANSPORT_LIMIT = 200_000;
export function sanitizeNote(html: string): string {
  if (html.length > NOTE_TRANSPORT_LIMIT) throw Error('Nội dung quá lớn để lưu trong một lần. Hãy chia nhỏ ghi chú.');
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'blockquote', 'mark'],
    ALLOWED_ATTR: [], ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false,
    FORBID_CONTENTS: ['script', 'style', 'iframe', 'object', 'svg', 'math', 'template', 'noscript'],
  });
  const parsed = new DOMParser().parseFromString(clean, 'text/html');
  return parsed.body.textContent?.replace(/[\s\u200b\u00a0]/g, '') ? clean : '';
}
export function deserializeNote(raw: string): NoteDocument {
  const value = JSON.parse(raw);
  if (!value || value.version !== 1 || value.format !== 'html' || typeof value.html !== 'string'
    || Object.keys(value).some(k => !['version', 'format', 'html'].includes(k))) throw Error('Không đọc được định dạng ghi chú.');
  return { version: 1, format: 'html', html: sanitizeNote(value.html) };
}
export const serializeNote = (note: NoteDocument) => JSON.stringify(deserializeNote(JSON.stringify(note)));
export const plainToNote = (text: string): NoteDocument => {
  const p = document.createElement('p'); p.textContent = text;
  return { ...emptyNote(), html: sanitizeNote(p.outerHTML) };
};
export const groupIdentity = (questions: NoteQuestion[]) => JSON.stringify(questions.map(q => q.id).sort());
export interface NotesUI { open: boolean; pinned: boolean; tab: 'note' | 'book'; selected: string; group: string }
export type NotesAction = { type: 'toggle' | 'close' | 'pin' } | { type: 'tab'; tab: NotesUI['tab'] }
  | { type: 'select'; id: string } | { type: 'group'; group: string; first: string };
export function notesReducer(state: NotesUI, action: NotesAction): NotesUI {
  switch (action.type) {
    case 'toggle': return { ...state, open: !state.open };
    case 'close': return { ...state, open: false };
    case 'pin': return { ...state, pinned: !state.pinned };
    case 'tab': return { ...state, tab: action.tab };
    case 'select': return { ...state, selected: action.id, tab: 'note' };
    case 'group': return state.group === action.group ? state : { ...state, group: action.group, selected: action.first, open: state.pinned && state.open };
  }
}
