import { PassageFormatStatus, Question, StructuredSentencePair } from '../types';

export interface PracticeGroup {
  id: string;
  partId: number;
  questions: Question[];
  passageId?: string;
  audioUrl?: string;
  imageUrl?: string;
  passageText?: string;
  passageTranslation?: string;
  passageTranslationHtml?: string;
  passageTranslationFormatStatus?: PassageFormatStatus;
  passageSentencePairs?: StructuredSentencePair[];
  transcript?: string;
  keyVocabulary?: { word: string; meaning: string }[];
}

const normalizeSharedContent = (value?: string) =>
  value?.replace(/\s+/g, ' ').trim().toLowerCase();

const mergeKeyVocab = (
  existing?: { word: string; meaning: string }[],
  incoming?: { word: string; meaning: string }[],
) => {
  if (!incoming || incoming.length === 0) return existing;
  if (!existing || existing.length === 0) return incoming;
  const seen = new Set(existing.map((v) => v.word.toLowerCase()));
  const merged = [...existing];
  for (const item of incoming) {
    if (!seen.has(item.word.toLowerCase())) {
      seen.add(item.word.toLowerCase());
      merged.push(item);
    }
  }
  return merged;
};

const getSharedKey = (question: Question) => {
  // Passage identity is the strongest grouping signal. Some imported sources
  // assign a unique group_id to each question even when passage_id is shared.
  if (question.passageId) return `passage:${question.passageId}`;
  if (question.sharedGroupId) return question.sharedGroupId;

  const passage = normalizeSharedContent(question.passageText);
  if (passage) return `passage-text:${passage}`;

  // Parts 3 and 4 conventionally contain three questions for one recording.
  if ((question.partId === 3 || question.partId === 4) && question.audioUrl) {
    return `audio:${question.audioUrl}`;
  }

  return `question:${question.id}`;
};

export const buildPracticeGroups = (questions: Question[]): PracticeGroup[] => {
  const sorted = [...questions].sort((a, b) => a.questionNumber - b.questionNumber);
  const groups: PracticeGroup[] = [];

  for (const question of sorted) {
    const key = getSharedKey(question);
    const previous = groups[groups.length - 1];
    const audioOnlyGroup = key.startsWith('audio:');
    const canJoinPrevious =
      previous?.id === key &&
      (!audioOnlyGroup || previous.questions.length < 3);

    if (previous && canJoinPrevious) {
      previous.questions.push(question);
      previous.passageId ||= question.passageId;
      previous.audioUrl ||= question.audioUrl;
      previous.imageUrl ||= question.imageUrl;
      previous.passageText ||= question.passageText;
      previous.passageTranslation ||= question.passageTranslation;
      previous.passageTranslationHtml ||= question.passageTranslationHtml;
      previous.passageTranslationFormatStatus ||= question.passageTranslationFormatStatus;
      previous.passageSentencePairs ||= question.passageSentencePairs;
      previous.transcript ||= question.transcript;
      previous.keyVocabulary = mergeKeyVocab(previous.keyVocabulary, question.keyVocabulary);
      continue;
    }

    groups.push({
      id: audioOnlyGroup && previous?.id === key ? `${key}:${groups.length}` : key,
      partId: question.partId,
      questions: [question],
      passageId: question.passageId,
      audioUrl: question.audioUrl,
      imageUrl: question.imageUrl,
      passageText: question.passageText,
      passageTranslation: question.passageTranslation,
      passageTranslationHtml: question.passageTranslationHtml,
      passageTranslationFormatStatus: question.passageTranslationFormatStatus,
      passageSentencePairs: question.passageSentencePairs,
      transcript: question.transcript,
      keyVocabulary: question.keyVocabulary,
    });
  }

  return groups;
};

export const stripChoicePrefix = (text: string, letter: string) => {
  const escapedLetter = letter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // A bare "A " is usually the English article ("A man", "A notice"), not
  // an option label. Only remove labels that have explicit punctuation.
  const explicitLabel = new RegExp(
    `^\\s*(?:\\(${escapedLetter}\\)|${escapedLetter}[.):-]|${escapedLetter}\\s+-)\\s*`,
    'i',
  );
  return text.replace(explicitLabel, '').trim();
};

