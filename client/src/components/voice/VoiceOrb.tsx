import React, { useEffect, useRef } from 'react';
import type { AgentState } from '../../hooks/voiceReducer';

/**
 * The assistant's presence: layers of flat, translucent cloud shapes drifting inside a circle.
 * It swells with whoever is speaking. No gradients: depth comes from overlapping flat tones.
 */

type Palette = readonly [string, string, string, string, string];

const PALETTES: Record<'calm' | 'listening' | 'thinking' | 'speaking' | 'quiet', Palette> = {
  calm: ['#2f55c9', '#6d93f2', '#a9c1fb', '#dbe5ff', '#8aa6ee'],
  listening: ['#2a63d6', '#5a95f7', '#9cc4ff', '#e1eeff', '#7fb0fb'],
  thinking: ['#3a47b8', '#6a74e0', '#a3abf0', '#dcdffa', '#8e96e6'],
  speaking: ['#2c6fe0', '#62a4fb', '#a8d3ff', '#eaf5ff', '#86bdfc'],
  quiet: ['#3b4252', '#586174', '#848ea3', '#b7bfcf', '#6d778b'],
};

const paletteFor = (state: AgentState): Palette => {
  switch (state) {
    case 'muted': return PALETTES.quiet;
    case 'thinking': return PALETTES.thinking;
    case 'ai-speaking': return PALETTES.speaking;
    case 'user-speaking':
    case 'listening': return PALETTES.listening;
    default: return PALETTES.calm;
  }
};

const hexToRgb = (hex: string): [number, number, number] => {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const mix = (from: [number, number, number], to: [number, number, number], t: number): [number, number, number] =>
  [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t];

const rgb = (c: [number, number, number], alpha = 1) =>
  `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${alpha})`;

// Each cloud: drift speed, orbit size, size, start angle, vertical squash, opacity, rest height (fraction of radius).
const CLOUDS = [
  { speed: 0.21, orbit: 0.3, size: 0.95, phase: 0.0, squash: 0.5, alpha: 0.34, lift: 0.5 },
  { speed: -0.17, orbit: 0.38, size: 0.8, phase: 1.7, squash: 0.58, alpha: 0.4, lift: 0.28 },
  { speed: 0.27, orbit: 0.34, size: 0.7, phase: 3.1, squash: 0.52, alpha: 0.4, lift: 0.1 },
  { speed: -0.33, orbit: 0.42, size: 0.62, phase: 4.4, squash: 0.66, alpha: 0.42, lift: -0.08 },
  { speed: 0.15, orbit: 0.3, size: 0.85, phase: 5.2, squash: 0.45, alpha: 0.5, lift: -0.3 },
  { speed: -0.24, orbit: 0.36, size: 0.7, phase: 2.4, squash: 0.4, alpha: 0.55, lift: -0.52 },
] as const;

interface VoiceOrbProps {
  state: AgentState;
  /** Loudness 0..1, read every frame (not React state, to avoid re-rendering 60 times a second). */
  getLevel: () => number;
  className?: string;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({ state, getLevel, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const levelRef = useRef(getLevel);
  levelRef.current = getLevel;
  const repaintRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const colors = PALETTES.calm.map(hexToRgb) as [number, number, number][];
    let level = 0;
    let energy = 0.35; // how lively the drift is
    let time = 0;
    let last = performance.now();
    let frame = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const box = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(box.width * ratio));
      canvas.height = Math.max(1, Math.round(box.height * ratio));
    };

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const current = stateRef.current;
      const still = reduced.matches;

      const target = paletteFor(current).map(hexToRgb) as [number, number, number][];
      colors.forEach((c, i) => { colors[i] = mix(c, target[i], still ? 1 : 0.06); });

      const wantedLevel = still ? 0 : levelRef.current();
      level += (wantedLevel - level) * 0.2;
      const wantedEnergy = current === 'thinking' ? 1 : current === 'ai-speaking' || current === 'user-speaking' ? 0.8
        : current === 'muted' || current === 'idle' ? 0.12 : 0.35;
      energy += (wantedEnergy - energy) * 0.05;
      if (!still) time += dt * (0.4 + energy * 1.6);

      const { width, height } = canvas;
      const size = Math.min(width, height);
      const cx = width / 2;
      const cy = height / 2;
      const breathe = still ? 0 : Math.sin(now / 1400) * 0.015;
      const radius = size * (0.3 + breathe + level * 0.075 + (current === 'thinking' ? -0.012 : 0));

      context.clearRect(0, 0, width, height);

      // Quiet rings that ripple outwards with the voice.
      const ringAlpha = Math.min(0.5, 0.1 + level * 0.9);
      [1.14, 1.3].forEach((scale, i) => {
        context.beginPath();
        context.arc(cx, cy, radius * (scale + level * 0.08 * (i + 1)), 0, Math.PI * 2);
        context.lineWidth = Math.max(1, size * 0.004);
        context.strokeStyle = rgb(colors[2], ringAlpha / (i + 1.6));
        context.stroke();
      });

      context.save();
      context.beginPath();
      context.arc(cx, cy, radius, 0, Math.PI * 2);
      context.clip();
      context.fillStyle = rgb(colors[0]);
      context.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

      CLOUDS.forEach((cloud, i) => {
        const angle = cloud.phase + time * cloud.speed * 2.2;
        const x = cx + Math.cos(angle) * radius * cloud.orbit;
        const y = cy - radius * cloud.lift + Math.sin(angle * 0.8) * radius * cloud.orbit * 0.5;
        const r = radius * cloud.size * (1 + level * 0.18);
        context.save();
        context.translate(x, y);
        context.scale(1, cloud.squash);
        context.beginPath();
        context.arc(0, 0, r, 0, Math.PI * 2);
        context.fillStyle = rgb(colors[1 + (i % 4)], cloud.alpha);
        context.fill();
        context.restore();
      });
      context.restore();

      if (!still) frame = requestAnimationFrame(draw);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      last = performance.now();
      if (reduced.matches) draw(last);
      else frame = requestAnimationFrame(draw);
    };

    repaintRef.current = () => { if (reduced.matches) draw(performance.now()); };
    resize();
    start();
    const observer = new ResizeObserver(() => { resize(); if (reduced.matches) draw(performance.now()); });
    observer.observe(canvas);
    reduced.addEventListener('change', start);
    return () => {
      repaintRef.current = null;
      cancelAnimationFrame(frame);
      observer.disconnect();
      reduced.removeEventListener('change', start);
    };
  }, []);

  // With reduced motion there is no animation loop, so repaint when the state changes.
  useEffect(() => {
    repaintRef.current?.();
  }, [state]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`block aspect-square ${className}`} />;
};
