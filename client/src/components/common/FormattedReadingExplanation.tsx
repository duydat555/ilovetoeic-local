import React from 'react';
import { BookOpen, HelpCircle, Languages } from 'lucide-react';
import { Question } from '../../types';
import { cleanLaTeXSymbols } from '../../utils/practice';

interface FormattedReadingExplanationProps {
  question: Question;
}

interface ParsedOptionItem {
  choiceId: 'A' | 'B' | 'C' | 'D';
  word?: string;
  partOfSpeech?: string;
  meaning: string;
}

const GRAMMAR_TOKENS_REGEX = /(thì hiện tại đơn|thì hiện tại tiếp diễn|thì hiện tại hoàn thành|thì quá khứ đơn|thì quá khứ tiếp diễn|thì quá khứ hoàn thành|thì tương lai đơn|thì tương lai tiếp diễn|thì tương lai hoàn thành|thì tương lai gần|thì hiện tại|thì quá khứ|thì tương lai|chủ ngữ ngôi thứ ba số ít|chủ ngữ số ít|chủ ngữ số nhiều|chủ ngữ|động từ nguyên mẫu|động từ chia|động từ chính|động từ|hiện tại phân từ|quá khứ phân từ|tính từ|trạng từ|danh từ|giới từ|liên từ|phó từ|mệnh đề quan hệ|mệnh đề thời gian|mệnh đề|cấu trúc|cụm cố định|rút gọn|V-ing|to-V|V-ed|v-ing|v-ed|v-s|v-es|v-inf|prep|adj|adv|noun|verb)/gi;

function highlightReadingExplanationTokens(content: string) {
  const parts = content.split(/("[^"]+"|\([^)]+\))/g);
  return parts.map((part, idx) => {
    if (part.startsWith('"') && part.endsWith('"')) {
      return (
        <span
          key={idx}
          className="mx-0.5 rounded border border-brand-500/20 bg-brand-500/10 px-1.5 py-0.5 font-bold text-brand-700 dark:bg-brand-400/20 dark:text-brand-300"
        >
          {part}
        </span>
      );
    }
    if (part.startsWith('(') && part.endsWith(')')) {
      return (
        <span
          key={idx}
          className="mx-0.5 rounded border border-slate-200/50 bg-slate-100 px-1.5 py-0.5 text-xs font-semibold italic text-slate-600 dark:border-line/50 dark:bg-surface-elevated dark:text-content-muted"
        >
          {part}
        </span>
      );
    }

    const tokens = part.split(GRAMMAR_TOKENS_REGEX);
    if (tokens.length <= 1) return part;

    return tokens.map((subToken, subIdx) => {
      if (GRAMMAR_TOKENS_REGEX.test(subToken)) {
        return (
          <span
            key={`${idx}-${subIdx}`}
            className="mx-0.5 rounded border border-amber-500/20 bg-amber-500/10 px-1 py-0.5 text-xs font-extrabold text-amber-700 dark:bg-amber-400/20 dark:text-amber-300"
          >
            {subToken}
          </span>
        );
      }
      return subToken;
    });
  });
}

function parseOptionLine(line: string, defaultChoiceId?: 'A' | 'B' | 'C' | 'D'): ParsedOptionItem | null {
  const matchLetter = line.match(/^(?:\(([A-D])\)|([A-D])[\.\:\)])\s*(.*)$/i);
  let choiceId: 'A' | 'B' | 'C' | 'D' | undefined = defaultChoiceId;
  let rest = line;

  if (matchLetter) {
    choiceId = (matchLetter[1] || matchLetter[2]).toUpperCase() as 'A' | 'B' | 'C' | 'D';
    rest = matchLetter[3];
  }

  if (!choiceId) return null;

  // Try parsing: word (partOfSpeech): meaning OR word (partOfSpeech) meaning
  const detailed = rest.match(/^(.+?)\s*\(([^)]+)\)\s*[\:\-]?\s*(.+)$/);
  if (detailed) {
    return {
      choiceId,
      word: detailed[1].trim(),
      partOfSpeech: detailed[2].trim(),
      meaning: detailed[3].trim(),
    };
  }

  // Try parsing: word: meaning
  const simple = rest.match(/^(.+?)\s*[\:\-]\s*(.+)$/);
  if (simple) {
    return {
      choiceId,
      word: simple[1].trim(),
      meaning: simple[2].trim(),
    };
  }

  return {
    choiceId,
    meaning: rest.trim(),
  };
}

