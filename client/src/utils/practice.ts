import { PassageFormatStatus, Question } from '../types';

export interface PracticeGroup {
  id: string;
  partId: number;
  questions: Question[];
  audioUrl?: string;
  imageUrl?: string;
  passageText?: string;
  passageTranslation?: string;
  passageTranslationHtml?: string;
  passageTranslationFormatStatus?: PassageFormatStatus;
  transcript?: string;
}

const normalizeSharedContent = (value?: string) =>
  value?.replace(/\s+/g, ' ').trim().toLowerCase();

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
      previous.audioUrl ||= question.audioUrl;
      previous.imageUrl ||= question.imageUrl;
      previous.passageText ||= question.passageText;
      previous.passageTranslation ||= question.passageTranslation;
      previous.passageTranslationHtml ||= question.passageTranslationHtml;
      previous.passageTranslationFormatStatus ||= question.passageTranslationFormatStatus;
      previous.transcript ||= question.transcript;
      continue;
    }

    groups.push({
      id: audioOnlyGroup && previous?.id === key ? `${key}:${groups.length}` : key,
      partId: question.partId,
      questions: [question],
      audioUrl: question.audioUrl,
      imageUrl: question.imageUrl,
      passageText: question.passageText,
      passageTranslation: question.passageTranslation,
      passageTranslationHtml: question.passageTranslationHtml,
      passageTranslationFormatStatus: question.passageTranslationFormatStatus,
      transcript: question.transcript,
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
