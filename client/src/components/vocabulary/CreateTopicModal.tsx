import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Briefcase, Check, Loader2, Search, Sparkles, TrendingUp, X } from 'lucide-react';
import { getModalMotion } from '../common/modalMotion';
import { ModalPortal } from '../common/ModalPortal';
import { dictionaryService } from '../../services/dictionary';
import { vocabularyService } from '../../services/vocabulary';
import { vocabularyTopicService, VocabularyTopic } from '../../services/vocabularyTopics';
import type { VocabularyWord, WordTranslation } from '../../types';

const ICONS = [
  { id: 'briefcase', label: 'Công việc', Icon: Briefcase },
  { id: 'chart', label: 'Kinh doanh', Icon: TrendingUp },
  { id: 'sparkles', label: 'Tự chọn', Icon: Sparkles },
];

interface CreateTopicModalProps {
  userId: string;
  words: VocabularyWord[];
  topic?: VocabularyTopic | null;
  onClose: () => void;
  onSaved: (topic: VocabularyTopic) => void;
}

export const CreateTopicModal: React.FC<CreateTopicModalProps> = ({ userId, words, topic, onClose, onSaved }) => {
  const reduceMotion = useReducedMotion();
  const motionContract = getModalMotion(reduceMotion);
  const [name, setName] = useState(topic?.name || '');
  const [description, setDescription] = useState(topic?.description || '');
  const [icon, setIcon] = useState(topic?.icon || 'briefcase');
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>(topic ? vocabularyTopicService.getWordIds(userId, topic.id) : []);
  const [wordQuery, setWordQuery] = useState('');
  const [newWord, setNewWord] = useState('');
  const [translation, setTranslation] = useState<WordTranslation | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const filteredWords = useMemo(() => {
    const normalized = wordQuery.trim().toLocaleLowerCase('vi');
    return words.filter((word) => !normalized || `${word.word} ${word.meaningVi}`.toLocaleLowerCase('vi').includes(normalized));
  }, [wordQuery, words]);

  const lookup = async () => {
    if (!newWord.trim()) return;
    setLookupLoading(true);
    setError('');
    try {
      setTranslation(await dictionaryService.translateWord(newWord.trim()));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tra từ bằng AI.');
    } finally {
      setLookupLoading(false);
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên chủ đề.');
      return;
    }
    const savedTopic = topic || vocabularyTopicService.create(userId, {
      name: name.trim(), icon, description: description.trim(),
    });
    if (topic) vocabularyTopicService.update(userId, topic.id, { name: name.trim(), icon, description: description.trim() });

    const assignedIds = [...selectedWordIds];
    if (translation) {
      const result = await vocabularyService.add(userId, translation, '', { id: savedTopic.id, name: savedTopic.name });
      assignedIds.push(result.word.id);
    }
    vocabularyTopicService.setWords(userId, savedTopic.id, assignedIds);
    onSaved({ ...savedTopic, name: name.trim(), icon, description: description.trim() });
  };

  return (
    <ModalPortal>
    <motion.div {...motionContract.backdrop} className="fixed inset-0 z-[100] grid h-[100dvh] w-screen place-items-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.div {...motionContract.panel} role="dialog" aria-modal="true" aria-labelledby="topic-modal-title" className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-surface shadow-2xl dark:shadow-none">
        <form onSubmit={save}>
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface/95 px-5 py-4 backdrop-blur-xl">
            <div>
              <h2 id="topic-modal-title" className="text-lg font-extrabold text-content">{topic ? 'Sửa chủ đề' : 'Tạo chủ đề mới'}</h2>
              <p className="mt-0.5 text-xs text-content-muted">Đặt tên, chọn biểu tượng và thêm các từ liên quan.</p>
            </div>
            <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl text-content-muted hover:bg-surface-hover" aria-label="Đóng"><X className="size-4" /></button>
          </header>

          <div className="space-y-5 p-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <label className="grid gap-2 text-sm font-bold text-content">Tên chủ đề <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="min-h-11 rounded-xl border border-line bg-surface-elevated px-3.5 font-medium outline-none focus:border-accent focus:ring-4 focus:ring-accent/10" placeholder="Ví dụ: Email công việc" /></label>
              <fieldset><legend className="mb-2 text-sm font-bold text-content">Biểu tượng</legend><div className="flex gap-2">{ICONS.map(({ id, label, Icon }) => <button key={id} type="button" title={label} aria-pressed={icon === id} onClick={() => setIcon(id)} className={`grid size-11 place-items-center rounded-xl border transition ${icon === id ? 'border-accent bg-accent/15 text-accent-strong' : 'border-line text-content-muted hover:bg-surface-hover'}`}><Icon className="size-5" /></button>)}</div></fieldset>
            </div>
            <label className="grid gap-2 text-sm font-bold text-content">Mô tả ngắn <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={180} rows={2} className="resize-none rounded-xl border border-line bg-surface-elevated px-3.5 py-3 font-medium outline-none focus:border-accent focus:ring-4 focus:ring-accent/10" placeholder="Nội dung bạn muốn luyện trong chủ đề này" /></label>

            <section className="rounded-2xl border border-line p-4">
              <h3 className="text-sm font-extrabold text-content">Chọn từ trong Tất cả từ vựng</h3>
              <label className="relative mt-3 block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-content-muted" /><input value={wordQuery} onChange={(e) => setWordQuery(e.target.value)} className="min-h-10 w-full rounded-xl bg-surface-elevated pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-accent/30" placeholder="Tìm từ hoặc nghĩa" /></label>
              <div className="mt-3 max-h-44 space-y-1 overflow-y-auto">{filteredWords.map((word) => { const selected = selectedWordIds.includes(word.id); return <label key={word.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-surface-hover"><input type="checkbox" className="sr-only" checked={selected} onChange={() => setSelectedWordIds((current) => selected ? current.filter((id) => id !== word.id) : [...current, word.id])} /><span className={`grid size-5 shrink-0 place-items-center rounded-md border ${selected ? 'border-accent bg-accent text-accent-contrast' : 'border-line'}`}>{selected && <Check className="size-3.5" />}</span><span className="min-w-0"><span className="block truncate text-sm font-bold text-content">{word.word}</span><span className="block truncate text-xs text-content-muted">{word.meaningVi}</span></span></label>; })}</div>
            </section>

            {!topic && <section className="rounded-2xl border border-line p-4"><h3 className="text-sm font-extrabold text-content">Hoặc thêm từ mới bằng AI</h3><div className="mt-3 flex gap-2"><input value={newWord} onChange={(e) => { setNewWord(e.target.value); setTranslation(null); }} className="min-h-10 min-w-0 flex-1 rounded-xl bg-surface-elevated px-3 text-sm outline-none focus:ring-2 focus:ring-accent/30" placeholder="Nhập từ hoặc cụm từ tiếng Anh" /><button type="button" onClick={() => void lookup()} disabled={lookupLoading || !newWord.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-content px-4 text-sm font-bold text-surface disabled:opacity-50">{lookupLoading ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Sparkles className="size-4" />} Tra AI</button></div>{translation && <div className="mt-3 rounded-xl bg-brand-50 p-3 dark:bg-brand-500/10"><p className="font-extrabold text-content">{translation.sourceText}</p><p className="mt-1 text-sm text-content-muted">{translation.translatedText}</p>{translation.examples[0] && <p className="mt-2 text-xs text-content-muted">{translation.examples[0].en}</p>}</div>}</section>}

            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
          </div>
          <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-line bg-surface/95 px-5 py-4 backdrop-blur-xl"><button type="button" onClick={onClose} className="btn-secondary">Huỷ</button><button type="submit" className="inline-flex min-h-11 items-center rounded-xl bg-accent px-5 text-sm font-extrabold text-accent-contrast active:scale-[.98]">{topic ? 'Lưu thay đổi' : 'Tạo chủ đề'}</button></footer>
        </form>
      </motion.div>
      </motion.div>
    </ModalPortal>
  );
};
