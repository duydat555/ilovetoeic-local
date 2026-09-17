import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BookOpenText, Headphones } from 'lucide-react';
import { PracticeSkill } from '../../data/practiceByLevelData';
import { useLanguage } from '../../context/LanguageContext';

interface SkillToggleProps {
  value: PracticeSkill;
  onChange: (skill: PracticeSkill) => void;
  className?: string;
}

export const SkillToggle: React.FC<SkillToggleProps> = ({ value, onChange, className = '' }) => {
  const reduceMotion = useReducedMotion();
  const { language } = useLanguage();

  const SKILLS = [
    { id: 'listening' as const, label: language === 'en' ? 'Listening' : 'Nghe', icon: Headphones },
    { id: 'reading' as const, label: language === 'en' ? 'Reading' : 'Đọc', icon: BookOpenText },
  ];

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextValue = event.key === 'ArrowLeft' || event.key === 'Home' ? 'listening' : 'reading';
    onChange(nextValue);
    window.requestAnimationFrame(() => {
      document.getElementById(`practice-skill-${nextValue}`)?.focus();
    });
  };

  return (
    <div
      className={`relative inline-grid grid-cols-2 rounded-full bg-surface-elevated p-1 ring-1 ring-inset ring-line ${className}`}
      role="tablist"
      aria-label={language === 'en' ? 'Select practice skill' : 'Chọn kỹ năng luyện tập'}
    >
      <motion.span
        className="pointer-events-none absolute inset-y-1 left-1 w-[calc((100%_-_0.5rem)/2)] rounded-full bg-accent shadow-[0_4px_14px_-6px_rgba(138,94,21,.55)] will-change-transform"
        initial={false}
        animate={{ x: value === 'reading' ? '100%' : '0%' }}
        transition={reduceMotion
          ? { duration: 0 }
          : { duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        aria-hidden="true"
      />

      {SKILLS.map((skill) => {
        const Icon = skill.icon;
        const selected = value === skill.id;
        return (
          <button
            id={`practice-skill-${skill.id}`}
            key={skill.id}
            type="button"
            role="tab"
            tabIndex={selected ? 0 : -1}
            aria-selected={selected}
            aria-controls={`${skill.id}-parts`}
            onClick={() => onChange(skill.id)}
            onKeyDown={handleKeyDown}
            className={`relative z-10 flex min-w-[6.75rem] items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold transition-colors duration-200 active:scale-[.98] sm:min-w-[7.25rem] ${
              selected
                ? 'text-accent-contrast'
                : 'text-content-muted hover:text-content'
            }`}
          >
            <motion.span
              className="grid place-items-center"
              animate={{ scale: selected && !reduceMotion ? 1.05 : 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeInOut' }}
              aria-hidden="true"
            >
              <Icon className="size-4" strokeWidth={2.25} />
            </motion.span>
            <span>{skill.label}</span>
          </button>
        );
      })}
    </div>
  );
};
