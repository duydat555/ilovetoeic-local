import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { getModalMotion } from "../../components/common/modalMotion";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";

export function ArenaDialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const motionProps = getModalMotion(useReducedMotion());
  useBodyScrollLock(true);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [close]);
  return createPortal(
    <motion.div
      className="arena-dialog-backdrop"
      {...motionProps.backdrop}
      onClick={close}
    >
      <motion.div
        ref={ref}
        className="arena-dialog arena-surface"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        {...motionProps.panel}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button
            aria-label="Đóng"
            className="arena-icon-button"
            onClick={close}
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </motion.div>
    </motion.div>,
    document.body,
  );
}
