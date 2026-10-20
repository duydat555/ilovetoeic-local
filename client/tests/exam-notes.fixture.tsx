// Development-only UI fixture. All notes API calls use a local fake transport, no account data.
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ExamNotesWorkspace, ExamNotesButton, useExamNotes } from '../src/components/exam-notes/ExamNotesWorkspace';
import { ExamAnnotationPassage } from '../src/components/exam-annotations/ExamAnnotationPassage';
import { useReviewMarks } from '../src/components/exam-annotations/useReviewMarks';
import { QuestionDrawer } from '../src/components/common/QuestionDrawer';
import { QuestionSaveButton } from '../src/components/common/QuestionSaveButton';
import { useSavedQuestions } from '../src/hooks/useSavedQuestions';
import type { Question } from '../src/types';
import '../src/index.css';

const nativeFetch = window.fetch;
window.fetch = async (input, options) => {
  const url = new URL(String(input), location.href);
  if (url.pathname.endsWith('/exam-notes')) {
    if (options?.method !== 'PUT' && new URLSearchParams(location.search).has('offline-notes')) return Response.json({ detail: 'fixture offline' }, { status: 503 });
    const data = JSON.parse(localStorage.getItem('notes.fixture.remote') || '{}');
    if (options?.method === 'PUT') {
      const body = JSON.parse(String(options.body)), key = JSON.stringify([body.group, body.questionId]);
      const before = data[key];
      if ((before?.revision || 0) !== body.baseRevision) return Response.json({ detail: 'conflict' }, { status: 409 });
      data[key] = { ...body, revision: body.baseRevision + 1 }; localStorage.setItem('notes.fixture.remote', JSON.stringify(data));
      return Response.json({ revision: body.baseRevision + 1, document: body.document });
    }
    return Response.json({ notes: Object.values(data).filter((v: any) => v.group === url.searchParams.get('group')) });
  }
  if (url.pathname.endsWith('/exam-annotations') || url.pathname.endsWith('/exam-annotations/review-status')) {
    if (new URLSearchParams(location.search).has('offline-annotations')) return Response.json({ detail: 'fixture offline' }, { status: 503 });
    const records = JSON.parse(localStorage.getItem('annotation.fixture.remote') || '{}');
    const body = options?.body ? JSON.parse(String(options.body)) : null;
    if (url.pathname.endsWith('/review-status')) return Response.json({ groups: body.groups.map((group: string) => {
      const item = records[JSON.stringify([body.scope, group])]; return { group, review: !!item?.document.review, revision: item?.revision || 0 };
    }) });
    const key = JSON.stringify([body?.scope || url.searchParams.get('scope'), body?.group || url.searchParams.get('group')]);
    if (options?.method === 'PUT') {
      const revision = records[key]?.revision || 0;
      if (revision !== body.baseRevision) return Response.json({ detail: 'conflict' }, { status: 409 });
      records[key] = { document: body.document, revision: revision + 1 }; localStorage.setItem('annotation.fixture.remote', JSON.stringify(records));
      return Response.json({ revision: revision + 1 });
    }
    return Response.json(records[key] || { document: null, revision: 0 });
  }
  return nativeFetch(input, options);
};
function NotesPreview() {
  const notes = useExamNotes();
  const opened = useRef(false);
  useEffect(() => {
    if (notes && !opened.current && new URLSearchParams(location.search).has('notes')) {
      opened.current = true;
      notes.dispatch({ type: 'toggle' });
    }
  }, [notes]);
  return null;
}
function Fixture() {
  const scrollTest = new URLSearchParams(location.search).has('scroll');
  const [group, setGroup] = useState(0);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [navigatorMounted, setNavigatorMounted] = useState(true);
  const [userId, setUserId] = useState('notes-fixture');
  const audit = new URLSearchParams(location.search).has('audit');
  const { savedQuestions, toggleSavedQuestion } = useSavedQuestions(userId, 'toeic');
  const allQuestions: Question[] = Array.from({ length: 8 }, (_, i) => ({ id: `review-fixture-q${139 + i}`, questionNumber: 139 + i, partId: 6, choices: [], correctAnswer: 'A', explanation: '' }));
  const groups = [{ questions: allQuestions.slice(0, 4) }, { questions: allQuestions.slice(4) }];
  const questions = groups[group].questions;
  const reviews = useReviewMarks(userId, 'exam:review-fixture', groups, navigatorOpen);
  return <ExamNotesWorkspace userId={userId} scope="test:fixture" title="Test 1" questions={questions}>
    <NotesPreview />
    <div className="h-full bg-slate-100 p-4" style={scrollTest ? { height: 'calc(100dvh - 40px)', overflowY: 'auto' } : undefined}><header className="mb-4 flex items-center justify-between"><h1>Kiểm tra panel ghi chú</h1><ExamNotesButton /></header>
      <button className="btn-secondary mb-5" onClick={() => setGroup(v => 1 - v)}>Đổi nhóm câu</button>
      <button className="btn-secondary mb-5" onClick={() => setNavigatorOpen(true)}>Danh sách câu hỏi</button>
      {audit && <div className="mb-4 flex flex-wrap gap-2" aria-label="Kiểm thử câu đã lưu">
        <span>Câu {questions[0].questionNumber}</span><QuestionSaveButton saved={!!savedQuestions[questions[0].id]} onToggle={() => toggleSavedQuestion(questions[0].id)} />
        <button onClick={() => setUserId(v => v === 'notes-fixture' ? 'notes-fixture-other' : 'notes-fixture')}>Đổi tài khoản kiểm thử</button>
        <button onClick={() => setNavigatorMounted(v => !v)}>Gỡ danh sách kiểm thử</button>
      </div>}
      {navigatorMounted && <QuestionDrawer isOpen={navigatorOpen} onClose={() => setNavigatorOpen(false)} questions={allQuestions} currentQuestionIds={questions.map(q => q.id)} onSelectQuestion={i => setGroup(i < 4 ? 0 : 1)} userAnswers={audit ? { 'outside-fixture': 'A' } : {}} flaggedQuestions={savedQuestions} reviewedQuestionIds={reviews.reviewedQuestionIds} reviewLoading={reviews.loading} reviewError={reviews.error} onRetryReviews={reviews.retry} />}
      <ExamAnnotationPassage userId={userId} scope="exam:review-fixture" group={questions.map(q => q.id).join(':')} progress={`${group + 1}/2`} html={'<p>Đoạn văn minh hoạ để kiểm tra bố cục. Chọn ghi chú ở toolbar để mở cùng panel.</p>'.repeat(scrollTest ? 45 : 1)} fallback={<p>Đoạn văn minh hoạ.</p>} />
    </div>
  </ExamNotesWorkspace>;
}
const fixtureRoot = createRoot(document.getElementById('root')!);
fixtureRoot.render(<React.StrictMode><Fixture /></React.StrictMode>);
if (import.meta.hot) import.meta.hot.dispose(() => fixtureRoot.unmount());
