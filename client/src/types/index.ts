export type UserRole = 'student' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  targetScore: number;
  currentScore: number;
  examDate: string;
  streakDays: number;
  totalStudyMinutes: number;
  questionsAnswered: number;
  accuracyRate: number;
  longestStreak?: number;
  lastStudyDate?: string | null;
  role?: UserRole;
}

export interface ActivityItem {
  id: string;
  type: 'vocab' | 'part2' | 'part5' | 'mistake' | 'quicktest';
  title: string;
  description: string;
  estimatedMinutes: number;
  questionCount: number;
  completed: boolean;
  score?: number;
}

export interface SkillWeakness {
  id: string;
  name: string;
  accuracy: number;
  part: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string; // Award, Medal, Trophy, Flame, BadgeCheck
  unlocked: boolean;
  unlockedDate?: string;
}

export interface LearningStage {
  id: number;
  title: string;
  description: string;
  lessons: LearningLesson[];
}

export interface LearningLesson {
  id: string;
  title: string;
  skill: 'Listening' | 'Reading' | 'Vocabulary' | 'Grammar';
  durationMinutes: number;
  exerciseCount: number;
  status: 'locked' | 'in_progress' | 'completed';
  score?: number;
}


export interface ActivityItem {
  id: string;
  type: 'vocab' | 'part2' | 'part5' | 'mistake' | 'quicktest';
  title: string;
  description: string;
  estimatedMinutes: number;
  questionCount: number;
  completed: boolean;
  score?: number;
}

export interface SkillWeakness {
  id: string;
  name: string;
  accuracy: number;
  part: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string; // Award, Medal, Trophy, Flame, BadgeCheck
  unlocked: boolean;
  unlockedDate?: string;
}

export interface LearningStage {
  id: number;
  title: string;
  description: string;
  lessons: LearningLesson[];
}

export interface LearningLesson {
  id: string;
  title: string;
  skill: 'Listening' | 'Reading' | 'Vocabulary' | 'Grammar';
  durationMinutes: number;
  exerciseCount: number;
  status: 'locked' | 'in_progress' | 'completed';
  score?: number;
}

export interface QuestionChoice {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface QuestionEvidence {
  citations: {
    label: string;
    text: string;
  }[];
  paraphrase?: string;
}

export type PassageFormatStatus = 'pending' | 'done' | 'error';

export interface Question {
  id: string;
  partId: number;
  questionNumber: number;
  passageId?: string;
  sharedGroupId?: string;
  audioUrl?: string;
  localAudioUrl?: string;
  imageUrl?: string;

  passageText?: string;
  promptText?: string;
  choices: QuestionChoice[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  explanationEn?: string;
  evidence?: QuestionEvidence;
  transcript?: string;
  passageTranslation?: string;
  passageTranslationHtml?: string;
  passageTranslationFormatStatus?: PassageFormatStatus;
  keyVocabulary?: { word: string; meaning: string }[];
  questionTranslation?: string;
  optionsTranslation?: string;
  optionsTranslationMap?: Record<string, string>;
  optionsTranslationItems?: OptionTranslationItem[];
}

export interface OptionTranslationItem {
  choiceId: 'A' | 'B' | 'C' | 'D';
  optionText?: string;
  word?: string;
  partOfSpeech?: string;
  meaning: string;
  rawText: string;
}



export interface MockTestItem {
  id: string;
  title: string;
  year: number;
  type: 'Full Test' | 'Mini Test' | 'Listening Test' | 'Reading Test';
  totalQuestions: number;
  durationMinutes: number;
  difficulty: 'Dễ' | 'Trung bình' | 'Khó';
  attemptsCount: number;
  highestScore?: number;
  completed: boolean;
}

export interface TestResultData {
  attemptId?: string;
  testId: string;
  testTitle: string;
  testName?: string;
  testYear?: number;
  totalScore: number;
  listeningScore: number;
  readingScore: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedAnswers: number;
  timeSpentSeconds: number;
  accuracyRate: number;
  completedAt: string;
  partBreakdown: { part: string; correct: number; total: number }[];
  answers?: Record<string, string>;
  questionIds?: string[];
  selectedParts?: number[];
  isPartial?: boolean;
}

export type StudyAttemptMode = 'practice' | 'exam';

export interface StudyAttempt {
  id: string;
  userId: string;
  testId?: string;
  testName?: string;
  testYear?: number;
  mode: StudyAttemptMode;
  part?: number;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  accuracyRate: number;
  timeSpentSeconds: number;
  listeningCorrect?: number;
  readingCorrect?: number;
  listeningScore?: number;
  readingScore?: number;
  totalScore?: number;
  answers: Record<string, string>;
  questionIds: string[];
  metadata?: Record<string, unknown>;
  completedAt: string;
}

export interface VocabularyWord {
  id: string;
  topicId: string;
  topicName: string;
  word: string;
  phonetic: string;
  partOfSpeech: string;
  meaningVi: string;
  exampleEn: string;
  exampleVi: string;
  audioUrl?: string;
  remembered?: boolean;
  bookmarked?: boolean;
  definitionEn?: string;
  synonyms?: string[];
  personalNote?: string;
  aiSource?: AiSource;
  difficulty?: 'easy' | 'medium' | 'hard';
  source?: 'curated' | 'gemini';
  createdAt?: string;
  lastReviewedAt?: string;
}

export type AiSource = 'local' | 'gemini';
export type AiSourcePreference = 'local' | 'gemini';
export type DictionaryDetailSection = 'collocations' | 'examples' | 'synonyms' | 'wordFamily';

export interface DictionaryCollocation {
  phrase: string;
  meaningVi: string;
}

export interface DictionaryExample {
  en: string;
  vi: string;
  level?: string;
  context?: string;
}

export interface DictionaryWordFamily {
  word: string;
  partOfSpeech: string;
  phonetic: string;
}

export interface DictionaryDetailResult {
  section: DictionaryDetailSection;
  items: Array<DictionaryCollocation | DictionaryExample | DictionaryWordFamily | string>;
  aiSource: AiSource;
}

export interface WordTranslation {
  sourceText: string;
  translatedText: string;
  phonetic: string;
  partOfSpeech: string;
  definitionEn: string;
  examples: { en: string; vi: string }[];
  synonyms: string[];
  cached?: boolean;
  aiSource?: AiSource;
}

export interface GrammarLesson {
  id: string;
  title: string;
  description: string;
  theoryHtml: string;
  formula: string;
  examples: string[];
  notes: string[];
  completed: boolean;
}

export interface MistakeItem {
  id: string;
  question: Question;
  selectedAnswer: 'A' | 'B' | 'C' | 'D';
  userNotes?: string;
  reasonTag: 'Ngữ pháp' | 'Từ vựng' | 'Bẫy phát âm' | 'Đọc sót ý';
  dateAdded: string;
  reviewCount: number;
  understood: boolean;
}

export interface LeaderboardUser {
  rank: number;
  id: string;
  name: string;
  avatar: string;
  score: number;
  streakDays: number;
  completedLessons: number;
}

export type NotificationType = 'homework' | 'achievement' | 'reminder' | 'system';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string | null;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
}
