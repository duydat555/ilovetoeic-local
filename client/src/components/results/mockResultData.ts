import { Question } from '../../types';

export interface TestResultHistoryItem {
  id: string;
  testId: string;
  testTitle?: string;
  testName?: string;
  mode: 'practice' | 'exam';
  completedAt: string;
  isPartial: boolean;
  selectedParts: number[];
  questionIds: string[];
  answers: Record<string, string>;
  correctAnswers: number;
  wrongAnswers: number;
  skippedAnswers: number;
  accuracyRate: number;
  listeningScore?: number;
  readingScore?: number;
  totalScore?: number;
  partBreakdown: { part: string; correct: number; total: number }[];
}

/**
 * MẪU DỮ LIỆU MẪU 1: Toàn bộ đề thi (200 câu Listening + Reading)
 */
export const mockFullTestResult: TestResultHistoryItem = {
  id: 'attempt-full-001',
  testId: 'test-economy-05',
  testTitle: 'Test 5',
  testName: 'Test 5',
  mode: 'exam',
  completedAt: '2026-08-06 20:30',
  isPartial: false,
  selectedParts: [1, 2, 3, 4, 5, 6, 7],
  questionIds: Array.from({ length: 200 }, (_, i) => `q-full-${i + 1}`),
  answers: {
    'q-full-1': 'A',
    'q-full-2': 'B',
    'q-full-3': 'C',
    'q-full-10': 'A',
  },
  correctAnswers: 160,
  wrongAnswers: 30,
  skippedAnswers: 10,
  accuracyRate: 80,
  listeningScore: 410,
  readingScore: 370,
  totalScore: 780,
  partBreakdown: [
    { part: 'Part 1', correct: 5, total: 6 },
    { part: 'Part 2', correct: 20, total: 25 },
    { part: 'Part 3', correct: 30, total: 39 },
    { part: 'Part 4', correct: 24, total: 30 },
    { part: 'Part 5', correct: 25, total: 30 },
    { part: 'Part 6', correct: 12, total: 16 },
    { part: 'Part 7', correct: 44, total: 54 },
  ],
};

/**
 * MẪU DỮ LIỆU MẪU 2: Chỉ 1 Kỹ năng (Chỉ thi Listening - 100 câu)
 */
export const mockListeningOnlyResult: TestResultHistoryItem = {
  id: 'attempt-listening-002',
  testId: 'test-economy-05',
  testTitle: 'Test 5',
  testName: 'Test 5',
  mode: 'exam',
  completedAt: '2026-08-06 21:15',
  isPartial: true,
  selectedParts: [1, 2, 3, 4],
  questionIds: Array.from({ length: 100 }, (_, i) => `q-lis-${i + 1}`),
  answers: {
    'q-lis-1': 'A',
    'q-lis-2': 'C',
  },
  correctAnswers: 85,
  wrongAnswers: 12,
  skippedAnswers: 3,
  accuracyRate: 85,
  partBreakdown: [
    { part: 'Part 1', correct: 6, total: 6 },
    { part: 'Part 2', correct: 22, total: 25 },
    { part: 'Part 3', correct: 33, total: 39 },
    { part: 'Part 4', correct: 24, total: 30 },
  ],
};

/**
 * MẪU DỮ LIỆU MẪU 3: Chỉ 1 hoặc nhiều Part cụ thể (Ví dụ: Chỉ thi Part 2 - 25 câu)
 */
export const mockPart2OnlyResult: TestResultHistoryItem = {
  id: 'attempt-part2-003',
  testId: 'ad780150-f675-42b9-8ced-246862b0d0a8',
  testTitle: 'Đề thi ad780150-f675-42b9-8ced-246862b0d0a8',
  testName: 'Test 5',
  mode: 'exam',
  completedAt: '2026-08-06 22:00',
  isPartial: true,
  selectedParts: [2],
  questionIds: Array.from({ length: 25 }, (_, i) => `q-p2-${i + 1}`),
  answers: {
    'q-p2-1': 'B',
    'q-p2-2': 'A',
  },
  correctAnswers: 20,
  wrongAnswers: 4,
  skippedAnswers: 1,
  accuracyRate: 80,
  partBreakdown: [
    { part: 'Part 2', correct: 20, total: 25 },
  ],
};

/**
 * Dữ liệu xem lại câu hỏi mẫu cho Part 2 & Part 5
 */
export const mockSampleQuestions: Question[] = [
  {
    id: 'q-sample-10',
    partId: 2,
    questionNumber: 10,
    promptText: 'Who sent the meeting minutes to the accounting department?',
    choices: [
      { id: 'A', text: 'Our office assistant.' },
      { id: 'B', text: 'They have a savings account.' },
      { id: 'C', text: 'Cash and credit cards.' },
    ],
    correctAnswer: 'A',
    explanation: 'Đáp án (A) đúng vì Who hỏi người chỉ danh tính, Our office assistant câu trả lời chính xác.',
    questionTranslation: 'Ai đã gửi biên bản cuộc họp cho phòng kế toán?',
    optionsTranslation: 'Ai đã gửi biên bản cuộc họp cho phòng kế toán?\n(A) Trợ lý văn phòng của chúng tôi.\n(B) Họ có một tài khoản tiết kiệm.\n(C) Tiền mặt và thẻ tín dụng.',
    optionsTranslationItems: [
      { choiceId: 'A', rawText: 'Trợ lý văn phòng của chúng tôi.', meaning: 'Trợ lý văn phòng của chúng tôi.' },
      { choiceId: 'B', rawText: 'Họ có một tài khoản tiết kiệm.', meaning: 'Họ có một tài khoản tiết kiệm.' },
      { choiceId: 'C', rawText: 'Tiền mặt và thẻ tín dụng.', meaning: 'Tiền mặt và thẻ tín dụng.' },
    ],
    keyVocabulary: [
      { word: 'meeting minutes', meaning: 'biên bản cuộc họp' },
      { word: 'accounting department', meaning: 'phòng kế toán' },
      { word: 'office assistant', meaning: 'trợ lý văn phòng' },
    ],
  },
  {
    id: 'q-sample-101',
    partId: 5,
    questionNumber: 101,
    promptText: 'Ms. Jenkins was ________ to senior director following the remarkable quarterly revenue growth.',
    choices: [
      { id: 'A', text: 'promoted' },
      { id: 'B', text: 'promoting' },
      { id: 'C', text: 'promotion' },
      { id: 'D', text: 'promotes' },
    ],
    correctAnswer: 'A',
    explanation: 'Cần một quá khứ phân từ dạng bị động (was promoted) đằng sau động từ to be "was".',
    questionTranslation: 'Cô Jenkins đã được thăng chức lên giám đốc cao cấp sau sự tăng trưởng doanh thu quý đáng kinh ngạc.',
    optionsTranslationItems: [
      { choiceId: 'A', rawText: 'được thăng chức (V-ed)', meaning: 'được thăng chức (V-ed)' },
      { choiceId: 'B', rawText: 'đang thăng chức (V-ing)', meaning: 'đang thăng chức (V-ing)' },
      { choiceId: 'C', rawText: 'sự thăng chức (N)', meaning: 'sự thăng chức (N)' },
      { choiceId: 'D', rawText: 'thăng chức (V-s)', meaning: 'thăng chức (V-s)' },
    ],
    keyVocabulary: [
      { word: 'promoted', meaning: 'được thăng chức' },
      { word: 'revenue growth', meaning: 'tăng trưởng doanh thu' },
      { word: 'senior director', meaning: 'giám đốc cao cấp' },
    ],
  },
];
