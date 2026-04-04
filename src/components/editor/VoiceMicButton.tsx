"use client";

import { useRef, useState, useCallback, useEffect } from "react";

type RecordState = "idle" | "recording" | "preview" | "saving" | "transcribing" | "error";

interface VoiceMicButtonProps {
  onTranscript: (text: string) => void;
  entryId?: string;
  onSaved?: () => void;
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export default function VoiceMicButton({ onTranscript, entryId, onSaved }: VoiceMicButtonProps) {
  const [state, setState] = useState<RecordState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [duration, setDuration] = useState(0); // ms elapsed while recording
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Clean up object URL on unmount or when it changes
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    setErrorMsg(null);
    setDuration(0);

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

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState("preview");
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        setDuration(Date.now() - startTimeRef.current);
      }, 500);

      setState("recording");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Microphone access denied");
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }, []);

  const discard = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    blobRef.current = null;
    setDuration(0);
    setState("idle");
  }, [audioUrl]);

  const saveNote = useCallback(async () => {
    if (!blobRef.current || !entryId) return;
    setState("saving");
    try {
      const formData = new FormData();
      formData.append("audio", blobRef.current, "recording.webm");
      const res = await fetch(`/api/entries/${entryId}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to save");
      onSaved?.();
      discard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save");
      setState("error");
      setTimeout(() => discard(), 4000);
    }
  }, [entryId, onSaved, discard]);

  const transcribe = useCallback(async () => {
    if (!blobRef.current) return;
    setState("transcribing");

    try {
      const formData = new FormData();
      formData.append("audio", blobRef.current, "recording.webm");

      const res = await fetch("/api/ai/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json() as { transcript?: string; error?: string };

      if (!res.ok || !data.transcript) {
        throw new Error(data.error ?? "Transcription failed");
      }

      onTranscript(data.transcript);
      discard();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Transcription failed");
      setState("error");
      setTimeout(() => discard(), 4000);
    }
  }, [onTranscript, discard]);

  // ── Idle: mic button ────────────────────────────────────────────────────────
  if (state === "idle") {
    return (
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={startRecording}
        title="Record voice note"
        className="px-1.5 py-1 rounded text-sm text-base-content/60 hover:text-base-content hover:bg-base-content/8 transition-colors ml-auto"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
        </svg>
      </button>
    );
  }

  // ── Recording: timer + stop ─────────────────────────────────────────────────
  if (state === "recording") {
    return (
      <div className="ml-auto flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
        <span className="text-xs text-red-500 tabular-nums">{formatDuration(duration)}</span>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={stopRecording}
          title="Stop recording"
          className="px-2 py-1 rounded text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
        >
          Stop
        </button>
      </div>
    );
  }

  // ── Preview: playback + actions ─────────────────────────────────────────────
  if (state === "preview") {
    return (
      <div className="ml-auto flex items-center gap-2">
        <audio src={audioUrl ?? undefined} controls className="h-7 w-44 rounded" />
        {entryId && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={saveNote}
            title="Save as voice note"
            className="px-2 py-1 rounded text-xs bg-base-content/10 text-base-content hover:bg-base-content/20 transition-colors whitespace-nowrap"
          >
            Save note
          </button>
        )}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={transcribe}
          title="Transcribe and insert into entry"
          className="px-2 py-1 rounded text-xs bg-indigo-600 text-white hover:bg-indigo-500 transition-colors whitespace-nowrap"
        >
          Transcribe
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={discard}
          title="Discard recording"
          className="px-2 py-1 rounded text-xs text-base-content/50 hover:text-base-content hover:bg-base-content/8 transition-colors"
        >
          Discard
        </button>
      </div>
    );
  }

  // ── Saving ──────────────────────────────────────────────────────────────────
  if (state === "saving") {
    return (
      <div className="ml-auto flex items-center gap-2 text-xs text-base-content/50">
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Saving…
      </div>
    );
  }

  // ── Transcribing ────────────────────────────────────────────────────────────
  if (state === "transcribing") {
    return (
      <div className="ml-auto flex items-center gap-2 text-xs text-indigo-400">
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Transcribing…
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  return (
    <div className="ml-auto flex items-center gap-2 text-xs text-red-400">
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
      <span className="truncate max-w-40">{errorMsg}</span>
    </div>
  );
}
