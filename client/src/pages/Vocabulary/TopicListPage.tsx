import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Briefcase, LibraryBig, MoreHorizontal, Plus, Search, Sparkles, TrendingUp, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { CreateTopicModal } from '../../components/vocabulary/CreateTopicModal';
import { getModalMotion } from '../../components/common/modalMotion';
import { ModalPortal } from '../../components/common/ModalPortal';
import { useAuth } from '../../context/AuthContext';
import { vocabularyService } from '../../services/vocabulary';
import { vocabularyTopicService, VocabularyTopic } from '../../services/vocabularyTopics';
import type { VocabularyWord } from '../../types';

const TopicIcon = ({ name }: { name: string }) => {
  const Icon = name === 'chart' ? TrendingUp : name === 'sparkles' ? Sparkles : Briefcase;
  return <Icon className="size-5" aria-hidden="true" />;
};

const ConfirmModal = ({ title, description, children, onClose, onConfirm }: { title: string; description: string; children?: React.ReactNode; onClose: () => void; onConfirm: () => void }) => {
  const reduceMotion = useReducedMotion();
  const contract = getModalMotion(reduceMotion);
  useEffect(() => { const handler = (event: KeyboardEvent) => event.key === 'Escape' && onClose(); window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, [onClose]);
  return <ModalPortal><motion.div {...contract.backdrop} className="fixed inset-0 z-[100] grid h-[100dvh] w-screen place-items-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><motion.div {...contract.panel} role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-2xl dark:shadow-none"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-extrabold text-content">{title}</h2><p className="mt-2 text-sm leading-relaxed text-content-muted">{description}</p></div><button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-xl hover:bg-surface-hover" aria-label="Đóng"><X className="size-4" /></button></div>{children}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="btn-secondary">Huỷ</button><button type="button" onClick={onConfirm} className="min-h-11 rounded-xl bg-red-600 px-4 text-sm font-extrabold text-white active:scale-[.98]">Xác nhận</button></div></motion.div></motion.div></ModalPortal>;
};

export const TopicListPage: React.FC = () => {
  const { user } = useAuth();
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [topics, setTopics] = useState<VocabularyTopic[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VocabularyTopic | null>(null);
  const [menuId, setMenuId] = useState('');
  const [deleting, setDeleting] = useState<VocabularyTopic | null>(null);
  const [merging, setMerging] = useState<VocabularyTopic | null>(null);
  const [mergeTarget, setMergeTarget] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setTopics(vocabularyTopicService.getTopics(user.id));
    setWords(await vocabularyService.getAll(user.id));
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);
  if (!user) return null;

  const memberships = vocabularyTopicService.getMemberships(user.id);
  const normalized = query.trim().toLocaleLowerCase('vi');
  const visibleTopics = topics.filter((topic) => !normalized || `${topic.name} ${topic.description}`.toLocaleLowerCase('vi').includes(normalized));
  const systemTopics = visibleTopics.filter((topic) => topic.system);
  const personalTopics = visibleTopics.filter((topic) => !topic.system);
  const topicStats = (topic: VocabularyTopic) => {
    const ids = new Set(memberships[topic.id] || []);
    const topicWords = words.filter((word) => ids.has(word.id));
    return { total: topicWords.length, remembered: topicWords.filter((word) => word.remembered).length };
  };

  const TopicCard = ({ topic }: { topic: VocabularyTopic }) => {
    const stats = topicStats(topic);
    const percent = stats.total ? Math.round((stats.remembered / stats.total) * 100) : 0;
    return <article className="group relative rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md motion-reduce:hover:translate-y-0 dark:shadow-none"><Link to={`/vocabulary/${topic.id}`} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><div className="flex items-start justify-between gap-4"><span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"><TopicIcon name={topic.icon} /></span><div className="grid size-12 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(rgb(245 158 11) ${percent}%, rgb(226 232 240) 0)` }}><span className="grid size-10 place-items-center rounded-full bg-surface text-xs font-extrabold text-content">{percent}%</span></div></div><h3 className="mt-4 truncate pr-8 text-base font-extrabold text-content">{topic.name}</h3><p className="mt-1 line-clamp-2 min-h-10 text-sm leading-relaxed text-content-muted">{topic.description || 'Chủ đề từ vựng cá nhân.'}</p><div className="mt-4 flex items-center justify-between text-xs font-bold text-content-muted"><span>{stats.total} từ</span><span>{stats.remembered}/{stats.total} từ đã thuộc</span></div></Link>{!topic.system && <div className="absolute right-3 top-[76px]"><button type="button" onClick={() => setMenuId(menuId === topic.id ? '' : topic.id)} className="grid size-8 place-items-center rounded-lg text-content-muted hover:bg-surface-hover" aria-label={`Quản lý ${topic.name}`}><MoreHorizontal className="size-4" /></button>{menuId === topic.id && <div className="absolute right-0 top-9 z-20 w-36 rounded-xl border border-line bg-surface p-1.5 shadow-xl"><button type="button" onClick={() => { setEditing(topic); setModalOpen(true); setMenuId(''); }} className="w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-content hover:bg-surface-hover">Sửa chủ đề</button><button type="button" onClick={() => { setMerging(topic); setMenuId(''); }} className="w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-content hover:bg-surface-hover">Gộp chủ đề</button><button type="button" onClick={() => { setDeleting(topic); setMenuId(''); }} className="w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">Xoá chủ đề</button></div>}</div>}</article>;
  };

  return <div className="space-y-7 pb-10"><header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-extrabold tracking-tight text-content sm:text-3xl">Từ vựng Flashcard</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-content-muted">Chọn một chủ đề để học tập trung hoặc mở toàn bộ kho từ của bạn.</p></div><Link to="/vocabulary/all" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-extrabold text-content hover:border-accent/50 hover:bg-accent/10"><LibraryBig className="size-4" /> Tất cả từ vựng</Link></header>
    <label className="relative block max-w-lg"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-content-muted" /><input value={query} onChange={(e) => setQuery(e.target.value)} className="min-h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-4 text-sm text-content outline-none focus:border-accent focus:ring-4 focus:ring-accent/10" placeholder="Tìm theo tên chủ đề" /><span className="sr-only">Tìm chủ đề</span></label>
    {loading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1,2,3,4,5,6].map((id) => <BoneyardSkeleton key={id} name={`topic-card-${id}`} variant="card" />)}</div> : <><section><h2 className="mb-3 text-sm font-extrabold text-content">Chủ đề của tôi</h2><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"><button type="button" onClick={() => { setEditing(null); setModalOpen(true); }} className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-accent/60 bg-accent/5 p-5 text-center text-accent-strong transition hover:bg-accent/10 active:scale-[.99]"><span><span className="mx-auto grid size-12 place-items-center rounded-full bg-accent text-accent-contrast"><Plus className="size-5" /></span><span className="mt-3 block text-sm font-extrabold">Tạo chủ đề mới</span></span></button>{personalTopics.map((topic) => <TopicCard key={topic.id} topic={topic} />)}</div>{personalTopics.length === 0 && query && <p className="mt-3 text-sm text-content-muted">Không tìm thấy chủ đề cá nhân phù hợp.</p>}</section><section><h2 className="mb-3 text-sm font-extrabold text-content">Chủ đề hệ thống</h2><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{systemTopics.map((topic) => <TopicCard key={topic.id} topic={topic} />)}</div></section></>}
    <AnimatePresence>{modalOpen && <CreateTopicModal userId={user.id} words={words} topic={editing} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); setTopics(vocabularyTopicService.getTopics(user.id)); void load(); }} />}{deleting && <ConfirmModal title="Xoá chủ đề?" description={`Chủ đề “${deleting.name}” sẽ bị xoá. Các từ bên trong vẫn được giữ trong Tất cả từ vựng.`} onClose={() => setDeleting(null)} onConfirm={() => { vocabularyTopicService.remove(user.id, deleting.id); setDeleting(null); setTopics(vocabularyTopicService.getTopics(user.id)); }} />}{merging && <ConfirmModal title="Gộp chủ đề" description={`Chọn chủ đề nhận toàn bộ từ của “${merging.name}”. Chủ đề hiện tại sẽ bị xoá sau khi gộp.`} onClose={() => setMerging(null)} onConfirm={() => { if (!mergeTarget) return; vocabularyTopicService.merge(user.id, merging.id, mergeTarget); setMerging(null); setMergeTarget(''); setTopics(vocabularyTopicService.getTopics(user.id)); }}><select value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)} className="mt-4 min-h-11 w-full rounded-xl border border-line bg-surface-elevated px-3 text-sm text-content outline-none focus:border-accent"><option value="">Chọn chủ đề đích</option>{topics.filter((topic) => topic.id !== merging.id).map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></ConfirmModal>}</AnimatePresence>
  </div>;
};
