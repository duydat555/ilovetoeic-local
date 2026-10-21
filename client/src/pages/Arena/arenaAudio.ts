type Cue =
  | "tap"
  | "found"
  | "round"
  | "tick"
  | "correct"
  | "wrong"
  | "win"
  | "lose"
  | "draw";

/** Original synthesized music/effects; no downloads or copyrighted audio. */
export class ArenaAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | undefined;
  private enabled = true;
  private background = false;
  private step = 0;
  private disposed = false;

  async unlock() {
    if (this.disposed || !this.enabled) return;
    try {
      const Constructor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Constructor) return;
      if (!this.ctx) {
        this.ctx = new Constructor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.65;
        this.master.connect(this.ctx.destination);
      } else if (this.ctx.state === "running") return;
      if (this.ctx.state === "suspended") await this.ctx.resume();
      this.updateBackground();
    } catch {
      /* Unsupported/blocked audio must not break a match. */
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.ctx && this.master)
      this.master.gain.setTargetAtTime(
        enabled ? 0.65 : 0,
        this.ctx.currentTime,
        0.015,
      );
    this.updateBackground();
  }

  setBackground(enabled: boolean) {
    this.background = enabled;
    this.updateBackground();
  }

  private note(
    frequency: number,
    delay: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine",
  ) {
    const ctx = this.ctx;
    if (
      !this.enabled ||
      !ctx ||
      !this.master ||
      ctx.state !== "running" ||
      document.hidden
    )
      return;
    const oscillator = ctx.createOscillator(),
      gain = ctx.createGain();
    const start = ctx.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  play(cue: Cue) {
    if (cue === "tap") this.note(740, 0, 0.08, 0.055);
    else if (cue === "tick") this.note(880, 0, 0.1, 0.085, "triangle");
    else {
      const melody: Record<Exclude<Cue, "tap" | "tick">, number[]> = {
        found: [392, 523, 784],
        round: [523, 659],
        correct: [659, 880, 1047],
        wrong: [294, 220],
        win: [523, 659, 784, 1047, 1319],
        lose: [392, 330, 262],
        draw: [523, 659, 523],
      };
      melody[cue].forEach((frequency, i) =>
        this.note(
          frequency,
          i * 0.11,
          0.26,
          0.12,
          cue === "wrong" || cue === "lose" ? "triangle" : "sine",
        ),
      );
    }
  }

  private updateBackground() {
    clearInterval(this.timer);
    this.timer = undefined;
    if (
      !this.background ||
      !this.enabled ||
      this.ctx?.state !== "running" ||
      document.hidden
    )
      return;
    // Quiet winter bell motif. Listening questions suppress the music bed.
    const motif = [
      523.25, 659.25, 783.99, 659.25, 587.33, 739.99, 880, 739.99, 440, 523.25,
      659.25, 523.25, 392, 493.88, 587.33, 493.88,
    ];
    const next = () => {
      this.note(motif[this.step % motif.length], 0, 1.1, 0.026);
      if (this.step % 4 === 0)
        this.note(motif[this.step % motif.length] / 2, 0, 1.8, 0.018);
      this.step += 1;
    };
    next();
    this.timer = setInterval(next, 550);
  }

  async visibilityChanged() {
    if (document.hidden) {
      clearInterval(this.timer);
      this.timer = undefined;
      await this.ctx?.suspend().catch(() => undefined);
    } else if (this.ctx && this.enabled) {
      await this.unlock();
    }
  }

  dispose() {
    this.disposed = true;
    clearInterval(this.timer);
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.master = null;
  }
}
