import {
  DictionaryDetailResult, DictionaryDetailSection, MockTestItem, Question,
  QuestionChoice, TestResultData, WordTranslation,
} from '../types';
import { API_BASE_URL } from './backend';
import { parseQuestionEvidence } from '../utils/evidence';


const getDynamicHost = () => {
  if (typeof window !== 'undefined' && window.location.hostname) {
    return window.location.hostname;
  }
  return '127.0.0.1';
};

export interface ApiTestSet {
  id: string;
  name: string;
  year: number;
  order_index: number;
}

export interface ApiTestItem {
  id: string;
  set_id: string;
  name: string;
  year: number;
  difficulty_level: number;
  audio_url?: string;
}

export const apiService = {
  async translateWord(word: string, context = '', signal?: AbortSignal): Promise<WordTranslation> {
    const res = await fetch(`${API_BASE_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        text: word,
        source_lang: 'en',
        target_lang: 'vi',
        context: context || 'TOEIC',
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.detail || 'Không thể kết nối dịch vụ Gemini.');
    }
    const data = await res.json();
    return {
      sourceText: data.source_text,
      translatedText: data.translated_text,
      phonetic: data.phonetic || '',
      partOfSpeech: data.part_of_speech || '',
      definitionEn: data.definition_en || '',
      examples: Array.isArray(data.examples) ? data.examples : [],
      synonyms: Array.isArray(data.synonyms) ? data.synonyms : [],
      cached: data.cached,
      aiSource: 'gemini',
    };
  },

  async translateWordDetail(
    word: string,
    section: DictionaryDetailSection,
    context = '',
    signal?: AbortSignal,
  ): Promise<DictionaryDetailResult> {
    const res = await fetch(`${API_BASE_URL}/translate/details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        text: word,
        section,
        source_lang: 'en',
        target_lang: 'vi',
        context: context || 'TOEIC',
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.detail || 'Không thể tải thêm dữ liệu từ Gemini.');
    }
    const data = await res.json();
    return {
      section,
      items: Array.isArray(data.items) ? data.items : [],
      aiSource: 'gemini',
    };
  },

  // 1. Get Test Sets
  async getTestSets(): Promise<ApiTestSet[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/test-sets`);
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
    } catch (e) {
      console.warn('[!] Server fallback for test-sets:', e);
    }
    return [];
  },

  // 2. Get Tests
  async getTests(setId?: string, year?: number): Promise<MockTestItem[]> {
    try {
      let url = `${API_BASE_URL}/tests`;
      const params = new URLSearchParams();
      if (setId) params.append('set_id', setId);
      if (year) params.append('year', year.toString());
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          return json.data.map((t: any) => ({
            id: t.id,
            title: t.name || `Đề Thi TOEIC ${t.year}`,
            year: Number(t.year),
            type: 'Full Test',
            totalQuestions: Number(t.total_questions || 0),
            durationMinutes: Math.round((
              Number(t.listening_duration_seconds || 0)
              + Number(t.reading_duration_seconds || 0)
            ) / 60),
            difficulty: t.difficulty_level >= 3 ? 'Khó' : t.difficulty_level === 2 ? 'Trung bình' : 'Dễ',
            attemptsCount: Number(t.attempts_count || 0),
            highestScore: t.highest_score == null ? undefined : Number(t.highest_score),
            completed: Boolean(t.completed),
          }));
        }
      }
    } catch (e) {
      console.warn('[!] Server fallback for tests:', e);
    }
    return [];
  },

  // 3. Get Full Test details & Questions
  async getFullTestQuestions(testId: string): Promise<Question[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/tests/${testId}/full`);
      if (res.ok) {
        const json = await res.json();
        const questionsList: Question[] = [];

        if (json.standalone_questions && Array.isArray(json.standalone_questions)) {
          json.standalone_questions.forEach((q: any) => {
            questionsList.push(formatQuestionObject(q));
          });
        }

        if (json.passages && Array.isArray(json.passages)) {
          json.passages.forEach((p: any) => {
            if (p.questions && Array.isArray(p.questions)) {
              p.questions.forEach((q: any) => {
              const formatted = formatQuestionObject(q);
              formatted.passageId = p.id;
              formatted.sharedGroupId = `passage:${p.id}`;
                const passageParts = [p.passage_text, p.passage_text_2, p.passage_text_3].filter(Boolean);
                if (!formatted.passageText && (passageParts.length > 0 || p.title)) {
                  formatted.passageText = passageParts.length > 0
                    ? passageParts.join('<hr class="passage-separator" />')
                    : p.title;
                }
                if (!formatted.passageTranslation && (p.dich_nghia || p.explanation_vi)) {
                  formatted.passageTranslation = p.dich_nghia || p.explanation_vi;
                }
                const sourcePassageParts = [p.passage_text, p.passage_text_2, p.passage_text_3];
                const translatedHtmlParts = [
                  p.passage_text_vi_html,
                  p.passage_text_2_vi_html,
                  p.passage_text_3_vi_html,
                ];
                const hasCompleteFormattedTranslation = sourcePassageParts.every(
                  (sourcePart: unknown, index: number) => !sourcePart || Boolean(translatedHtmlParts[index]),
                );
                if (
                  p.format_status === 'done'
                  && hasCompleteFormattedTranslation
                  && translatedHtmlParts.some(Boolean)
                ) {
                  formatted.passageTranslationHtml = translatedHtmlParts
                    .filter(Boolean)
                    .join('<hr class="passage-separator" />');
                }
                if (['pending', 'done', 'error'].includes(p.format_status)) {
                  formatted.passageTranslationFormatStatus = p.format_status;
                }
                if (!formatted.audioUrl && p.audio_url) {
                  formatted.audioUrl = formatAudioUrl(p.audio_url);
                }
                if (!formatted.transcript && p.transcript) {
                  formatted.transcript = p.transcript;
                }
                if (!formatted.imageUrl && p.image_url) {
                  formatted.imageUrl = formatGDriveDirectLink(p.image_url, true);
                }
                questionsList.push(formatted);
              });
            }
          });
        }

        if (questionsList.length > 0) {
          return questionsList.sort((a, b) => a.questionNumber - b.questionNumber);
        }
      }
    } catch (e) {
      console.warn(`[!] Server fallback for test ${testId}:`, e);
    }
    throw new Error('Không thể tải câu hỏi thật từ máy chủ.');
  },

  // 4. Submit Test Answers
  async submitTest(
    testId: string,
    answers: Record<string, string>,
    timeSpentSeconds: number,
    userId: string,
    selectedQuestions?: Question[],
  ): Promise<TestResultData> {
    try {
      const payloadAnswers = Object.entries(answers).map(([qId, selected]) => ({
        question_id: qId,
        selected_option: selected
      }));

      const res = await fetch(`${API_BASE_URL}/tests/${testId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          time_spent_seconds: timeSpentSeconds,
          answers: payloadAnswers
        })
      });

      if (res.ok) {
        const json = await res.json();
        const scopedQuestions = selectedQuestions || [];
        const selectedParts = [...new Set(scopedQuestions.map((question) => question.partId))]
          .sort((a, b) => a - b);
        const hasQuestionScope = scopedQuestions.length > 0;
        const correctAnswers = hasQuestionScope
          ? scopedQuestions.filter((question) => answers[question.id] === question.correctAnswer).length
          : Number(json.total_correct || 0);
        const answeredQuestions = hasQuestionScope
          ? scopedQuestions.filter((question) => Boolean(answers[question.id])).length
          : Object.keys(answers).length;
        const totalQuestions = hasQuestionScope ? scopedQuestions.length : 200;
        const isPartial = hasQuestionScope && selectedParts.length < 7;
        const partBreakdown = hasQuestionScope
          ? selectedParts.map((part) => {
            const partQuestions = scopedQuestions.filter((question) => question.partId === part);
            return {
              part: `Part ${part}`,
              correct: partQuestions.filter((question) => answers[question.id] === question.correctAnswer).length,
              total: partQuestions.length,
            };
          })
          : [
            { part: 'Listening', correct: json.listening_correct, total: 100 },
            { part: 'Reading', correct: json.reading_correct, total: 100 },
          ];
        
        return {
          attemptId: json.attempt_id,
          testId: json.test_id,
          testTitle: `Đề thi ${json.test_id}`,
          totalScore: isPartial ? 0 : json.total_score,
          listeningScore: json.listening_score,
          readingScore: json.reading_score,
          correctAnswers,
          wrongAnswers: Math.max(answeredQuestions - correctAnswers, 0),
          skippedAnswers: Math.max(totalQuestions - answeredQuestions, 0),
          timeSpentSeconds,
          accuracyRate: totalQuestions ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
          completedAt: new Date().toLocaleString(),
          partBreakdown,
          questionIds: hasQuestionScope ? scopedQuestions.map((question) => question.id) : undefined,
          selectedParts: hasQuestionScope ? selectedParts : undefined,
          isPartial,
        };
      }
      throw new Error('Không thể nộp bài thi. Vui lòng thử lại.');
    } catch (e) {
      console.warn('[!] Không thể nộp bài thi:', e);
      throw e instanceof Error
        ? e
        : new Error('Không thể nộp bài thi. Vui lòng thử lại.');
    }
  }
};

function formatAudioUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;

  // R2/custom-domain and other absolute media URLs can be used directly.
  if (/^https?:\/\//i.test(rawUrl) && !rawUrl.includes('drive.google.com')) {
    return rawUrl;
  }

  const host = getDynamicHost();

  // If rawUrl is relative path /media/... -> point to dynamic server media endpoint
  if (rawUrl.includes('/media/')) {
    const rel = rawUrl.split('/media/')[1];
    return `http://${host}:8000/media/${rel}`;
  }

  // If rawUrl contains Google Drive ID
  if (rawUrl.includes('id=')) {
    const fileId = rawUrl.split('id=')[1].split('&')[0];
    return `http://${host}:8000/api/v1/audio?id=${fileId}`;
  }

  return rawUrl;
}

function formatGDriveDirectLink(url?: string, isImage: boolean = false): string | undefined {
  if (!url) return undefined;
  
  if (/^https?:\/\//i.test(url) && !url.includes('drive.google.com')) {
    return url;
  }

  let fileId = '';
  if (url.includes('id=')) {
    fileId = url.split('id=')[1].split('&')[0];
  } else if (url.includes('/d/')) {
    fileId = url.split('/d/')[1].split('/')[0];
  }

  if (fileId) {
    if (isImage) {
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    } else {
      const host = getDynamicHost();
      return `http://${host}:8000/api/v1/audio?id=${fileId}`;
    }
  }

  return url;
}

function formatQuestionObject(q: any): Question {
  const part = q.part || 1;
  const downloadedExplanation = q.explanation_vi || q.dich_nghia || '';
  const choices: QuestionChoice[] = [
    { id: 'A', text: q.option_a || '(A)' },
    { id: 'B', text: q.option_b || '(B)' },
    { id: 'C', text: q.option_c || '(C)' }
  ];

  // TOEIC Part 2 only has 3 options (A, B, C). Other parts have 4 options (A, B, C, D).
  if (part !== 2) {
    choices.push({ id: 'D', text: q.option_d || '(D)' });
  }

  return {
    id: q.id,
    partId: part,
    questionNumber: q.question_number || 1,
    passageId: q.passage_id || undefined,
    sharedGroupId: q.group_id || q.audio_group_id || (q.passage_id ? `passage:${q.passage_id}` : undefined),
    audioUrl: formatAudioUrl(q.audio_url),
    imageUrl: formatGDriveDirectLink(q.image_url, true),
    passageText: q.passage_text || undefined,
    promptText: q.question_text || `Câu hỏi ${q.question_number}`,
    choices,
    correctAnswer: q.correct_answer || 'A',
    explanation: downloadedExplanation || 'Không có giải thích chi tiết.',
    evidence: parseQuestionEvidence(q.explanation_vi),
    transcript: q.transcript || undefined,
    passageTranslation: q.dich_nghia_html || q.dich_nghia || q.explanation_vi || undefined,
    passageTranslationHtml: q.format_status === 'done'
      ? q.passage_text_vi_html || undefined
      : undefined,
    passageTranslationFormatStatus: ['pending', 'done', 'error'].includes(q.format_status)
      ? q.format_status
      : undefined,
  };
}