function normalizeOptionItem(item: ParsedOptionItem): ParsedOptionItem {
  const word = item.word?.trim();
  const partOfSpeech = item.partOfSpeech?.trim();
  const meaning = item.meaning?.trim() || '';

  const fullText = word && word !== meaning
    ? `${word} ${partOfSpeech ? `(${partOfSpeech})` : ''} ${meaning}`
    : meaning;

  const cleanText = fullText.replace(/^(?:\(([A-D])\)|([A-D])[\.\:\)])\s*/i, '').trim();

  // Match: word (partOfSpeech): meaning OR word (partOfSpeech) meaning
  const matchDetailed = cleanText.match(/^(.+?)\s*\(([^)]+)\)\s*[\:\-]?\s*(.+)$/);
  if (matchDetailed) {
    return {
      choiceId: item.choiceId,
      word: matchDetailed[1].trim(),
      partOfSpeech: matchDetailed[2].trim(),
      meaning: matchDetailed[3].replace(/^[\:\-]\s*/, '').trim(),
    };
  }

  // Match: word: meaning OR word - meaning
  const matchSimple = cleanText.match(/^(.+?)\s*[\:\-]\s*(.+)$/);
  if (matchSimple) {
    return {
      choiceId: item.choiceId,
      word: matchSimple[1].trim(),
      partOfSpeech: partOfSpeech || undefined,
      meaning: matchSimple[2].trim(),
    };
  }

  return {
    choiceId: item.choiceId,
    word: word || undefined,
    partOfSpeech: partOfSpeech || undefined,
    meaning: meaning,
  };
}