export const formatExplanationText = (text: string) => {
  const parenthesizedLabels = text.match(/\([A-D]\)(?=\s|$)/gi) ?? [];
  const distinctLabels = new Set(parenthesizedLabels.map((label) => label.toUpperCase()));

  // Only reflow actual option lists (Part 2 has three choices). This avoids
  // breaking normal prose that merely references one or two answer labels.
  if (distinctLabels.size < 3) return text.trim();

  return text
    .replace(
      /(^|[ \t]+)(\([A-D]\))(?=[ \t]|$)/gim,
      (_match, prefix: string, label: string) => `${prefix ? '\n' : ''}${label.toUpperCase()}`,
    )
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * Trích xuất chỉ phần dịch nghĩa câu hỏi, loại bỏ phần dịch nghĩa phương án đáp án (nếu trùng trong dich_nghia)
 * Ví dụ: "Hội nghị được tổ chức ở đâu? (A) Một kỳ nghỉ... (B)..." -> "Hội nghị được tổ chức ở đâu?"
 */
export const cleanQuestionTranslation = (text: string | undefined | null): string => {
  if (!text) return '';
  const trimmed = text.trim();

  // Khớp chính xác nhãn phương án như (A) hoặc (B), A. B. kể cả khi nằm ở dòng tiếp theo
  const optionMatch = trimmed.match(/(?:\([A-D]\)|(?:^|\n)\s*[A-D][\.\:\s])/);
  if (optionMatch && optionMatch.index !== undefined && optionMatch.index > 0) {
    return trimmed.slice(0, optionMatch.index).trim().replace(/[\:\-\|\s]+$/, '');
  }

  return trimmed;
};

/**
 * Lấy phần dịch nghĩa cho riêng câu hỏi (không bao giờ lấy passageTranslation vì
 * passageTranslation = bản dịch đoạn văn dùng cho nút "Xem bản dịch" bên trái,
 * còn questionTranslation = bản dịch câu hỏi + phương án hiển thị bên phải)
 */
export const getEffectiveQuestionTranslation = (question: Question): string => {
  return cleanQuestionTranslation(question.questionTranslation);
};

const LISTENING_INSTRUCTION = 'Nghe và chọn phương án phù hợp nhất.';

/**
 * Part 2 hides the spoken prompt until the learner checks the answer. Some
 * imported records have no English question_text, so use the available
 * Vietnamese question translation instead of silently rendering a generic
 * placeholder. A real English prompt always remains the first choice.
 */
export const getPracticeQuestionTitle = (question: Question, isChecked: boolean): string => {
  if (question.partId === 2 && !isChecked) return LISTENING_INSTRUCTION;

  const prompt = question.promptText?.trim();
  if (prompt) return prompt;

  if (question.partId === 2 && isChecked) {
    const translatedPrompt = getEffectiveQuestionTranslation(question);
    if (translatedPrompt) return `Bản dịch câu hỏi: ${translatedPrompt}`;
    return 'Câu hỏi tiếng Anh chưa có transcript trong dữ liệu.';
  }

  return question.partId <= 2 ? LISTENING_INSTRUCTION : 'Chọn đáp án đúng.';
};

export const cleanLaTeXSymbols = (text: string | undefined | null): string => {
  if (!text) return '';
  return text
    .replace(/\$\s*\\(?:implies|Longrightarrow|Rightarrow)\s*\$/gi, '⇒')
    .replace(/\\(?:implies|Longrightarrow|Rightarrow)/gi, '⇒')
    .replace(/\$\s*\\(?:rightarrow|to)\s*\$/gi, '→')
    .replace(/\\(?:rightarrow|to)/gi, '→')
    .replace(/\$\s*\\(?:iff|LongLeftrightarrow|Leftrightarrow)\s*\$/gi, '⇔')
    .replace(/\\(?:iff|LongLeftrightarrow|Leftrightarrow)/gi, '⇔')
    .replace(/\$\s*\\approx\s*\$/gi, '≈')
    .replace(/\\approx/gi, '≈')
    .replace(/\$\s*\\equiv\s*\$/gi, '≡')
    .replace(/\\equiv/gi, '≡')
    .replace(/\$\s*\\(?:le|leq)\s*\$/gi, '≤')
    .replace(/\\(?:le|leq)/gi, '≤')
    .replace(/\$\s*\\(?:ge|geq)\s*\$/gi, '≥')
    .replace(/\\(?:ge|geq)/gi, '≥')
    .replace(/\$\s*\\neq\s*\$/gi, '≠')
    .replace(/\\neq/gi, '≠')
    .replace(/\$\s*\\dots\s*\$/gi, '...')
    .replace(/\\dots/gi, '...');
};

/**
 * Làm sạch văn bản giải thích, loại bỏ phần lặp lại câu hỏi dịch nghĩa và phương án đáp án ở đầu
 */
export const cleanExplanationText = (text: string | undefined | null): string => {
  if (!text) return '';
  let cleaned = cleanLaTeXSymbols(text).trim();
  if (!cleaned) return '';

  const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);
  let startIndex = 0;
  let hasChoicesHeader = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isChoiceLine = /^\(?([A-D])\)?[\.\:\s]/i.test(line);

    if (isChoiceLine) {
      hasChoicesHeader = true;
      startIndex = i + 1;
    } else if (hasChoicesHeader) {
      break;
    } else if (i === 0 && (line.endsWith('?') || line.toLowerCase().includes('dịch') || line.toLowerCase().includes('câu hỏi'))) {
      startIndex = i + 1;
    }
  }

  if (startIndex > 0) {
    if (startIndex < lines.length) {
      cleaned = lines.slice(startIndex).join('\n').trim();
    } else {
      // Toàn bộ đoạn văn bản giải thích chỉ chứa câu dịch hỏi và phương án đáp án dính kèm -> trả về rỗng để không bị lặp
      return '';
    }
  }

  return formatExplanationText(cleaned);
};

