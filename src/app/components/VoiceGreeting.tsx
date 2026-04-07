"use client";
import { useEffect, useRef } from "react";

const STORAGE_KEY = "voiceGreetingLastPlayed";

export function VoiceGreeting() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(STORAGE_KEY) === today) return;

    const audio = new Audio("/api/greeting");
    audioRef.current = audio;
    audio
      .play()
      .then(() => {
        localStorage.setItem(STORAGE_KEY, today);
      })
      .catch(() => {
        // Browsers block autoplay without user gesture; fail silently.
      });

    return () => {
      audio.pause();
    };
  }, []);

  return null;
}
