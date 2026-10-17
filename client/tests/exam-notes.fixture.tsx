// Development-only UI fixture. All notes API calls use a local fake transport, no account data.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ExamNotesWorkspace, ExamNotesButton } from '../src/components/exam-notes/ExamNotesWorkspace';
import { ExamAnnotationPassage } from '../src/components/exam-annotations/ExamAnnotationPassage';
import '../src/index.css';

const nativeFetch = window.fetch;
window.fetch = async (input, options) => {
  const url = new URL(String(input), location.href);
  if (url.pathname.endsWith('/exam-notes')) {
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
  if (url.pathname.endsWith('/exam-annotations')) return Response.json({ document: null, revision: 0 });
  return nativeFetch(input, options);
};
function Fixture() {
  const [group, setGroup] = useState(0);
  const questions = [139, 140, 141, 142].map(n => ({ id: `fixture-q${n + group * 4}`, questionNumber: n + group * 4, partId: 6 }));
  return <ExamNotesWorkspace userId="notes-fixture" scope="test:fixture" title="Test 1" questions={questions}>
    <div className="h-full bg-slate-100 p-4"><header className="mb-4 flex items-center justify-between"><h1>Kiểm tra panel ghi chú</h1><ExamNotesButton /></header>
      <button className="btn-secondary mb-5" onClick={() => setGroup(v => 1 - v)}>Đổi nhóm câu</button>
      <ExamAnnotationPassage userId="notes-fixture" scope="exam:fixture" group={questions.map(q => q.id).join(':')} progress="1/2" html="<p>Đoạn văn minh hoạ để kiểm tra bố cục. Chọn ghi chú ở toolbar để mở cùng panel.</p>" fallback={<p>Đoạn văn minh hoạ.</p>} />
    </div>
  </ExamNotesWorkspace>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Fixture /></React.StrictMode>);
