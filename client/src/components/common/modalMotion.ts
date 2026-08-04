import type { MotionProps } from 'framer-motion';

interface ModalMotionContract {
  backdrop: Pick<MotionProps, 'initial' | 'animate' | 'exit' | 'transition'>;
  panel: Pick<MotionProps, 'initial' | 'animate' | 'exit' | 'transition'>;
}

const PANEL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const getModalMotion = (reduceMotion: boolean | null): ModalMotionContract => ({
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: reduceMotion ? 0.1 : 0.2, ease: 'easeOut' },
  },
  panel: {
    initial: reduceMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 16, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: reduceMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 8, scale: 0.99 },
    transition: {
      duration: reduceMotion ? 0.1 : 0.24,
      ease: PANEL_EASE,
    },
  },
});
