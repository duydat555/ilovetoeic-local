import React from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { BookOpenText, Headphones } from 'lucide-react';
import { PracticeSkill } from '../../data/practiceByLevelData';

interface SkillToggleProps {
  value: PracticeSkill;
  onChange: (skill: PracticeSkill) => void;
  className?: string;
}

const SKILLS = [
  { id: 'listening' as const, label: 'Nghe', icon: Headphones },
  { id: 'reading' as const, label: 'Đọc', icon: BookOpenText },
];

export const SkillToggle: React.FC<SkillToggleProps> = ({ value, onChange, className = '' }) => {
  const reduceMotion = useReducedMotion();

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
    <LayoutGroup id="practice-skill-toggle">
      <div
        className={`inline-grid grid-cols-2 rounded-full bg-surface-elevated p-1 ring-1 ring-inset ring-line ${className}`}
        role="tablist"
        aria-label="Chọn kỹ năng luyện tập"
      >
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
              className={`relative isolate flex min-w-[6.75rem] items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold transition-colors duration-200 active:scale-[.98] sm:min-w-[7.25rem] ${
                selected
                  ? 'text-accent-contrast'
                  : 'text-content-muted hover:text-content'
              }`}
            >
              {selected && (
                <motion.span
                  layoutId="practice-skill-active-indicator"
                  className="absolute inset-0 -z-10 rounded-full bg-accent shadow-[0_4px_14px_-6px_rgba(138,94,21,.55)]"
                  transition={reduceMotion
                    ? { duration: 0 }
                    : { duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                />
              )}
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
    </LayoutGroup>
  );
};
