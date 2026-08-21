import React, { useMemo } from 'react';
import { Headphones, Languages } from 'lucide-react';
import { cleanTranscriptSpacing } from '../../utils/practice';

export interface InterleavedTranscriptProps {
  transcript?: string | null;
  translation?: string | null;
  partId?: number;
  className?: string;
}

export interface DialogueLine {
  speaker?: string;
  enText: string;
  viText?: string;
}

const ABBREVIATIONS = new Set([
  'mr.',
  'ms.',
  'mrs.',
  'dr.',
  'st.',
  'inc.',
  'co.',
  'ltd.',
  'p.m.',
  'a.m.',
  'u.s.',
  'vs.',
  'e.g.',
  'i.e.',
  'tp.',
  'ts.',
  'bs.',
  'pg.',
  'dept.',
]);

/**
 * Trích xuất danh sách dòng từ văn bản HTML hoặc text thô
 */
function parseTranscriptLines(raw?: string | null): string[] {
  if (!raw) return [];

  const cleaned = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();

  return cleaned
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false;
      const upper = l.toUpperCase();
      return ![
        'SCRIPT',
        'TRANSCRIPT',
        'BÀI NGHE',
        'NỘI DUNG BÀI NGHE',
        'DỊCH NGHĨA',
        'BẢN DỊCH',
        'DỊCH NGHĨA TIẾNG VIỆT',
      ].includes(upper);
    });
}

/**
 * Phân tích nhãn người nói (speaker) và nội dung văn bản của 1 dòng thoại
 */
function extractSpeakerAndText(line: string): { speaker?: string; text: string } {
  if (!line) return { text: '' };

  const m1 = line.match(/^([A-Za-z0-9\-\_\s]{1,12})[\:\.\-–—]\s*(.+)$/);
  if (m1) {
    const candidate = m1[1].trim();
    if (
      candidate.length <= 10 ||
      /^(Woman|Man|Speaker|Nữ|Nam|Người)\s*\d*$/i.test(candidate)
    ) {
      return { speaker: candidate, text: m1[2].trim() };
    }
  }

  const m2 = line.match(/^([MW]\-[A-Za-z]{1,4}|[MW])\s+(.+)$/);
  if (m2) {
    return { speaker: m2[1].trim(), text: m2[2].trim() };
  }

  return { text: line.trim() };
}

/**
 * Phân tách văn bản đoạn văn (Part 4 monologue) thành các câu tiếng Anh và tiếng Việt riêng lẻ
 */
export function splitIntoSentences(text?: string | null): { speaker?: string; sentences: string[] } {
  if (!text) return { sentences: [] };

  const cleanedHtml = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();

  let speaker: string | undefined;
  let cleaned = cleanedHtml;

  const m1 = cleanedHtml.match(/^([A-Za-z0-9\-\_]{1,12})[\:\.\-–—]\s*/);
  if (m1) {
    speaker = m1[1].trim();
    cleaned = cleanedHtml.slice(m1[0].length).trim();
  } else {
    const m2 = cleanedHtml.match(/^([MW]\-[A-Za-z]{1,4}|[MW])\s+/);
    if (m2) {
      speaker = m2[1].trim();
      cleaned = cleanedHtml.slice(m2[0].length).trim();
    }
  }

  cleaned = cleaned.replace(/^(SCRIPT|TRANSCRIPT|BÀI NGHE|DỊCH NGHĨA|NỘI DUNG BÀI NGHE)\s*/i, '').trim();

  const rawSplits = cleaned.split(/(?<=[.!?])\s+/);
  const sentences: string[] = [];
  let current = '';

  for (const part of rawSplits) {
    if (current) {
      current += ' ' + part;
    } else {
      current = part;
    }

    const words = current.trim().split(/\s+/);
    const lastWord = words[words.length - 1]?.toLowerCase() || '';

    if (ABBREVIATIONS.has(lastWord)) {
      continue;
    }

    if (current.trim()) {
      sentences.push(current.trim());
      current = '';
    }
  }

  if (current.trim()) {
    sentences.push(current.trim());
  }

  return { speaker, sentences };
}

/**
 * Ghép từng câu tiếng Anh với bản dịch tiếng Việt cho Part 4 (hoặc các bài monologue)
 */
export function buildSentenceBySentencePairs(
  enRaw?: string | null,
  viRaw?: string | null
): { speaker?: string; pairs: DialogueLine[] } {
  const enParsed = splitIntoSentences(enRaw);
  const viParsed = splitIntoSentences(viRaw);

  const speaker = enParsed.speaker || viParsed.speaker;
  const enSents = enParsed.sentences;
  const viSents = viParsed.sentences;

  const maxLen = Math.max(enSents.length, viSents.length);
  const pairs: DialogueLine[] = [];

  for (let i = 0; i < maxLen; i++) {
    const enText = enSents[i] || '';
    const viText = viSents[i] || undefined;
    pairs.push({ speaker, enText, viText });
  }

  return { speaker, pairs };
}

/**
 * Ghép các lượt thoại hội thoại cho Part 3 (hoặc các bài hội thoại nhiều người)
 */
