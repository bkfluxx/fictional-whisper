"use client";

import { useRef, useState, useCallback } from "react";

type RecordState = "idle" | "recording" | "transcribing" | "error";

interface VoiceMicButtonProps {
  onTranscript: (text: string) => void;
}

export default function VoiceMicButton({ onTranscript }: VoiceMicButtonProps) {
  const [state, setState] = useState<RecordState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/ogg")
          ? "audio/ogg"
          : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setState("transcribing");

        try {
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");

          const res = await fetch("/api/ai/transcribe", {
            method: "POST",
            body: formData,
          });

          const data = await res.json() as { transcript?: string; error?: string };

          if (!res.ok || !data.transcript) {
            throw new Error(data.error ?? "Transcription failed");
          }

          onTranscript(data.transcript);
          setState("idle");
        } catch (err) {
          setErrorMsg(err instanceof Error ? err.message : "Transcription failed");
          setState("error");
          setTimeout(() => setState("idle"), 4000);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setState("recording");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Microphone access denied");
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }, []);

  function handleClick() {
    if (state === "recording") {
      stopRecording();
    } else if (state === "idle") {
      startRecording();
    }
  }

  const title =
    state === "recording"
      ? "Stop recording"
      : state === "transcribing"
        ? "Transcribing…"
        : state === "error"
          ? (errorMsg ?? "Error")
          : "Record voice note";

  return (
    <div className="relative ml-auto flex items-center">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleClick}
        disabled={state === "transcribing"}
        title={title}
        className={`px-1.5 py-1 rounded text-sm transition-colors disabled:opacity-50 ${
          state === "recording"
            ? "text-red-500 animate-pulse hover:text-red-400"
            : state === "error"
              ? "text-red-400"
              : state === "transcribing"
                ? "text-indigo-400"
                : "text-base-content/60 hover:text-base-content hover:bg-base-content/8"
        }`}
      >
        {state === "transcribing" ? (
          /* spinner */
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          /* mic icon */
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
          </svg>
        )}
      </button>

      {/* Inline error tooltip */}
      {state === "error" && errorMsg && (
        <span className="absolute right-full mr-2 whitespace-nowrap text-xs text-red-400 bg-base-100 border border-red-400/30 rounded px-2 py-0.5">
          {errorMsg}
        </span>
      )}
    </div>
  );
}
