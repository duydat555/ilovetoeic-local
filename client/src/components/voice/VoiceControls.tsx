import React, { useState } from 'react';
import { ArrowUp, Mic, MicOff, X } from 'lucide-react';
import { focusRing } from './voiceTheme';

interface VoiceControlsProps {
  muted: boolean;
  disabled?: boolean;
  onToggleMute: () => void;
  onEnd: () => void;
  onSend: (text: string) => void;
}

const round = `grid size-12 shrink-0 place-items-center rounded-full transition-colors ${focusRing}`;

export const VoiceControls: React.FC<VoiceControlsProps> = ({ muted, disabled, onToggleMute, onEnd, onSend }) => {
  const [text, setText] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text);
    setText('');
  };

  return (
    <div className="flex w-full items-center gap-2.5">
      <form onSubmit={submit} className="relative min-w-0 flex-1">
        <label htmlFor="voice-text" className="sr-only">Gõ câu hỏi cho trợ lý</label>
        <input
          id="voice-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={disabled}
          maxLength={500}
          autoComplete="off"
          placeholder="Hoặc gõ câu hỏi ở đây"
          className={`h-12 w-full rounded-full border border-[var(--vo-line)] bg-[var(--vo-surface)] pl-5 pr-14 text-[15px] text-[var(--vo-text)] placeholder:text-[var(--vo-muted)] disabled:opacity-50 ${focusRing}`}
        />
        {text.trim() && (
          <button
            type="submit"
            aria-label="Gửi câu hỏi"
            className={`absolute right-1.5 top-1.5 grid size-9 place-items-center rounded-full bg-[var(--vo-accent)] text-[var(--vo-ground)] ${focusRing}`}
          >
            <ArrowUp className="size-5" strokeWidth={2.4} aria-hidden="true" />
          </button>
        )}
      </form>

      <button
        type="button"
        onClick={onToggleMute}
        disabled={disabled}
        aria-pressed={muted}
        aria-label={muted ? 'Bật micro' : 'Tắt micro'}
        className={`${round} border border-[var(--vo-line)] disabled:opacity-50 ${
          muted ? 'bg-[var(--vo-warm)] text-[var(--vo-ground)]' : 'bg-[var(--vo-surface)] text-[var(--vo-text)] hover:bg-[var(--vo-surface-2)]'
        }`}
      >
        {muted ? <MicOff className="size-5" aria-hidden="true" /> : <Mic className="size-5" aria-hidden="true" />}
      </button>

      <button
        type="button"
        onClick={onEnd}
        aria-label="Kết thúc cuộc trò chuyện"
        className={`${round} bg-[var(--vo-text)] text-[var(--vo-ground)] hover:bg-white`}
      >
        <X className="size-6" strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  );
};
