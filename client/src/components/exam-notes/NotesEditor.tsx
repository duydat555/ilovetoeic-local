import React, { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bold, Italic, Underline, List, ListOrdered, Highlighter, Quote, MoreHorizontal, Undo2, Redo2, RemoveFormatting } from 'lucide-react';
import { emptyNote, sanitizeNote } from './model';
import type { NoteDocument } from './model';

export default function NotesEditor({ value, onChange, onFlush, disabled }: {
  value: NoteDocument; onChange: (doc: NoteDocument) => boolean; onFlush: () => void; disabled: boolean;
}) {
  const callbacks = useRef({ onChange, onFlush }); callbacks.current = { onChange, onFlush };
  const [error, setError] = useState('');
  const [more, setMore] = useState(false);
  const reduced = useReducedMotion();
  const moreTrigger = useRef<HTMLButtonElement>(null);
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: false, codeBlock: false, code: false, horizontalRule: false, link: false, trailingNode: false }), Highlight],
    content: value.html, editable: !disabled, shouldRerenderOnTransaction: false,
    editorProps: { attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Nhập ghi chú của bạn', 'data-no-translate': 'true', spellcheck: 'true' },
      transformPastedHTML: html => { try { return sanitizeNote(html); } catch { return ''; } } },
    onUpdate: ({ editor: e }) => {
      try {
        const html = sanitizeNote(e.getHTML());
        if (!callbacks.current.onChange({ ...emptyNote(), html })) throw Error('Chưa thể cập nhật ghi chú. Hãy tải bản sao và thử lại.');
        setError('');
      } catch (cause) { setError((cause as Error).message); }
    },
    onBlur: () => callbacks.current.onFlush(),
  });
  const state = useEditorState({ editor, selector: ({ editor: e }) => ({ bold: e?.isActive('bold'), italic: e?.isActive('italic'),
    underline: e?.isActive('underline'), bulletList: e?.isActive('bulletList'), orderedList: e?.isActive('orderedList'),
    highlight: e?.isActive('highlight'), blockquote: e?.isActive('blockquote'), undo: e?.can().undo(), redo: e?.can().redo() }) });
  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);
  useEffect(() => {
    if (!editor) return;
    try { if (sanitizeNote(editor.getHTML()) !== value.html) editor.commands.setContent(value.html, { emitUpdate: false }); }
    catch { /* Keep the visible draft if validation fails; onUpdate already reports it. */ }
  }, [editor, value.html]);
  useEffect(() => () => callbacks.current.onFlush(), []);
  const button = (label: string, icon: React.ReactNode, action: () => void, active?: boolean, inactive = false) =>
    <button type="button" key={label} title={label} aria-label={label} aria-pressed={active} disabled={disabled || inactive}
      onMouseDown={e => e.preventDefault()} onClick={action}>{icon}</button>;
  return <div className="exam-note-composer" data-no-translate onKeyDown={e => {
    if (more && e.key === 'Escape' && !e.nativeEvent.isComposing) { e.stopPropagation(); setMore(false); moreTrigger.current?.focus(); }
  }}>
    <div role="toolbar" aria-label="Định dạng ghi chú" className="exam-note-formatting">
      {button('In đậm (Ctrl+B)', <Bold size={17} />, () => editor?.chain().focus().toggleBold().run(), state?.bold)}
      {button('In nghiêng (Ctrl+I)', <Italic size={17} />, () => editor?.chain().focus().toggleItalic().run(), state?.italic)}
      {button('Gạch chân (Ctrl+U)', <Underline size={17} />, () => editor?.chain().focus().toggleUnderline().run(), state?.underline)}
      <span className="exam-note-divider" />
      {button('Danh sách gạch đầu dòng', <List size={17} />, () => editor?.chain().focus().toggleBulletList().run(), state?.bulletList)}
      {button('Danh sách có số', <ListOrdered size={17} />, () => editor?.chain().focus().toggleOrderedList().run(), state?.orderedList)}
      {button('Tô sáng chữ', <Highlighter size={17} />, () => editor?.chain().focus().toggleHighlight().run(), state?.highlight)}
      {button('Khối lưu ý', <Quote size={17} />, () => editor?.chain().focus().toggleBlockquote().run(), state?.blockquote)}
      <button ref={moreTrigger} type="button" aria-label="Thêm công cụ" title="Thêm công cụ" aria-expanded={more} aria-controls="exam-note-extra-tools" onClick={() => setMore(v => !v)}><MoreHorizontal size={17} /></button>
    </div>
    <AnimatePresence initial={false}>{more && <motion.div id="exam-note-extra-tools" className="exam-note-more" role="toolbar" aria-label="Công cụ bổ sung"
      initial={{ y: reduced ? 0 : -4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: reduced ? 0 : -4, opacity: 0 }}
      transition={{ duration: reduced ? 0 : .16, ease: 'easeOut' }} onKeyDown={e => {
        if (e.key === 'Escape') { e.stopPropagation(); setMore(false); moreTrigger.current?.focus(); }
      }}>
      {button('Hoàn tác', <Undo2 size={17} />, () => editor?.chain().focus().undo().run(), undefined, !state?.undo)}
      {button('Làm lại', <Redo2 size={17} />, () => editor?.chain().focus().redo().run(), undefined, !state?.redo)}
      {button('Xoá định dạng', <RemoveFormatting size={17} />, () => editor?.chain().focus().unsetAllMarks().clearNodes().run())}
    </motion.div>}</AnimatePresence>
    <div className="exam-note-writing-area">
      {!value.html && <span className="exam-note-placeholder" aria-hidden="true">Nhập ghi chú của bạn...</span>}
      <EditorContent editor={editor} />
    </div>
    {error && <p role="alert" className="exam-notes-error">{error}</p>}
  </div>;
}
