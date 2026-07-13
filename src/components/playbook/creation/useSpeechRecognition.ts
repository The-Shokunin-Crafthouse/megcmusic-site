"use client";

/**
 * Web Speech API dictation for the idea-entry mic (spec §Screen 5 /
 * sprint brief §3.5): "feature-detect `window.SpeechRecognition ||
 * window.webkitSpeechRecognition` at RUNTIME and render the mic ONLY if
 * present" — iOS standalone PWAs frequently lack this even where Safari
 * itself supports it, so the check happens in a `useEffect` (client-only,
 * after mount), never assumed from the UA string.
 *
 * The Web Speech API has no TypeScript lib.dom types in this project's
 * target — the interfaces below are the minimal ambient shape this hook
 * actually reads/writes, not a full spec transcription.
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike extends Event {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechWindow {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as SpeechWindow;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface UseSpeechRecognitionOptions {
  /** Called with each newly-finalized chunk of transcript (not the whole
   *  session's accumulated text — the caller decides how to merge it). */
  onResult: (transcript: string) => void;
}

export function useSpeechRecognition({ onResult }: UseSpeechRecognitionOptions) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const processedCountRef = useRef(0);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    setSupported(getSpeechRecognitionCtor() !== null);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const toggle = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    processedCountRef.current = 0;

    recognition.onresult = (event) => {
      let appended = "";
      for (let i = processedCountRef.current; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          appended += `${result[0].transcript.trim()} `;
          processedCountRef.current = i + 1;
        }
      }
      if (appended.trim()) onResultRef.current(appended.trim());
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening]);

  return { supported, listening, toggle };
}
