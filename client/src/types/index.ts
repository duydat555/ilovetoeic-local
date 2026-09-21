export type UserRole = 'student' | 'admin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  familyMiddleName?: string;
  cohortCode?: string | null;
  hasValidRankingName?: boolean;
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
  approvalStatus?: ApprovalStatus;
  approvedAt?: string | null;
  isFrozen?: boolean;
  frozenAt?: string | null;
  accessExpiresAt?: string | null;
  isPro?: boolean;
  xp?: number;
  level?: number;
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

export interface StructuredSentencePair {
  sentence_id: number;
  en: string;
  vi: string;
  question_numbers?: number[];
  type: 'paragraph' | 'metadata' | 'title' | 'sign_off';
  doc_index: number;
}

export interface Question {
  id: string;
  partId: number;
  difficultyLevel?: number;
  questionNumber: number;
  passageId?: string;
  passageSentencePairs?: StructuredSentencePair[];
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

export interface StudyAttemptPartStats {
  part: number;
  total: number;
  answered: number;
  correct: number;
  wrong: number;
  skipped: number;
}

export type StudyAttemptQuestionStatus = 'correct' | 'wrong' | 'skipped';

export interface StudyAttemptReviewQuestion {
  id: string;
  displayNumber: number;
  questionNumber: number;
  testId?: string;
  testName?: string;
  testYear?: number;
  part: number;
  level?: number;
  promptText: string;
  choices: QuestionChoice[];
  selectedAnswer?: string;
  correctAnswer: string;
  status: StudyAttemptQuestionStatus;
  explanation: string;
  explanationEn: string;
  translation: string;
  optionsTranslation: string;
  passageText: string;
  passageTranslationHtml: string;
  passageSentencePairs?: StructuredSentencePair[];
  transcript: string;
  audioUrl?: string;
  imageUrl?: string;
}

export interface StudyAttempt {
  id: string;
  userId: string;
  testId?: string;
  testName?: string;
  testYear?: number;
  mode: StudyAttemptMode;
  part?: number;
  level?: number;
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
  partStats?: StudyAttemptPartStats[];
  testYears?: number[];
  metadata?: Record<string, unknown>;
  completedAt: string;
}

export interface StudyActivityPartCount {
  part: number;
  questions: number;
}

export interface StudyActivityDay {
  date: string;
  totalQuestions: number;
  practiceQuestions: number;
  grammarQuestions: number;
  examQuestions: number;
  attempts: number;
  parts: StudyActivityPartCount[];
}

export interface StudyActivityResponse {
  year: number;
  timezone: string;
  updatedAt: string;
  data: StudyActivityDay[];
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
  imageUrl?: string;
  audioUrl?: string;
  audioUkUrl?: string;
  remembered?: boolean;
  bookmarked?: boolean;
  definitionEn?: string;
  synonyms?: string[];
  personalNote?: string;
  aiSource?: AiSource;
  difficulty?: 'easy' | 'medium' | 'hard';
  level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  source?: 'curated' | 'gemini';
  status?: 'new' | 'learning' | 'review' | 'mastered';
  reviewCount?: number;
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
  phoneticUs?: string;
  phoneticUk?: string;
  audioUs?: string;
  audioUk?: string;
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

export type ListeningDifficulty = 'easy' | 'medium' | 'hard';

export type ListeningMode =
  | 'dictation'
  | 'mean_select'
  | 'word_select'
  | 'listen_check'
  | 'transcribe'
  | 'listen_full';

export interface ListeningCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order_index: number;
  set_count: number;
}

export interface DifficultyLevelInfo {
  level: number;
  name: string;
  description: string;
  totalSets: number;
  totalSentences: number;
  partCounts: {
    all: number;
    'Part 1': number;
    'Part 2': number;
    'Part 3': number;
    'Part 4': number;
    [key: string]: number;
  };
}

export interface DifficultyOverview {
  success: boolean;
  totalPracticeAttempts: number;
  totalQuestionsEvaluated: number;
  updateFrequency: string;
  lastCalculatedAt: string;
  levels: DifficultyLevelInfo[];
}

export interface ListeningTestSummary {
  testNumber: number;
  title: string;
  year: number;
  setCount: number;
  sentenceCount: number;
  partCounts: {
    part1: number;
    part2: number;
    part3: number;
    part4: number;
  };
  completedSets: number;
  completionRate: number;
}

export interface ListeningSet {
  id: string;
  categoryId: string;
  categoryName: string;
  title: string;
  description: string;
  part: string;
  difficulty: ListeningDifficulty;
  difficultyLevel?: number;
  audioUrl?: string;
  isPro: boolean;
  isLocked?: boolean;
  hasVideo: boolean;
  videoSourceType: string;
  coverImage: string;
  sentenceCount: number;
  orderIndex: number;
  completionRate: number;
  lastSentenceIndex: number;
  progressStatus: 'not_started' | 'in_progress' | 'completed';
  notesCount?: number;
  lastStudiedAt?: string | null;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  score?: number;
  posTag?: string;
  lemma?: string;
}

export interface ListeningSentence {
  id: string;
  orderIndex: number;
  groupIndex?: number;
  audioUrl?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  startTime: number;
  endTime?: number | null;
  text: string;
  words?: WordTimestamp[];
  phoneticUs?: string;
  wordsToFill: string[];
  translationVi: string;
  distractors: string[];
  checkOptions: {
    is_correct?: boolean;
    display_text?: string;
    explanation?: string;
  };
}

export interface ListeningNote {
  id: string;
  sentenceId?: string | null;
  word: string;
  note: string;
  createdAt: string;
}

export interface UserListeningProgress {
  currentSentenceIndex: number;
  completedSentences: string[];
  sentenceScores: Record<string, { score: number; hints: number; completedAt: string }>;
  completionRate: number;
  totalScore: number;
  totalHintsUsed: number;
  notes?: ListeningNote[];
  lastStudiedAt?: string;
}

