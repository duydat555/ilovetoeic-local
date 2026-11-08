/**
 * Gapless playback of streamed 16-bit PCM (24 kHz mono) chunks, with a loudness meter
 * and an instant flush for when the learner interrupts.
 */

const SAMPLE_RATE = 24000;

export interface PcmPlayer {
  /** Queue one chunk (raw little-endian PCM16). */
  enqueue: (pcm: ArrayBuffer) => void;
  /** Drop everything queued or playing, immediately. */
  flush: () => void;
  isPlaying: () => boolean;
  /** Loudness 0..1 of what is coming out of the speakers. */
  getLevel: () => number;
  /** Called when the last queued chunk finishes. */
  onIdle: (callback: () => void) => void;
  close: () => void;
}

export const createPcmPlayer = (): PcmPlayer => {
  const context = new AudioContext({ sampleRate: SAMPLE_RATE, latencyHint: 'interactive' });
  const analyser = context.createAnalyser();
  analyser.fftSize = 512;
  analyser.connect(context.destination);
  const samples = new Float32Array(analyser.fftSize);

  const active = new Set<AudioBufferSourceNode>();
  let nextStart = 0;
  let idleCallback: (() => void) | null = null;

  const enqueue = (pcm: ArrayBuffer) => {
    if (context.state === 'suspended') void context.resume();
    const view = new Int16Array(pcm, 0, Math.floor(pcm.byteLength / 2));
    if (view.length === 0) return;
    const buffer = context.createBuffer(1, view.length, SAMPLE_RATE);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < view.length; i++) channel[i] = view[i] / 32768;

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(analyser);
    // A small lead keeps the first chunk from being clipped; later chunks butt up against each other.
    const startAt = Math.max(context.currentTime + 0.03, nextStart);
    source.start(startAt);
    nextStart = startAt + buffer.duration;
    active.add(source);
    source.onended = () => {
      active.delete(source);
      if (active.size === 0 && idleCallback) idleCallback();
    };
  };

  return {
    enqueue,
    flush: () => {
      active.forEach((source) => {
        source.onended = null;
        try { source.stop(); } catch { /* already finished */ }
        source.disconnect();
      });
      active.clear();
      nextStart = 0;
      if (idleCallback) idleCallback();
    },
    isPlaying: () => active.size > 0,
    getLevel: () => {
      if (active.size === 0) return 0;
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
      return Math.min(1, Math.sqrt(sum / samples.length) * 4);
    },
    onIdle: (callback) => { idleCallback = callback; },
    close: () => { idleCallback = null; void context.close(); },
  };
};
