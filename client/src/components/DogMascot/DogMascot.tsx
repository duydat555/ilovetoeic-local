import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import { DogAction, DogMascotProps, DogMascotHandle } from './dogTypes';
import './DogMascot.css';

const SLEEP_TIMEOUT = 25000;
const BLINK_MIN = 2000;
const BLINK_MAX = 5000;

export const DogMascot = forwardRef<DogMascotHandle, DogMascotProps>(
  (
    {
      size = 160,
      interactive = true,
      onInteraction,
      className = '',
    },
    ref
  ) => {
    const containerRef = useRef<HTMLButtonElement>(null);
    const rigRef = useRef<HTMLDivElement>(null);
    const [action, setAction] = useState<DogAction>('idle');
    const actionRef = useRef<DogAction>('idle');

    const sleepTimerRef = useRef<number | null>(null);
    const blinkTimerRef = useRef<number | null>(null);
    const actionResetTimerRef = useRef<number | null>(null);

    // Multi-click combo tracking for funny Easter eggs!
    const clickCountRef = useRef<number>(0);
    const lastClickTimeRef = useRef<number>(0);

    const updateAction = useCallback((newAction: DogAction) => {
      setAction(newAction);
      actionRef.current = newAction;
      if (onInteraction) onInteraction(newAction);
    }, [onInteraction]);

    useImperativeHandle(ref, () => ({
      play: (newAction: DogAction) => {
        updateAction(newAction);
        resetToIdleAfter(newAction);
      },
      getCurrentAction: () => actionRef.current,
    }));

    const resetSleepTimer = useCallback(() => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = window.setTimeout(() => {
        if (actionRef.current === 'idle') {
          updateAction('sleep');
        }
      }, SLEEP_TIMEOUT);
    }, [updateAction]);

    const resetToIdleAfter = (currentAction: DogAction) => {
      const durationMap: Partial<Record<DogAction, number>> = {
        jump: 800,
        'double-jump': 1000,
        happy: 2000,
        excited: 2500,
        surprised: 1500,
        love: 2500,
        lick: 1200,
        dance: 2000,
        derp: 2000,
        dizzy: 2500,
        cool: 3000,
        wink: 1800,
        shock: 1800,
      };

      const duration = durationMap[currentAction] || 1200;

      if (actionResetTimerRef.current) clearTimeout(actionResetTimerRef.current);
      actionResetTimerRef.current = window.setTimeout(() => {
        updateAction('idle');
        resetSleepTimer();
      }, duration);
    };

    const scheduleBlink = useCallback(() => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
      const nextBlink = Math.random() * (BLINK_MAX - BLINK_MIN) + BLINK_MIN;

      blinkTimerRef.current = window.setTimeout(() => {
        if (containerRef.current && actionRef.current !== 'sleep' && actionRef.current !== 'happy' && actionRef.current !== 'dizzy') {
          containerRef.current.classList.add('is-blinking');

          const isDouble = Math.random() > 0.8;

          setTimeout(() => {
            containerRef.current?.classList.remove('is-blinking');
            if (isDouble) {
              setTimeout(() => {
                containerRef.current?.classList.add('is-blinking');
                setTimeout(() => containerRef.current?.classList.remove('is-blinking'), 150);
              }, 100);
            }
          }, 150);
        }
        scheduleBlink();
      }, nextBlink);
    }, []);

    useEffect(() => {
      resetSleepTimer();
      scheduleBlink();
      return () => {
        if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
        if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
        if (actionResetTimerRef.current) clearTimeout(actionResetTimerRef.current);
      };
    }, [resetSleepTimer, scheduleBlink]);

    useEffect(() => {
      if (!interactive) return;

      let rafId: number;
      let targetX = 0;
      let targetY = 0;
      let currentX = 0;
      let currentY = 0;
      const LERP = 0.12;

      let mouseX = 0;
      let mouseY = 0;
      let hasMouseMoved = false;

      let lastMouseX = 0;
      let lastMouseY = 0;
      let lastMouseTime = performance.now();

      const handleMouseMove = (e: MouseEvent) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        hasMouseMoved = true;

        if (!containerRef.current) return;

        if (actionRef.current === 'sleep') {
          updateAction('wake');
          resetToIdleAfter('wake');
        } else {
          resetSleepTimer();
        }

        const now = performance.now();
        const dt = now - lastMouseTime;
        if (dt > 0) {
          const dxMouse = e.clientX - lastMouseX;
          const dyMouse = e.clientY - lastMouseY;
          const velocity = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse) / dt;

          // Ultra fast mouse shake triggers SHOCK expression!
          if (velocity > 12 && actionRef.current === 'idle') {
            updateAction('shock');
            resetToIdleAfter('shock');
          } else if (velocity > 7 && actionRef.current === 'idle') {
            updateAction('surprised');
            resetToIdleAfter('surprised');
          }
        }
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        lastMouseTime = now;
      };

      const animate = () => {
        if (hasMouseMoved && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          const deltaX = mouseX - centerX;
          const deltaY = mouseY - centerY;
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

          if (distance > 5 && actionRef.current !== 'sleep') {
            const intensity = Math.min(distance / 150, 1);
            const angle = Math.atan2(deltaY, deltaX);
            targetX = Math.cos(angle) * intensity;
            targetY = Math.sin(angle) * intensity;
          } else {
            targetX = 0;
            targetY = 0;
          }
        }

        currentX += (targetX - currentX) * LERP;
        currentY += (targetY - currentY) * LERP;

        if (rigRef.current) {
          // 2.5D Parallax System
          const headX = currentX * 12;
          const headY = currentY * 8;
          const headRot = currentX * 10;

          const eyesX = currentX * 16;
          const eyesY = currentY * 10;

          const muzzleX = currentX * 22;
          const muzzleY = currentY * 14;

          const pupilX = currentX * 6;
          const pupilY = currentY * 4;

          const earLRot = -12 + currentX * 18 + currentY * 8;
          const earRRot = 12 + currentX * 18 - currentY * 8;

          rigRef.current.style.setProperty('--head-x', `${headX}px`);
          rigRef.current.style.setProperty('--head-y', `${headY}px`);
          rigRef.current.style.setProperty('--head-rot', `${headRot}deg`);

          rigRef.current.style.setProperty('--eyes-x', `${eyesX}px`);
          rigRef.current.style.setProperty('--eyes-y', `${eyesY}px`);

          rigRef.current.style.setProperty('--muzzle-x', `${muzzleX}px`);
          rigRef.current.style.setProperty('--muzzle-y', `${muzzleY}px`);

          rigRef.current.style.setProperty('--pupil-x', `${pupilX}px`);
          rigRef.current.style.setProperty('--pupil-y', `${pupilY}px`);

          rigRef.current.style.setProperty('--ear-l-rot', `${earLRot}deg`);
          rigRef.current.style.setProperty('--ear-r-rot', `${earRRot}deg`);
        }

        rafId = requestAnimationFrame(animate);
      };

      window.addEventListener('mousemove', handleMouseMove);
      rafId = requestAnimationFrame(animate);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        cancelAnimationFrame(rafId);
      };
    }, [interactive, resetSleepTimer, updateAction]);

    const handlePointerEnter = () => {
      if (!interactive) return;
      if (actionRef.current === 'idle') {
        updateAction('hover');
      } else if (actionRef.current === 'sleep') {
        updateAction('wake');
        resetToIdleAfter('wake');
      }
    };

    const handlePointerLeave = () => {
      if (!interactive) return;
      if (actionRef.current === 'hover') {
        updateAction('idle');
      }
    };

    const actionIndexRef = useRef<number>(0);
    const ACTION_CYCLE: DogAction[] = [
      'jump',
      'derp',
      'wink',
      'happy',
      'excited',
      'love',
      'dizzy',
      'cool',
      'double-jump',
      'surprised',
      'shock',
    ];

    const handleClick = () => {
      if (!interactive) return;

      resetSleepTimer();

      if (actionRef.current === 'sleep') {
        updateAction('wake');
        resetToIdleAfter('wake');
        return;
      }

      // Cycle to the NEXT distinct action on EVERY SINGLE CLICK!
      const nextIndex = (actionIndexRef.current + 1) % ACTION_CYCLE.length;
      actionIndexRef.current = nextIndex;
      const nextAction = ACTION_CYCLE[nextIndex];

      updateAction(nextAction);
      resetToIdleAfter(nextAction);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    };

    const style = {
      width: `${size}px`,
      height: `${size}px`,
    } as React.CSSProperties;

    return (
      <button
        ref={containerRef}
        className={`kawaii-dog-container action-${action} ${className}`}
        style={style}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        type="button"
        aria-label="Cưng nựng chú chó Tinh Tú"
      >
        <div className="ground-lines">
          <div className="dash-line left" />
          <div className="ground-shadow" />
          <div className="dash-line right" />
        </div>
        <div className="kawaii-shadow" />

        <div className="kawaii-rig" ref={rigRef}>
          {/* Tail */}
          <div className="kawaii-tail">
            <div className="tail-tip" />
          </div>

          {/* Body Layer */}
          <div className="kawaii-body">
            <div className="kawaii-chest-fur" />
          </div>

          {/* Paws */}
          <div className="kawaii-paws">
            <div className="paw left" />
            <div className="paw right" />
          </div>

          {/* Collar */}
          <div className="kawaii-collar">
            <div className="collar-bell" />
          </div>

          {/* Head Unit */}
          <div className="kawaii-head">
            {/* Ears behind head */}
            <div className="kawaii-ears">
              <div className="ear left"><div className="ear-inner" /></div>
              <div className="ear right"><div className="ear-inner" /></div>
            </div>

            {/* Base Head Surface */}
            <div className="kawaii-face-base">
              <div className="face-white-mask" />
            </div>

            {/* Parallax Layer 1: Eyes, Blush & Sunglasses */}
            <div className="kawaii-eyes-layer">
              <div className="blush left" />
              <div className="blush right" />

              <div className="eye left">
                <div className="pupil" />
                <div className="sparkle-main" />
                <div className="sparkle-sub" />
                <div className="spiral" />
              </div>
              <div className="eye right">
                <div className="pupil" />
                <div className="sparkle-main" />
                <div className="sparkle-sub" />
                <div className="spiral" />
              </div>

              {/* Thug Life / Cool Sunglasses */}
              <div className="kawaii-shades">
                <div className="lens left" />
                <div className="lens right" />
                <div className="bridge" />
              </div>
            </div>

            {/* Parallax Layer 2: Muzzle, Nose & Mouth */}
            <div className="kawaii-muzzle-layer">
              <div className="muzzle-white-bg" />
              <div className="kawaii-nose">
                <div className="nose-shine" />
              </div>
              <div className="kawaii-mouth">
                <div className="mouth-w left" />
                <div className="mouth-w right" />
                <div className="kawaii-tongue" />
              </div>
            </div>

          </div>
        </div>

        {/* Floating Effects */}
        <div className="kawaii-effects">
          <div className="fx-heart h-1">♥</div>
          <div className="fx-heart h-2">♥</div>
          <div className="fx-heart h-3">♥</div>
          <div className="fx-z z-1">Z</div>
          <div className="fx-z z-2">z</div>
          <div className="fx-z z-3">z</div>
          <div className="fx-star star-1">★</div>
          <div className="fx-star star-2">✦</div>
        </div>
      </button>
    );
  }
);

DogMascot.displayName = 'DogMascot';
