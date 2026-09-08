import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListChecks,
  FileText,
  Shuffle,
  Binary,
  Headphones,
  Edit3,
  Play,
  Lightbulb,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Volume2,
  ArrowRight,
  Layers,
  Trophy,
} from 'lucide-react';
import { VocabularyWord } from '../../../types';
import { playPronunciation } from '../../../utils/audioPronunciation';

interface Props {
  words: VocabularyWord[];
  onWordMastered?: (wordId: string) => void;
  onWordNeedReview?: (wordId: string) => void;
}

export type ExerciseType =
  | 'choose_meaning' // Chọn nghĩa: EN -> VI
  | 'recall_word' // Nhớ mặt chữ: VI -> EN
  | 'scramble_letters' // Sắp xếp chữ: Anagram
  | 'fill_missing' // Điền khuyết: Fill blanks
  | 'listen_write' // Nghe - viết: Dictation
  | 'context_cloze'; // Điền theo ngữ cảnh: Example cloze

const EXERCISE_OPTIONS: {
  id: ExerciseType;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'choose_meaning',
    title: 'Chọn nghĩa',
    desc: 'Xem từ tiếng Anh, chọn nghĩa đúng trong 4 đáp án',
    icon: ListChecks,
  },
  {
    id: 'recall_word',
    title: 'Nhớ mặt chữ',
    desc: 'Xem nghĩa, chọn từ tiếng Anh đúng trong 4 đáp án',
    icon: FileText,
  },
  {
    id: 'scramble_letters',
    title: 'Sắp xếp chữ',
    desc: 'Xếp các chữ cái lộn xộn thành từ đúng',
    icon: Shuffle,
  },
  {
    id: 'fill_missing',
    title: 'Điền khuyết',
    desc: 'Điền các chữ cái còn thiếu của từ',
    icon: Binary,
  },
  {
    id: 'listen_write',
    title: 'Nghe – viết',
    desc: 'Nghe phát âm rồi gõ lại từ, luyện ngữ âm',
    icon: Headphones,
  },
  {
    id: 'context_cloze',
    title: 'Điền theo ngữ cảnh',
    desc: 'Chọn từ phù hợp điền vào câu ví dụ',
    icon: Edit3,
  },
];

