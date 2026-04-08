"use client";
import { useEffect, useRef } from "react";

const STORAGE_KEY = "voiceGreetingLastPlayed";

export function VoiceGreeting() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedRef = useRef(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(STORAGE_KEY) === today) return;

    function play() {
      if (playedRef.current) return;
      playedRef.current = true;

      const audio = new Audio("/api/greeting");
      audio.volume = 0.4;
      audioRef.current = audio;
      audio
        .play()
        .then(() => {
          localStorage.setItem(STORAGE_KEY, today);
        })
        .catch(() => {});

      document.removeEventListener("click", play);
      document.removeEventListener("keydown", play);
      document.removeEventListener("touchstart", play);
    }

    // Try autoplay first, fall back to first interaction
    const audio = new Audio("/api/greeting");
    audio.volume = 0.4;
    audioRef.current = audio;
    audio
      .play()
      .then(() => {
        playedRef.current = true;
        localStorage.setItem(STORAGE_KEY, today);
      })
      .catch(() => {
        // Autoplay blocked — wait for user interaction
        document.addEventListener("click", play, { once: true });
        document.addEventListener("keydown", play, { once: true });
        document.addEventListener("touchstart", play, { once: true });
      });

    return () => {
      audio.pause();
      document.removeEventListener("click", play);
      document.removeEventListener("keydown", play);
      document.removeEventListener("touchstart", play);
    };
  }, []);

  return null;
}