/**
 * Làm sạch khoảng trắng và các dòng trống thừa trùng lặp trong transcript / bản dịch transcript
 */
export const cleanTranscriptSpacing = (text?: string | null): string => {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/<p>\s*(?:<br\s*\/?>|&nbsp;|\s*)*<\/p>/gi, '')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
};

/**
 * Trả về chuỗi bản dịch câu hỏi nếu bản dịch đó thực sự là câu hỏi riêng biệt.
 * Nếu bản dịch câu hỏi chứa các ký hiệu lựa chọn (A), (B), (C), (D) và đã có optionsTranslationItems,
 * hàm trả về null để tránh hiển thị lặp lại đoạn text thô gộp ở trên các thẻ đáp án.
 */
export const getCleanQuestionPromptTranslation = (question: Question): string | null => {
  const rawTrans = getEffectiveQuestionTranslation(question);
  if (!rawTrans) return null;

  const hasOptionsItems = Boolean(
    question.optionsTranslationItems && question.optionsTranslationItems.length > 0,
  );
  const hasChoiceInPrompt = /(?:\([A-D]\)|^[A-D][\.\:\s])/m.test(rawTrans);

  if (hasOptionsItems && hasChoiceInPrompt) {
    return null;
  }

  return rawTrans;
};

/**
 * Trả về nội dung bản dịch nghĩa đồng bộ 100% (kết hợp câu hỏi và phương án A, B, C, D)
 * cho giao diện hiển thị duy nhất theo mẫu thiết kế.
 */
export const getUnifiedQuestionTranslationText = (question: Question): string | null => {
  const promptTrans = getCleanQuestionPromptTranslation(question);

  let optionsContent = '';
  if (question.optionsTranslationItems && question.optionsTranslationItems.length > 0) {
    optionsContent = question.optionsTranslationItems
      .map((item) => `${item.choiceId}. ${item.meaning}`)
      .join('\n');
  } else if (question.explanationEn) {
    optionsContent = cleanTranscriptSpacing(
      cleanExplanationText(question.explanationEn) || question.explanationEn,
    );
  } else if (question.optionsTranslation) {
    optionsContent = cleanTranscriptSpacing(question.optionsTranslation);
  }

  const parts: string[] = [];
  if (promptTrans) {
    parts.push(promptTrans);
  }
  if (optionsContent) {
    if (!promptTrans || !promptTrans.includes(optionsContent)) {
      parts.push(optionsContent);
    }
  }

  const result = cleanTranscriptSpacing(parts.join('\n\n'));
  return result || null;
};