export const PracticeHubView: React.FC<Props> = ({ words, onWordMastered, onWordNeedReview }) => {
  const [selectedType, setSelectedType] = useState<ExerciseType>('choose_meaning');
  const [questionCount, setQuestionCount] = useState<number>(15);
  const [isPlaying, setIsPlaying] = useState(false);

  // Runner state
  const [sessionWords, setSessionWords] = useState<VocabularyWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [incorrectWords, setIncorrectWords] = useState<VocabularyWord[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  // Question interaction state
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [scrambleTiles, setScrambleTiles] = useState<{ char: string; originalIndex: number }[]>([]);
  const [scrambleSelected, setScrambleSelected] = useState<{ char: string; originalIndex: number }[]>([]);

  const totalWords = words.length;

  const handleStartPractice = () => {
    if (words.length === 0) return;
    // Shuffle words
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    const count = questionCount === -1 ? shuffled.length : Math.min(questionCount, shuffled.length);
    const picked = shuffled.slice(0, count);

    setSessionWords(picked);
    setCurrentIndex(0);
    setScore(0);
    setIncorrectWords([]);
    setIsCompleted(false);
    setIsPlaying(true);
    initQuestionState(picked[0]);
  };

  const currentWord: VocabularyWord | undefined = sessionWords[currentIndex];

  const initQuestionState = (word?: VocabularyWord) => {
    setSelectedAnswer(null);
    setTextAnswer('');
    setIsSubmitted(false);

    if (word && selectedType === 'scramble_letters') {
      const chars = word.word
        .trim()
        .toUpperCase()
        .split('')
        .map((char, originalIndex) => ({ char, originalIndex }));
      // Shuffle characters
      const shuffled = [...chars].sort(() => Math.random() - 0.5);
      setScrambleTiles(shuffled);
      setScrambleSelected([]);
    }

    if (word && selectedType === 'listen_write') {
      playPronunciation(word.word, 'US', undefined, word.audioUrl);
    }
  };

  // Multiple choice options generator
  const choices = useMemo(() => {
    if (!currentWord) return [];
    const pool = words.filter((w) => w.id !== currentWord.id);
    const shuffledPool = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    const all = [currentWord, ...shuffledPool].sort(() => Math.random() - 0.5);
    return all;
  }, [currentWord, words]);

  // Handle checking multiple choice
  const handleChoiceSelect = (choice: VocabularyWord) => {
    if (isSubmitted || !currentWord) return;
    setIsSubmitted(true);
    const correct = choice.id === currentWord.id;
    setSelectedAnswer(choice.id);

    if (correct) {
      setScore((prev) => prev + 1);
      playPronunciation(currentWord.word, 'US', undefined, currentWord.audioUrl);
      onWordMastered?.(currentWord.id);
    } else {
      setIncorrectWords((prev) => [...prev, currentWord]);
      onWordNeedReview?.(currentWord.id);
    }
  };

  // Handle checking typed answer (listen_write, fill_missing, scramble)
  const handleTextSubmit = (submittedWord: string) => {
    if (isSubmitted || !currentWord) return;
    setIsSubmitted(true);
    const isRight = submittedWord.trim().toLowerCase() === currentWord.word.trim().toLowerCase();

    if (isRight) {
      setScore((prev) => prev + 1);
      playPronunciation(currentWord.word, 'US', undefined, currentWord.audioUrl);
      onWordMastered?.(currentWord.id);
    } else {
      setIncorrectWords((prev) => [...prev, currentWord]);
      onWordNeedReview?.(currentWord.id);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < sessionWords.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      initQuestionState(sessionWords[nextIdx]);
    } else {
      setIsCompleted(true);
    }
  };

  // Keyboard shortcut: Press Enter to start practice on config screen
  useEffect(() => {
    if (isPlaying || isCompleted) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleStartPractice();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isCompleted, words, questionCount, selectedType]);

  // Keyboard shortcut: Press Enter to proceed to next question once answer is revealed
  useEffect(() => {
    if (!isPlaying || isCompleted || !isSubmitted) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleNextQuestion();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isCompleted, isSubmitted, currentIndex, sessionWords]);

  if (words.length === 0) {
    return (
      <div className="grid min-h-80 place-items-center rounded-3xl border border-line bg-surface p-8 text-center">
        <div>
          <ListChecks className="mx-auto size-12 text-content-muted" />
          <h3 className="mt-3 text-lg font-black text-content">Chưa có từ vựng để luyện tập</h3>
          <p className="mt-1 text-sm text-content-muted">Vui lòng thêm từ vào bộ này để bắt đầu ôn luyện.</p>
        </div>
      </div>
    );
  }

  // SCREEN 1: Configuration Hub
  if (!isPlaying) {
    const selectedOpt = EXERCISE_OPTIONS.find((opt) => opt.id === selectedType);
    const activeCountNumber = questionCount === -1 ? totalWords : Math.min(questionCount, totalWords);

    return (
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header Card */}
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-black text-accent-strong">
                <Layers className="size-3.5" />
                Luyện tập đa phương thức
              </span>
              <span className="rounded-full border border-line bg-surface-elevated px-2.5 py-0.5 text-xs font-bold text-content-muted">
                {totalWords} từ khả dụng
              </span>
            </div>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-content sm:text-3xl">
              Ôn tập củng cố từ vựng
            </h2>
            <p className="text-sm font-medium leading-relaxed text-content-muted">
              Chọn dạng bài và số lượng câu để bắt đầu phiên luyện tập củng cố phản xạ chuyên sâu.
            </p>
          </div>

          {/* CHỌN DẠNG BÀI */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-content-muted">
                1. Chọn dạng bài luyện tập
              </span>
              <span className="text-xs font-bold text-accent-strong">
                Đang chọn: {selectedOpt?.title}
              </span>
            </div>

            <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {EXERCISE_OPTIONS.map((opt) => {
                const isSelected = selectedType === opt.id;
                const IconComponent = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedType(opt.id)}
                    className={`group relative flex flex-col items-start rounded-2xl p-4 text-left transition-all duration-200 ${
                      isSelected
                        ? 'border-2 border-accent bg-accent/[0.08] shadow-md shadow-accent/10 -translate-y-0.5'
                        : 'border border-line bg-surface-elevated/70 hover:border-accent/40 hover:bg-surface-elevated hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <div
                        className={`grid size-10 place-items-center rounded-xl transition-transform group-hover:scale-105 ${
                          isSelected
                            ? 'bg-accent text-accent-contrast shadow-sm'
                            : 'border border-line bg-surface text-content'
                        }`}
                      >
                        <IconComponent className="size-5" />
                      </div>
                      {isSelected ? (
                        <div className="grid size-6 place-items-center rounded-full bg-accent text-accent-contrast shadow-sm">
                          <CheckCircle2 className="size-4 stroke-[3]" />
                        </div>
                      ) : (
                        <span className="size-2 rounded-full bg-line group-hover:bg-accent/40" />
                      )}
                    </div>
                    <h4 className="mt-3.5 text-sm font-black text-content group-hover:text-accent-strong">
                      {opt.title}
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-content-muted">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SỐ CÂU HỎI */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-content-muted">
                2. Số lượng câu hỏi
              </span>
              <span className="text-xs font-bold text-content-muted">
                Dự kiến: ~{Math.ceil((activeCountNumber * 15) / 60)} phút
              </span>
            </div>

            <div className="mt-3.5 flex flex-wrap gap-2.5">
              {[10, 15, 20, -1].map((cnt) => {
                const isSelected = questionCount === cnt;
                const label = cnt === -1 ? `Tất cả (${totalWords})` : `${cnt} câu`;
                return (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCount(cnt)}
                    className={`min-w-20 rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all duration-200 ${
                      isSelected
                        ? 'border-2 border-accent bg-accent text-accent-contrast shadow-md shadow-accent/20 scale-[1.02]'
                        : 'border border-line bg-surface-elevated text-content hover:border-accent/40 hover:bg-surface'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Taste Skill Action Footer */}
          <div className="mt-10 rounded-2xl border border-line bg-surface-elevated/40 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-content-muted">
                  Sẵn sàng ôn luyện
                </span>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-base font-black text-content">{selectedOpt?.title}</span>
                  <span className="text-sm font-extrabold text-accent-strong">
                    ({activeCountNumber} câu hỏi)
                  </span>
                </div>
              </div>

              <button
                type="button"
                id="btn-start-vocabulary-practice"
                onClick={handleStartPractice}
                className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-accent px-8 text-sm font-black text-accent-contrast shadow-lg shadow-accent/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/30 active:translate-y-0 active:scale-[0.98]"
              >
                <span className="grid size-6 place-items-center rounded-full bg-black/10 transition-transform group-hover:scale-110 dark:bg-white/20">
                  <Play className="size-3.5 fill-current" />
                </span>
                <span>Bắt đầu luyện tập</span>
                <kbd className="hidden sm:inline-flex items-center rounded-md bg-black/10 px-2 py-0.5 text-[10px] font-mono font-bold dark:bg-white/20">
                  ↵ Enter
                </kbd>
              </button>
            </div>
          </div>

          {/* Tip Callout */}
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-line bg-surface-elevated/60 p-4 text-xs font-semibold leading-relaxed text-content-muted">
            <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent-strong">
              <Lightbulb className="size-3.5" />
            </span>
            <p>
              <strong className="text-content font-black">Gợi ý học tập:</strong> Kết hợp giữa{' '}
              <span className="text-content font-bold">nghe – viết</span> và{' '}
              <span className="text-content font-bold">điền theo ngữ cảnh</span> giúp não bộ ghi nhớ phát âm chuẩn lẫn ngữ cảnh sử dụng thực tế trong đề thi TOEIC.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 3: Completion Results
  if (isCompleted) {
    const percent = Math.round((score / sessionWords.length) * 100);
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-line bg-surface p-6 text-center shadow-xl sm:p-8">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-accent/15 text-accent-strong">
          <Trophy className="size-10" />
        </div>
        <h3 className="mt-4 text-2xl font-black text-content">Hoàn thành buổi luyện tập!</h3>
        <p className="mt-1 text-sm text-content-muted">Bạn đã trả lời đúng {score} / {sessionWords.length} câu hỏi ({percent}%).</p>

        {/* Incorrect words list if any */}
        {incorrectWords.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-line bg-surface-elevated p-4 text-left">
            <h4 className="text-xs font-black uppercase tracking-wider text-rose-500">
              Các từ cần chú ý ôn lại ({incorrectWords.length}):
            </h4>
            <div className="mt-2.5 divide-y divide-line">
              {incorrectWords.map((word) => (
                <div key={word.id} className="flex items-center justify-between py-2 text-xs">
                  <div>
                    <span className="font-extrabold text-content">{word.word}</span>
                    <span className="ml-2 font-mono text-content-muted">{word.phonetic}</span>
                    <p className="text-[11px] text-content-muted">{word.meaningVi}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => playPronunciation(word.word, 'US', undefined, word.audioUrl)}
                    className="grid size-7 place-items-center rounded-lg bg-surface text-content hover:text-accent"
                  >
                    <Volume2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-600 dark:text-emerald-400">
            Xuất sắc! Bạn không sai từ nào trong phiên luyện tập này.
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleStartPractice}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-sm font-extrabold text-accent-contrast shadow-md"
          >
            <RotateCcw className="size-4" /> Luyện tập lại
          </button>
          <button
            type="button"
            onClick={() => setIsPlaying(false)}
            className="flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-line bg-surface-elevated px-5 text-sm font-extrabold text-content hover:bg-surface-hover"
          >
            Đổi dạng bài
          </button>
        </div>
      </div>
    );
  }

  // SCREEN 2: Interactive Quiz Runner
  if (!currentWord) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Top Runner Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsPlaying(false)}
          className="text-xs font-extrabold text-content-muted hover:text-content"
        >
          ← Thoát bài tập
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-content">
            Câu {currentIndex + 1} / {sessionWords.length}
          </span>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / sessionWords.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Runner Card */}
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-xl dark:shadow-none sm:p-8">
        {/* EXERCISE 1: Chọn nghĩa (EN -> 4 VI) */}
        {selectedType === 'choose_meaning' && (
          <div className="space-y-6">
            <div className="text-center">
              <span className="rounded-md border border-line bg-surface-elevated px-2 py-0.5 text-[10px] font-black uppercase text-content-muted">
                {currentWord.partOfSpeech}
              </span>
              <h3 className="mt-2 text-3xl font-black text-content sm:text-4xl">
                {currentWord.word}
              </h3>
              <div className="mt-2 flex items-center justify-center gap-2 font-mono text-sm text-sky-600 dark:text-sky-400">
                <span>{currentWord.phonetic}</span>
                <button
                  type="button"
                  onClick={() => playPronunciation(currentWord.word, 'US', undefined, currentWord.audioUrl)}
                  className="grid size-7 place-items-center rounded-lg bg-sky-500/10 text-sky-600 hover:bg-sky-500 hover:text-white"
                >
                  <Volume2 className="size-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {choices.map((choice) => {
                const isChosen = selectedAnswer === choice.id;
                const isTarget = choice.id === currentWord.id;
                let btnStyle = 'border-line bg-surface-elevated hover:border-accent/40 text-content';

                if (isSubmitted) {
                  if (isTarget) {
                    btnStyle = 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold';
                  } else if (isChosen) {
                    btnStyle = 'border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300';
                  } else {
                    btnStyle = 'opacity-40 border-line bg-surface';
                  }
                }

                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={isSubmitted}
                    onClick={() => handleChoiceSelect(choice)}
                    className={`flex items-center justify-between rounded-2xl border p-4 text-left text-sm transition-all ${btnStyle}`}
                  >
                    <span className="font-semibold leading-relaxed">{choice.meaningVi}</span>
                    {isSubmitted && isTarget && (
                      <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
                    )}
                    {isSubmitted && isChosen && !isTarget && (
                      <XCircle className="size-5 shrink-0 text-rose-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* EXERCISE 2: Nhớ mặt chữ (VI -> 4 EN) */}
        {selectedType === 'recall_word' && (
          <div className="space-y-6">
            <div className="text-center">
              <span className="rounded-md border border-line bg-surface-elevated px-2 py-0.5 text-[10px] font-black uppercase text-content-muted">
                {currentWord.partOfSpeech}
              </span>
              <h3 className="mt-2 text-2xl font-black text-content sm:text-3xl">
                {currentWord.meaningVi}
              </h3>
              {currentWord.definitionEn && (
                <p className="mt-2 text-xs text-content-muted italic">{currentWord.definitionEn}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {choices.map((choice) => {
                const isChosen = selectedAnswer === choice.id;
                const isTarget = choice.id === currentWord.id;
                let btnStyle = 'border-line bg-surface-elevated hover:border-accent/40 text-content';

                if (isSubmitted) {
                  if (isTarget) {
                    btnStyle = 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold';
                  } else if (isChosen) {
                    btnStyle = 'border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300';
                  } else {
                    btnStyle = 'opacity-40 border-line bg-surface';
                  }
                }

                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={isSubmitted}
                    onClick={() => handleChoiceSelect(choice)}
                    className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${btnStyle}`}
                  >
                    <div>
                      <span className="block text-base font-black">{choice.word}</span>
                      <span className="font-mono text-xs opacity-75">{choice.phonetic}</span>
                    </div>
                    {isSubmitted && isTarget && (
                      <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* EXERCISE 3: Sắp xếp chữ (Scramble Letters) */}
        {selectedType === 'scramble_letters' && (
          <div className="space-y-6">
            <div className="text-center">
              <span className="text-xs font-black uppercase tracking-wider text-content-muted">
                Xếp các chữ cái thành từ đúng
              </span>
              <h3 className="mt-2 text-xl font-black text-content sm:text-2xl">
                {currentWord.meaningVi}
              </h3>
            </div>

            {/* Answer Display Box */}
            <div className="flex min-h-16 flex-wrap items-center justify-center gap-2 rounded-2xl border border-line bg-surface-elevated p-3">
              {scrambleSelected.map((tile, idx) => (
                <button
                  key={`sel-${idx}`}
                  type="button"
                  disabled={isSubmitted}
                  onClick={() => {
                    setScrambleTiles((prev) => [...prev, tile]);
                    setScrambleSelected((prev) => prev.filter((_, i) => i !== idx));
                  }}
                  className="grid size-11 place-items-center rounded-xl border border-accent bg-accent text-lg font-black text-accent-contrast shadow-sm transition hover:scale-95"
                >
                  {tile.char}
                </button>
              ))}
              {scrambleSelected.length === 0 && (
                <span className="text-xs font-medium text-content-muted">Bấm các chữ cái bên dưới để ghép từ</span>
              )}
            </div>

            {/* Letter Pool Tiles */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {scrambleTiles.map((tile, idx) => (
                <button
                  key={`tile-${tile.originalIndex}`}
                  type="button"
                  disabled={isSubmitted}
                  onClick={() => {
                    const newSelected = [...scrambleSelected, tile];
                    setScrambleSelected(newSelected);
                    setScrambleTiles((prev) => prev.filter((_, i) => i !== idx));
                    if (newSelected.length === currentWord.word.length) {
                      handleTextSubmit(newSelected.map((t) => t.char).join(''));
                    }
                  }}
                  className="grid size-12 place-items-center rounded-2xl border border-line bg-surface text-lg font-black text-content shadow-sm transition hover:border-accent hover:bg-accent/10 active:scale-95"
                >
                  {tile.char}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* EXERCISE 4 & 5: Điền khuyết / Nghe - viết */}
        {(selectedType === 'fill_missing' || selectedType === 'listen_write') && (
          <div className="space-y-6">
            <div className="text-center">
              {selectedType === 'listen_write' ? (
                <>
                  <button
                    type="button"
                    onClick={() => playPronunciation(currentWord.word, 'US', undefined, currentWord.audioUrl)}
                    className="mx-auto flex size-20 items-center justify-center rounded-full bg-accent text-accent-contrast shadow-lg shadow-accent/25 transition hover:scale-105 active:scale-95"
                    aria-label="Phát lại âm thanh"
                  >
                    <Volume2 className="size-10" />
                  </button>
                  <p className="mt-3 text-xs font-bold text-content-muted">Bấm loa để nghe phát âm, sau đó gõ lại từ</p>
                </>
              ) : (
                <>
                  <span className="rounded-md border border-line bg-surface-elevated px-2 py-0.5 text-[10px] font-black uppercase text-content-muted">
                    {currentWord.partOfSpeech}
                  </span>
                  <h3 className="mt-2 text-2xl font-black text-content sm:text-3xl">
                    {currentWord.meaningVi}
                  </h3>
                  <p className="mt-2 font-mono text-2xl font-black tracking-widest text-accent-strong">
                    {currentWord.word
                      .split('')
                      .map((char, i) => (i % 2 === 0 ? char : '_'))
                      .join(' ')}
                  </p>
                </>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleTextSubmit(textAnswer);
              }}
              className="space-y-3"
            >
              <input
                type="text"
                autoFocus
                disabled={isSubmitted}
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder="Gõ từ tiếng Anh vào đây..."
                className="w-full rounded-2xl border border-line bg-surface-elevated p-4 text-center text-lg font-black text-content outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
              />
              {!isSubmitted && (
                <button
                  type="submit"
                  disabled={!textAnswer.trim()}
                  className="group inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-accent px-6 text-sm font-black text-accent-contrast shadow-lg shadow-accent/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/30 active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                >
                  <span>Kiểm tra đáp án</span>
                  <kbd className="inline-flex items-center rounded-lg bg-black/15 px-2 py-0.5 font-mono text-[11px] font-bold text-accent-contrast dark:bg-white/20">
                    ↵ Enter
                  </kbd>
                </button>
              )}
            </form>
          </div>
        )}

        {/* EXERCISE 6: Điền theo ngữ cảnh (Context Cloze) */}
        {selectedType === 'context_cloze' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5 text-center">
              <p className="text-base font-bold text-content leading-relaxed">
                {currentWord.exampleEn.replace(new RegExp(`\\b${currentWord.word}\\b`, 'gi'), '________')}
              </p>
              {currentWord.exampleVi && (
                <p className="mt-2 text-xs italic text-content-muted">{currentWord.exampleVi}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {choices.map((choice) => {
                const isChosen = selectedAnswer === choice.id;
                const isTarget = choice.id === currentWord.id;
                let btnStyle = 'border-line bg-surface-elevated hover:border-accent/40 text-content';

                if (isSubmitted) {
                  if (isTarget) {
                    btnStyle = 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold';
                  } else if (isChosen) {
                    btnStyle = 'border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300';
                  } else {
                    btnStyle = 'opacity-40 border-line bg-surface';
                  }
                }

                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={isSubmitted}
                    onClick={() => handleChoiceSelect(choice)}
                    className={`flex items-center justify-between rounded-2xl border p-4 text-left text-sm font-extrabold transition-all ${btnStyle}`}
                  >
                    <span>{choice.word}</span>
                    {isSubmitted && isTarget && (
                      <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Feedback Reveal & Next Question button */}
        {isSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 border-t border-line pt-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-content-muted">Đáp án chính xác:</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-content">{currentWord.word}</span>
                  <span className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400">
                    {currentWord.phonetic}
                  </span>
                  <span className="text-xs font-semibold text-content-muted">— {currentWord.meaningVi}</span>
                </div>
              </div>

              <button
                type="button"
                autoFocus
                onClick={handleNextQuestion}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-extrabold text-accent-contrast shadow-md hover:bg-accent/90"
              >
                <span>Tiếp tục</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
