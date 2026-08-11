import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

interface TopToastProps {
  message: string;
}

export const TopToast: React.FC<TopToastProps> = ({ message }) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0, x: '-50%' } : { opacity: 0, x: '-50%', y: -18 }}
      animate={{ opacity: 1, x: '-50%', y: 0 }}
      exit={reduceMotion ? { opacity: 0, x: '-50%' } : { opacity: 0, x: '-50%', y: -10 }}
      transition={{ duration: reduceMotion ? 0.1 : 0.22, ease: 'easeOut' }}
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-5 z-[120] flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 shadow-xl dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300"
    >
      <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
      {message}
    </motion.div>
  );
};
