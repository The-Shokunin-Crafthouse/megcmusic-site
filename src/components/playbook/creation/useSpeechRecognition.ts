"use client";

/**
 * Web Speech API dictation for the idea-entry mic (spec §Screen 5 /
 * sprint brief §3.5): "feature-detect `window.SpeechRecognition ||
 * window.webkitSpeechRecognition` at RUNTIME and render the mic ONLY if
 * present" — iOS standalone PWAs frequently lack this even where Safari
 * itself supports it, so the check happens in a `useEffect` (client-only,
 * after mount), never assumed from the UA string.
 *
 * Device-test findings this rewrite answers (installed PWA, iPhone):
 * activating the mic recorded nothing, and there was no way out of the
 * listening state short of force-quitting. Four causes, all of them the
 * hook silently absorbing a failure:
 *
 *  1. `onerror` was `() => setListening(false)` — the event carries the
 *     reason (`not-allowed`, `service-not-allowed`, `audio-capture`,
 *     `no-speech`) and every one of them was discarded. A denied or
 *     unprompted microphone permission is indistinguishable from "she
 *     said nothing", which is exactly the reported symptom.
 *  2. `start()` was unguarded. It throws `InvalidStateError` if the
 *     recogniser is already running, which leaves `listening` true with no
 *     live session behind it — a state nothing could clear.
 *  3. Nothing ever timed out. If `onend`/`onerror` never fire (the
 *     documented WebKit behaviour when a PWA has no microphone access at
 *     all), the pulsing ring runs forever. A watchdog now closes the
 *     session and says so.
 *  4. `continuous = true` is not honoured on iOS — the session ends at the
 *     first pause. Requesting it made the end look like a bug rather than
 *     the platform's one-utterance model; the hook now expects a single
 *     utterance and reports the end plainly.
 *
 * Permission is requested explicitly through `getUserMedia` before the
 * recogniser starts, so a refusal surfaces as a refusal instead of as
 * silence. The tracks are stopped immediately — the call is for the
 * prompt and the yes/no, not to hold the microphone open.
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

interface SpeechRecognitionErrorEventLike extends Event {
  error?: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
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

/** Copy for each failure the API can report. Written for Meghan, not for a
 *  console: every one of these is actionable or explicitly a dead end. */
const ERROR_COPY: Record<string, string> = {
  "not-allowed":
    "Dictation needs microphone access. Turn it on in Settings → Safari → Microphone, then try again.",
  "service-not-allowed":
    "This device won't let the app use dictation. Type the idea instead — it works exactly the same.",
  "audio-capture":
    "No microphone available. Type the idea instead — it works exactly the same.",
  "no-speech": "Didn't catch that. Tap the mic and try again.",
  aborted: "",
  network: "Dictation needs a connection. Type the idea instead for now.",
};

const FALLBACK_ERROR =
  "Dictation didn't work on this device. Type the idea instead — it works exactly the same.";

/** Nothing heard and no end event: WebKit can leave a session open
 *  indefinitely when a standalone PWA has no microphone access. */
const WATCHDOG_MS = 12_000;

interface UseSpeechRecognitionOptions {
  /** Called with each newly-finalized chunk of transcript (not the whole
   *  session's accumulated text — the caller decides how to merge it). */
  onResult: (transcript: string) => void;
}

export function useSpeechRecognition({ onResult }: UseSpeechRecognitionOptions) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const processedCountRef = useRef(0);
  const heardAnythingRef = useRef(false);
  const watchdogRef = useRef<number | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    setSupported(getSpeechRecognitionCtor() !== null);
  }, []);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current !== null) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  /** Tears the session down locally regardless of whether the engine ever
   *  answers — the UI must never depend on an event that may not come. */
  const teardown = useCallback(() => {
    clearWatchdog();
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    setListening(false);
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      if (recognition.abort) recognition.abort();
      else recognition.stop();
    } catch {
      // Already stopped, or a recogniser that refuses to stop — the local
      // state is what the UI reads, and it is already cleared.
    }
  }, [clearWatchdog]);

  useEffect(() => teardown, [teardown]);

  /** Explicit stop — the visible Stop control and the mic's own re-tap. */
  const cancel = useCallback(() => {
    teardown();
    setError(null);
  }, [teardown]);

  const start = useCallback(async () => {
    if (recognitionRef.current) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError(FALLBACK_ERROR);
      return;
    }

    setError(null);

    // Ask for the microphone first, so a refusal is reported as a refusal.
    // Absent `mediaDevices` (older standalone WebKit), fall through and let
    // the recogniser's own error path speak.
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        setError(ERROR_COPY["not-allowed"]);
        return;
      }
    }

    const recognition = new Ctor();
    // Single utterance: iOS ends the session at the first pause whatever
    // this is set to, so asking for continuous only made the end look
    // like a failure.
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    processedCountRef.current = 0;
    heardAnythingRef.current = false;

    recognition.onresult = (event) => {
      let appended = "";
      for (let i = processedCountRef.current; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          appended += `${result[0].transcript.trim()} `;
          processedCountRef.current = i + 1;
        }
      }
      if (appended.trim()) {
        heardAnythingRef.current = true;
        onResultRef.current(appended.trim());
      }
    };

    recognition.onerror = (event) => {
      const code = event?.error ?? "";
      const copy = code in ERROR_COPY ? ERROR_COPY[code] : FALLBACK_ERROR;
      if (copy) setError(copy);
      teardown();
    };

    recognition.onend = () => {
      if (!heardAnythingRef.current) setError(ERROR_COPY["no-speech"]);
      teardown();
    };

    try {
      recognition.start();
    } catch {
      // `InvalidStateError` — a recogniser that thinks it is already
      // running. Nothing is listening, so say so rather than leaving the
      // ring spinning over a dead session.
      setError(FALLBACK_ERROR);
      return;
    }

    recognitionRef.current = recognition;
    setListening(true);

    clearWatchdog();
    watchdogRef.current = window.setTimeout(() => {
      if (!heardAnythingRef.current) setError(FALLBACK_ERROR);
      teardown();
    }, WATCHDOG_MS);
  }, [clearWatchdog, teardown]);

  return { supported, listening, error, start, cancel };
}
