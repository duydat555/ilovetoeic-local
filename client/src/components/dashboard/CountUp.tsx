import React, { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  end: number;
  start?: number;
  duration?: number; // in milliseconds
  prefix?: string;
  suffix?: string;
  className?: string;
}

/** Easing function: easeOutExpo */
const easeOutExpo = (t: number): number => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

export const CountUp: React.FC<CountUpProps> = ({
  end,
  start = 0,
  duration = 1600,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const [count, setCount] = useState<number>(start);
  const elementRef = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef<boolean>(false);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          let startTime: number | null = null;
          let animationFrameId: number;

          const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easedProgress = easeOutExpo(progress);
            const currentCount = Math.floor(start + (end - start) * easedProgress);

            setCount(currentCount);

            if (progress < 1) {
              animationFrameId = requestAnimationFrame(step);
            } else {
              setCount(end);
            }
          };

          animationFrameId = requestAnimationFrame(step);

          return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
          };
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [end, start, duration]);

  return (
    <span ref={elementRef} className={`tabular-nums inline-block ${className}`}>
      {prefix}
      {count.toLocaleString('vi-VN')}
      {suffix}
    </span>
  );
};
