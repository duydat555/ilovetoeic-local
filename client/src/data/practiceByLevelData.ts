export type PracticeSkill = 'listening' | 'reading';

export interface PracticeLevelPart {
  part: number;
  skill: PracticeSkill;
  title: string;
  title_en?: string;
  description: string;
  description_en?: string;
  fallbackQuestionCounts: Record<number, number>;
}

// Fallback data keeps the independent page usable while the API is unavailable.
// Live database counts replace these values as soon as the request succeeds.
export const PRACTICE_LEVEL_PARTS: PracticeLevelPart[] = [
  {
    part: 1,
    skill: 'listening',
    title: 'Mô tả tranh',
    title_en: 'Photographs',
    description: 'Nghe bốn câu mô tả và chọn câu phù hợp nhất với hình ảnh.',
    description_en: 'Listen to four statements and choose the one that best describes the photograph.',
    fallbackQuestionCounts: { 1: 12, 2: 16, 3: 14, 4: 10, 5: 8 },
  },
  {
    part: 2,
    skill: 'listening',
    title: 'Hỏi và đáp',
    title_en: 'Question & Response',
    description: 'Nghe một câu hỏi hoặc phát biểu, sau đó chọn lời đáp phù hợp.',
    description_en: 'Listen to a question or statement, then choose the best response.',
    fallbackQuestionCounts: { 1: 18, 2: 22, 3: 20, 4: 15, 5: 11 },
  },
  {
    part: 3,
    skill: 'listening',
    title: 'Đoạn hội thoại ngắn',
    title_en: 'Conversations',
    description: 'Nghe hội thoại trong ngữ cảnh công việc và trả lời theo nhóm câu.',
    description_en: 'Listen to short conversations in work contexts and answer comprehension questions.',
    fallbackQuestionCounts: { 1: 15, 2: 18, 3: 15, 4: 12, 5: 9 },
  },
  {
    part: 4,
    skill: 'listening',
    title: 'Bài nói ngắn',
    title_en: 'Short Talks',
    description: 'Nghe thông báo, bài phát biểu hoặc tin nhắn và tìm thông tin chính.',
    description_en: 'Listen to talks, broadcasts, or messages and find the key details.',
    fallbackQuestionCounts: { 1: 14, 2: 17, 3: 15, 4: 12, 5: 9 },
  },
  {
    part: 5,
    skill: 'reading',
    title: 'Hoàn thành câu',
    title_en: 'Incomplete Sentences',
    description: 'Chọn từ hoặc cụm từ đúng để hoàn thiện câu về ngữ pháp và từ vựng.',
    description_en: 'Choose the best word or phrase to complete grammar and vocabulary sentences.',
    fallbackQuestionCounts: { 1: 24, 2: 28, 3: 25, 4: 20, 5: 16 },
  },
  {
    part: 6,
    skill: 'reading',
    title: 'Hoàn thành đoạn văn',
    title_en: 'Text Completion',
    description: 'Đọc đoạn văn và chọn đáp án phù hợp với mạch ý và ngữ cảnh.',
    description_en: 'Read passages and select the best options that fit the context.',
    fallbackQuestionCounts: { 1: 16, 2: 20, 3: 16, 4: 12, 5: 8 },
  },
  {
    part: 7,
    skill: 'reading',
    title: 'Đọc hiểu',
    title_en: 'Reading Comprehension',
    description: 'Đọc một hoặc nhiều văn bản để xác định chi tiết và suy luận.',
    description_en: 'Read single and multiple texts to identify specific details and inferences.',
    fallbackQuestionCounts: { 1: 20, 2: 24, 3: 21, 4: 16, 5: 12 },
  },
];

export const LEVEL_LABELS = ['Cơ bản', 'Dễ', 'Trung bình', 'Khó', 'Nâng cao'] as const;
export const LEVEL_LABELS_EN = ['Basic', 'Easy', 'Medium', 'Hard', 'Advanced'] as const;