export function buildInterleavedDialogue(
  enRaw?: string | null,
  viRaw?: string | null
): DialogueLine[] {
  const enLines = parseTranscriptLines(enRaw);
  const viLines = parseTranscriptLines(viRaw);

  const dialogue: DialogueLine[] = [];
  const maxLen = Math.max(enLines.length, viLines.length);

  for (let i = 0; i < maxLen; i++) {
    const enLine = enLines[i] || '';
    const viLine = viLines[i] || '';

    const parsedEn = extractSpeakerAndText(enLine);
    const parsedVi = extractSpeakerAndText(viLine);

    const speaker = parsedEn.speaker || parsedVi.speaker;

    dialogue.push({
      speaker,
      enText: parsedEn.text,
      viText: parsedVi.text || undefined,
    });
  }

  return dialogue;
}

export const InterleavedTranscript: React.FC<InterleavedTranscriptProps> = ({
  transcript,
  translation,
  partId = 3,
  className = '',
}) => {
  const parsedData = useMemo(() => {
    // Với Part 4 (Monologue), luôn ưu tiên phân tách từng CÂU (sentence by sentence)
    if (partId === 4) {
      const sentenceResult = buildSentenceBySentencePairs(transcript, translation);
      if (sentenceResult.pairs.length > 0) {
        return { isSentenceMode: true, speaker: sentenceResult.speaker, lines: sentenceResult.pairs };
      }
    }

    // Mặc định hoặc Part 3: Phân tách theo lượt thoại (dialogue lines)
    const dialogueLines = buildInterleavedDialogue(transcript, translation);

    // Nếu Part 3 nhưng chỉ có 1 dòng duy nhất có nhiều câu (không phân tách dòng), fallback về split câu
    if (dialogueLines.length <= 1) {
      const sentenceResult = buildSentenceBySentencePairs(transcript, translation);
      if (sentenceResult.pairs.length > 1) {
        return { isSentenceMode: true, speaker: sentenceResult.speaker, lines: sentenceResult.pairs };
      }
    }

    return { isSentenceMode: false, speaker: undefined, lines: dialogueLines };
  }, [transcript, translation, partId]);

  if (!transcript && !translation) {
    return null;
  }

  const { isSentenceMode, speaker, lines } = parsedData;

  // Fallback nếu không có nội dung dòng
  if (lines.length === 0 || (lines.length === 1 && !lines[0]?.enText && !lines[0]?.viText)) {
    return (
      <section
        id="shared-transcript"
        className={`space-y-4 rounded-2xl border border-brand-200 bg-brand-50/55 p-4 dark:border-brand-900 dark:bg-brand-950/20 ${className}`}
      >
        <div>
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-950 dark:text-content">
            <Headphones className="size-4 text-brand-600 dark:text-brand-300" />
            <span>Transcript {partId ? `(Part ${partId})` : ''}</span>
          </div>
          {transcript && (
            <p className="mt-2.5 whitespace-pre-line text-sm leading-7 text-slate-700 dark:text-content-muted">
              {cleanTranscriptSpacing(transcript)}
            </p>
          )}
        </div>

        {translation && (
          <div className="border-t border-brand-200/60 pt-3 dark:border-brand-900/60">
            <div className="mb-2 flex items-center gap-2 text-xs font-extrabold text-brand-700 dark:text-brand-300">
              <Languages className="size-4 text-brand-600 dark:text-brand-300" />
              <span>Dịch nghĩa tiếng Việt</span>
            </div>
            <p className="whitespace-pre-line text-sm leading-7 text-slate-700 dark:text-content-muted">
              {cleanTranscriptSpacing(translation)}
            </p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section
      id="shared-transcript"
      className={`space-y-3.5 rounded-2xl border border-brand-200/90 bg-brand-50/40 p-4 dark:border-brand-900/80 dark:bg-brand-950/20 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-brand-200/60 pb-3 dark:border-brand-900/60">
        <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-content">
          <Headphones className="size-4 text-brand-600 dark:text-brand-300" />
          <span>Transcript {partId ? `(Part ${partId})` : ''}</span>
        </div>
        {speaker && (
          <span className="rounded-md bg-brand-100/90 px-2.5 py-0.5 text-xs font-extrabold text-brand-800 dark:bg-brand-950 dark:text-brand-300">
            {speaker}
          </span>
        )}
      </div>

      {/* Khối đoạn văn liền mạch với thiết kế đường kẻ lề trái & màu chuẩn theo website */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-line/70 dark:bg-surface space-y-3.5">
        {lines.map((line, idx) => (
          <div key={idx} className="space-y-1.5 text-sm leading-relaxed">
            {/* Dòng Tiếng Anh */}
            <div className="font-medium text-slate-900 dark:text-content">
              {!isSentenceMode && line.speaker && (
                <span className="mr-1.5 font-bold text-slate-900 dark:text-content">
                  {line.speaker}:
                </span>
              )}
              {isSentenceMode && idx === 0 && speaker && (
                <span className="mr-1.5 font-bold text-slate-900 dark:text-content">
                  {speaker}:
                </span>
              )}
              <span>{line.enText}</span>
            </div>

            {/* Dòng Dịch nghĩa Tiếng Việt (Có vạch kẻ lề trái + màu Brand chuẩn theo hình thiết kế) */}
            {line.viText && (
              <div className="border-l-2 border-brand-500 pl-3 text-brand-700 dark:border-brand-400 dark:text-brand-300">
                <div className="font-normal leading-relaxed">
                  {!isSentenceMode && line.speaker && (
                    <span className="mr-1.5 font-bold">
                      {line.speaker}:
                    </span>
                  )}
                  {isSentenceMode && idx === 0 && speaker && (
                    <span className="mr-1.5 font-bold">
                      {speaker}:
                    </span>
                  )}
                  <span>{line.viText}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
