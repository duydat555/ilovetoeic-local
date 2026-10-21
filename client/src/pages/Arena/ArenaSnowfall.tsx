import { useEffect, useRef } from "react";

/** Decorative canvas: no React renders per frame, no pointer interception. */
export function ArenaSnowfall() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !parent || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0,
      height = 0,
      frame = 0,
      previous = 0;
    let flakes: {
      x: number;
      y: number;
      size: number;
      speed: number;
      phase: number;
      opacity: number;
    }[] = [];
    const paint = (time: number) => {
      const delta = Math.min((time - previous) / 1000 || 0, 0.05);
      previous = time;
      ctx.clearRect(0, 0, width, height);
      for (const flake of flakes) {
        if (!reduced.matches) {
          flake.y += flake.speed * delta;
          flake.x += Math.sin(time / 1900 + flake.phase) * delta * 10;
          if (flake.y > height + 14) {
            flake.y = -14;
            flake.x = Math.random() * width;
          }
        }
        ctx.globalAlpha = flake.opacity;
        ctx.strokeStyle = "#e3f5ff";
        ctx.fillStyle = "#effaff";
        if (flake.size < 2.4) {
          ctx.beginPath();
          ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * i) / 3 + flake.phase;
            const x = Math.cos(angle) * flake.size,
              y = Math.sin(angle) * flake.size;
            ctx.moveTo(flake.x - x, flake.y - y);
            ctx.lineTo(flake.x + x, flake.y + y);
          }
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };
    const animate = (time: number) => {
      if (document.hidden || reduced.matches) return;
      if (time - previous >= 1000 / 30) paint(time);
      frame = requestAnimationFrame(animate);
    };
    const restart = () => {
      cancelAnimationFrame(frame);
      previous = performance.now();
      paint(previous);
      if (!reduced.matches && !document.hidden)
        frame = requestAnimationFrame(animate);
    };
    const resize = () => {
      width = parent.clientWidth;
      height = parent.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      flakes = Array.from({ length: width < 640 ? 38 : 85 }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: i % 4 === 0 ? 4 + Math.random() * 3 : 0.8 + Math.random() * 1.6,
        speed: 14 + Math.random() * 28,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.16 + Math.random() * 0.38,
      }));
      restart();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    reduced.addEventListener("change", restart);
    document.addEventListener("visibilitychange", restart);
    resize();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      reduced.removeEventListener("change", restart);
      document.removeEventListener("visibilitychange", restart);
    };
  }, []);
  return <canvas ref={ref} className="arena-snowfall" aria-hidden="true" />;
}
