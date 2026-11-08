/**
 * Microphone capture for voice mode.
 * Emits mono 16-bit PCM at 16 kHz in 40 ms frames, whatever rate the device really runs at.
 */

const TARGET_RATE = 16000;
const FRAME_SAMPLES = 640; // 40 ms

const WORKLET_SOURCE = `
class PcmCapture extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.ratio = sampleRate / ${TARGET_RATE};
    this.pos = 0;
    this.last = 0;
    this.out = new Int16Array(${FRAME_SAMPLES});
    this.n = 0;
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;
    for (let i = 0; i < channel.length; i++) {
      const cur = channel[i];
      while (this.pos < 1) {
        const v = this.last + (cur - this.last) * this.pos;
        const s = Math.max(-1, Math.min(1, v));
        this.out[this.n++] = s < 0 ? s * 32768 : s * 32767;
        if (this.n === this.out.length) {
          const frame = this.out.slice(0).buffer;
          this.port.postMessage(frame, [frame]);
          this.n = 0;
        }
        this.pos += this.ratio;
      }
      this.pos -= 1;
      this.last = cur;
    }
    return true;
  }
}
registerProcessor('pcm-capture', PcmCapture);
`;

export class MicPermissionError extends Error {}
export class MicUnsupportedError extends Error {}

export interface MicCapture {
  /** Current loudness 0..1 of what the microphone hears. */
  getLevel: () => number;
  setMuted: (muted: boolean) => void;
  stop: () => void;
}

export const isMicSupported = () =>
  typeof navigator !== 'undefined'
  && !!navigator.mediaDevices?.getUserMedia
  && typeof AudioContext !== 'undefined'
  && typeof AudioWorkletNode !== 'undefined';

export const startMicCapture = async (onFrame: (pcm: ArrayBuffer) => void): Promise<MicCapture> => {
  if (!isMicSupported()) throw new MicUnsupportedError('Trình duyệt này chưa hỗ trợ ghi âm.');

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (error) {
    throw new MicPermissionError(
      error instanceof DOMException && error.name === 'NotFoundError'
        ? 'Không tìm thấy micro trên thiết bị này.'
        : 'Bạn cần cho phép dùng micro để trò chuyện.',
    );
  }

  const context = new AudioContext({ latencyHint: 'interactive' });
  const moduleUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: 'application/javascript' }));
  try {
    await context.audioWorklet.addModule(moduleUrl);
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }
  if (context.state === 'suspended') await context.resume();

  const source = context.createMediaStreamSource(stream);
  const worklet = new AudioWorkletNode(context, 'pcm-capture', { numberOfOutputs: 0 });
  const analyser = context.createAnalyser();
  analyser.fftSize = 512;
  const samples = new Float32Array(analyser.fftSize);

  let muted = false;
  worklet.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
    if (!muted) onFrame(event.data);
  };
  source.connect(worklet);
  source.connect(analyser);

  return {
    getLevel: () => {
      if (muted) return 0;
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
      return Math.min(1, Math.sqrt(sum / samples.length) * 4);
    },
    setMuted: (value: boolean) => {
      muted = value;
      stream.getAudioTracks().forEach((track) => { track.enabled = !value; });
    },
    stop: () => {
      worklet.port.onmessage = null;
      source.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      void context.close();
    },
  };
};