function renderProseLine(line: string, key: number) {
  const detailed = line.match(/^([a-zA-Z0-9\s\-–—'\"]+?)\s*\(([^)]+)\)\s*[\:\-]?\s*(.+)$/);
  if (detailed) {
    const word = detailed[1].trim();
    const pos = detailed[2].trim();
    const meaning = detailed[3].replace(/^[\:\-]\s*/, '').trim();
    return (
      <p key={key} className="leading-relaxed">
        <strong className="font-extrabold text-slate-900 dark:text-content">{word}</strong>{' '}
        <span className="italic font-medium text-slate-500 dark:text-content-muted">({pos})</span>{' '}
        <span className="font-normal text-slate-700 dark:text-content-muted">{meaning}</span>
      </p>
    );
  }

  return (
    <p key={key} className="leading-relaxed">
      {highlightReadingExplanationTokens(line)}
    </p>
  );
}

function isPassageTranslationLine(line: string, passageTranslation?: string, passageText?: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // 1. Passage header tags
  if (/^\[(e-?mail|thông báo|thư|bài báo|quảng cáo|memo|notice|letter|article|advertisement|form|biểu mẫu|schedule|lịch trình)\]/i.test(trimmed)) {
    return true;
  }

  // 2. Email / Memo headers
  if (/^(gửi|từ|ngày|chủ đề|to|from|date|subject)\s*:/i.test(trimmed)) {
    return true;
  }

  // 3. Notice / Announcement uppercase headers
  if (/^(chào mừng|vui lòng đăng ký|lưu ý nhân viên|chú ý nhân viên)/i.test(trimmed)) {
    return true;
  }

  // 4. Substring check against passageTranslation
  if (passageTranslation && passageTranslation.trim().length > 0) {
    const cleanLine = trimmed.toLowerCase();
    const cleanPassageTrans = passageTranslation.toLowerCase();
    if (cleanLine.length >= 10 && cleanPassageTrans.includes(cleanLine)) {
      return true;
    }
  }

  // 5. Substring check against passageText
  if (passageText && passageText.trim().length > 0) {
    const cleanLine = trimmed.toLowerCase();
    const cleanPassageText = passageText.toLowerCase();
    if (cleanLine.length >= 10 && cleanPassageText.includes(cleanLine)) {
      return true;
    }
  }

  return false;
}

export const FormattedReadingExplanation: React.FC<FormattedReadingExplanationProps> = ({ question }) => {
  const rawExplanation = question.explanation || '';
  const cleanedLaTeX = cleanLaTeXSymbols(rawExplanation);

  const lines = cleanedLaTeX.split('\n').map((l) => l.trim()).filter(Boolean);
  const proseLines: string[] = [];
  const extractedOptionItems: ParsedOptionItem[] = [];
  let translationLine: string | null = null;

  for (const line of lines) {
    if (line.toLowerCase().startsWith('dịch nghĩa:')) {
      translationLine = line.replace(/^dịch nghĩa:\s*/i, '').trim();
      continue;
    }

    if (isPassageTranslationLine(line, question.passageTranslation, question.passageText)) {
      continue;
    }

    const parsedOpt = parseOptionLine(line);
    if (parsedOpt) {
      extractedOptionItems.push(parsedOpt);
    } else {
      proseLines.push(line);
    }
  }

  if (translationLine && isPassageTranslationLine(translationLine, question.passageTranslation, question.passageText)) {
    translationLine = null;
  }

  const optionsMap = new Map<'A' | 'B' | 'C' | 'D', ParsedOptionItem>();

  if (question.optionsTranslationItems && question.optionsTranslationItems.length > 0) {
    question.optionsTranslationItems.forEach((item) => {
      optionsMap.set(item.choiceId, normalizeOptionItem({
        choiceId: item.choiceId,
        word: item.word,
        partOfSpeech: item.partOfSpeech,
        meaning: item.meaning,
      }));
    });
  }

  extractedOptionItems.forEach((item) => {
    if (!optionsMap.has(item.choiceId)) {
      optionsMap.set(item.choiceId, normalizeOptionItem(item));
    }
  });

  if (optionsMap.size === 0 && (question.optionsTranslation || (question as unknown as Record<string, string>).answer_translation_vi)) {
    const rawOptText = question.optionsTranslation || (question as unknown as Record<string, string>).answer_translation_vi || '';
    const optLines: string[] = rawOptText.split('\n').map((l: string) => l.trim()).filter(Boolean);
    optLines.forEach((l: string, idx: number) => {
      const defaultLetter = (['A', 'B', 'C', 'D'][idx] || 'A') as 'A' | 'B' | 'C' | 'D';
      const parsed = parseOptionLine(l, defaultLetter);
      if (parsed) optionsMap.set(parsed.choiceId, normalizeOptionItem(parsed));
    });
  }

  const finalOptions: ParsedOptionItem[] = [];
  const choicesList: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  choicesList.forEach((letter) => {
    const rawItem = optionsMap.get(letter);
    const choiceObj = question.choices?.find((c) => c.id === letter);
    if (rawItem) {
      const normalized = normalizeOptionItem(rawItem);
      if (!normalized.word && choiceObj?.text) {
        normalized.word = choiceObj.text.trim();
      }
      finalOptions.push(normalized);
    } else if (choiceObj?.text) {
      finalOptions.push({
        choiceId: letter,
        word: choiceObj.text.trim(),
        meaning: '',
      });
    }
  });

  const rawQTrans = question.questionTranslation;
  const isValidQTrans = rawQTrans &&
    !rawQTrans.includes('(A)') &&
    !isPassageTranslationLine(rawQTrans, question.passageTranslation, question.passageText);

  const questionTranslationText = translationLine || (isValidQTrans ? rawQTrans : null);

  return (
    <div className="mt-4 space-y-3.5 rounded-2xl border border-brand-100 bg-brand-50/60 p-4 dark:border-brand-900 dark:bg-brand-950/30">
      {/* Block Header */}
      <div className="flex items-center gap-2 text-xs font-extrabold text-brand-700 dark:text-brand-200">
        <BookOpen className="size-4" />
        <span>Giải thích câu {question.questionNumber}</span>
      </div>

      {/* Prose Explanation with token highlighting */}
      {proseLines.length > 0 && (
        <div className="space-y-2 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-content">
          {proseLines.map((line, idx) => renderProseLine(line, idx))}
        </div>
      )}

      {/* Question Translation */}
      {questionTranslationText && (
        <div className="rounded-xl border border-brand-200/80 bg-brand-50/40 p-3.5 text-xs leading-relaxed text-slate-700 dark:border-brand-900/60 dark:bg-brand-950/20 dark:text-content-muted">
          <div className="mb-1 flex items-center gap-1.5 font-bold text-brand-700 dark:text-brand-300">
            <Languages className="size-3.5" />
            <span>Dịch nghĩa:</span>
          </div>
          <div className="whitespace-pre-line text-sm leading-relaxed text-slate-800 dark:text-content">
            {questionTranslationText}
          </div>
        </div>
      )}

      {/* Option Meanings Cards (Nghĩa đáp án - Matching screenshot design) */}
      {finalOptions.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-line dark:bg-surface">
          <div className="mb-3 flex items-center gap-2 text-xs font-extrabold text-slate-800 dark:text-content">
            <HelpCircle className="size-4 text-brand-600 dark:text-brand-400" />
            <span>Nghĩa đáp án</span>
          </div>

          <div className="grid gap-2">
            {finalOptions.map((item) => {
              const isCorrect = item.choiceId === question.correctAnswer;
              const isPart7 = question.partId === 7;
              const isPart6 = question.partId === 6;
              const wordCount = item.word ? item.word.trim().split(/\s+/).length : 0;
              const isLongSentence = wordCount >= 4 || Boolean(item.word && item.word.trim().length >= 25);
              const shouldHideWord = isPart7 || (isPart6 && isLongSentence);
              const hasMeaning = Boolean(item.meaning && item.meaning.trim());
              const showWord = (!shouldHideWord || !hasMeaning) && Boolean(item.word && item.word.trim()) && (!hasMeaning || item.word?.toLowerCase().trim() !== item.meaning.toLowerCase().trim());

              return (
                <div
                  key={item.choiceId}
                  className={`flex items-center gap-3 rounded-xl p-2.5 border transition-all ${isCorrect
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200 shadow-2xs'
                    : 'bg-slate-50/60 border-slate-200/70 text-slate-700 dark:bg-surface-elevated/40 dark:border-line/60 dark:text-content-muted'
                    }`}
                >
                  <span
                    className={`flex shrink-0 items-center justify-center font-extrabold text-xs px-2.5 py-1 rounded-lg ${isCorrect
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200/80 text-slate-600 shadow-2xs dark:bg-surface dark:border-line dark:text-content-muted'
                      }`}
                  >
                    ({item.choiceId})
                  </span>

                  <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs sm:text-sm">
                    {showWord && item.word && (
                      <strong className={`font-extrabold ${isCorrect ? 'text-emerald-950 dark:text-emerald-200' : 'text-slate-900 dark:text-content'}`}>
                        {item.word}
                      </strong>
                    )}
                    {showWord && item.partOfSpeech && (
                      <span className={`italic font-medium text-xs ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-content-muted'}`}>
                        ({item.partOfSpeech})
                      </span>
                    )}
                    {hasMeaning && (
                      <span className={`font-normal ${isCorrect ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-700 dark:text-content-muted'}`}>
                        {item.meaning}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
