import { useCallback, useEffect, useReducer, useRef } from 'react';
import { createPcmPlayer, type PcmPlayer } from '../audio/pcmPlayer';
import { MicPermissionError, MicUnsupportedError, startMicCapture, type MicCapture } from '../audio/micCapture';
import { aiService, getVoiceSocketUrl, type VoiceSettings } from '../services/ai';
import { hasConversation, initialVoiceState, voiceReducer, type ServerEvent } from './voiceReducer';

const SEQ_HEADER_BYTES = 4;
const SUMMARY_WAIT_MS = 45_000;

export const useVoiceSession = (settings: VoiceSettings) => {
  const [state, dispatch] = useReducer(voiceReducer, initialVoiceState);
  const socketRef = useRef<WebSocket | null>(null);
  const micRef = useRef<MicCapture | null>(null);
  const playerRef = useRef<PcmPlayer | null>(null);
  const summaryTimer = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const teardown = useCallback(() => {
    if (summaryTimer.current) window.clearTimeout(summaryTimer.current);
    summaryTimer.current = null;
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket) {
      socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close();
    }
    micRef.current?.stop();
    micRef.current = null;
    playerRef.current?.close();
    playerRef.current = null;
  }, []);

  useEffect(() => teardown, [teardown]);

  const send = useCallback((payload: object) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
  }, []);

  const handleMessage = useCallback((message: MessageEvent) => {
    if (message.data instanceof ArrayBuffer) {
      playerRef.current?.enqueue(message.data.slice(SEQ_HEADER_BYTES));
      return;
    }
    let event: ServerEvent;
    try {
      event = JSON.parse(message.data as string) as ServerEvent;
    } catch {
      return;
    }
    // Learner talking over the assistant: silence it at once, even for audio already buffered here.
    if (event.type === 'interrupted' || (event.type === 'state' && event.value === 'user-speaking')) {
      playerRef.current?.flush();
    }
    dispatch({ type: 'event', event });
    if (event.type === 'summary') window.setTimeout(teardown, 0); // the conversation is over: free mic and speaker
  }, [teardown]);

  const start = useCallback(async () => {
    if (stateRef.current.phase === 'connecting' || stateRef.current.phase === 'live') return;
    dispatch({ type: 'connect' });
    try {
      // Created inside the click, so the browser lets it play sound.
      const player = createPcmPlayer();
      playerRef.current = player;

      const socket = new WebSocket(getVoiceSocketUrl());
      socket.binaryType = 'arraybuffer';
      socketRef.current = socket;

      // Handlers go on right away: the microphone permission prompt below can outlast the connection,
      // and an onopen attached afterwards would never fire.
      let started = false;
      socket.onopen = () => {
        const { captions: _captions, ...serverSettings } = settings;
        socket.send(JSON.stringify({ type: 'start', token: aiService.getToken(), settings: serverSettings }));
        started = true;
      };
      socket.onmessage = handleMessage;
      socket.onclose = () => dispatch({ type: 'socket_closed' });
      socket.onerror = () => dispatch({ type: 'local_error', code: 'closed', message: 'Không kết nối được. Bạn thử lại nhé.' });

      const mic = await startMicCapture((pcm) => {
        if (started && socket.readyState === WebSocket.OPEN) socket.send(pcm);
      });
      micRef.current = mic;
    } catch (error) {
      teardown();
      const message = error instanceof MicPermissionError || error instanceof MicUnsupportedError
        ? error.message
        : 'Không thể bắt đầu cuộc trò chuyện.';
      dispatch({ type: 'local_error', code: 'mic', message });
    }
  }, [handleMessage, settings, teardown]);

  const end = useCallback(() => {
    if (!hasConversation(stateRef.current)) {
      teardown();
      dispatch({ type: 'reset' });
      return false;
    }
    dispatch({ type: 'ending' });
    playerRef.current?.flush();
    send({ type: 'end' });
    summaryTimer.current = window.setTimeout(() => {
      teardown();
      dispatch({ type: 'reset' });
    }, SUMMARY_WAIT_MS);
    return true;
  }, [send, teardown]);

  const leave = useCallback(() => {
    teardown();
    dispatch({ type: 'reset' });
  }, [teardown]);

  const setMuted = useCallback((value: boolean) => {
    micRef.current?.setMuted(value);
    dispatch({ type: 'mute', value });
    send({ type: 'mute', value });
  }, [send]);

  const sendText = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    playerRef.current?.flush();
    send({ type: 'text', text: trimmed });
  }, [send]);

  /** Loudness 0..1 for the orb: the assistant's voice while it talks, otherwise the learner's. */
  const getLevel = useCallback(() => {
    const player = playerRef.current;
    if (player?.isPlaying()) return player.getLevel();
    return micRef.current?.getLevel() ?? 0;
  }, []);

  const isAssistantAudible = useCallback(() => !!playerRef.current?.isPlaying(), []);

  return { state, start, end, leave, setMuted, sendText, getLevel, isAssistantAudible };
};
