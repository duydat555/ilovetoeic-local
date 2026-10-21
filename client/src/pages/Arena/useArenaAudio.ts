import { useCallback, useEffect, useRef, useState } from "react";
import type { ArenaMatch } from "../../services/arena";
import { ArenaAudio } from "./arenaAudio";

const KEY = "toeic_arena_sound_enabled";
export function useArenaAudio(
  match: ArenaMatch | null,
  userId: string | undefined,
  seconds: number,
  countdown: number,
) {
  const [sound, setSound] = useState(() => {
    try {
      return localStorage.getItem(KEY) !== "false";
    } catch {
      return true;
    }
  });
  const audio = useRef<ArenaAudio | null>(null);
  const seen = useRef(new Set<string>());
  const soundRef = useRef(sound);
  soundRef.current = sound;
  useEffect(() => {
    const engine = new ArenaAudio();
    audio.current = engine;
    engine.setEnabled(soundRef.current);
    const unlock = () => {
      if (soundRef.current) void engine.unlock();
    };
    const visibility = () => {
      void engine.visibilityChanged();
    };
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
      document.removeEventListener("visibilitychange", visibility);
      engine.dispose();
      audio.current = null;
    };
  }, []);
  useEffect(() => {
    audio.current?.setBackground(
      !(match?.status === "playing" && match.mode === "listening"),
    );
  }, [match?.mode, match?.status]);
  const once = useCallback(
    (key: string, cue: Parameters<ArenaAudio["play"]>[0]) => {
      if (seen.current.has(key)) return;
      seen.current.add(key);
      if (seen.current.size > 200)
        seen.current.delete(seen.current.values().next().value!);
      audio.current?.play(cue);
    },
    [],
  );
  useEffect(() => {
    if (!match) return;
    const key = match.id;
    if (match.players.length === 2 && match.status === "waiting")
      once(`${key}:found`, "found");
    if (match.status === "playing" && countdown > 0 && countdown <= 3)
      once(`${key}:countdown:${countdown}`, "tick");
    if (match.status === "playing" && countdown <= 0) {
      once(`${key}:${match.round}:round`, "round");
      if (match.feedback)
        once(
          `${key}:${match.round}:answer`,
          match.feedback.correct ? "correct" : "wrong",
        );
      else if (seconds > 0 && seconds <= 3)
        once(`${key}:${match.round}:tick:${seconds}`, "tick");
    }
    if (match.status === "finished")
      once(
        `${key}:result`,
        !match.winnerId ? "draw" : match.winnerId === userId ? "win" : "lose",
      );
  }, [match, seconds, countdown, userId, once]);
  const toggleSound = useCallback(() => {
    const next = !soundRef.current;
    soundRef.current = next;
    setSound(next);
    try {
      localStorage.setItem(KEY, String(next));
    } catch {
      /* Optional preference storage. */
    }
    audio.current?.setEnabled(next);
    if (next)
      void audio.current?.unlock().then(() => audio.current?.play("correct"));
  }, []);
  const playTap = useCallback(() => audio.current?.play("tap"), []);
  return { sound, toggleSound, playTap };
}
