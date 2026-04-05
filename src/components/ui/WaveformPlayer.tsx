"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface Props {
  src: string;
  barCount?: number;
  className?: string;
}

function formatTime(s: number) {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

async function computeWaveform(src: string, bars: number): Promise<number[]> {
  const res = await fetch(src);
  const arrayBuffer = await res.arrayBuffer();
  const audioCtx = new AudioContext();
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / bars);
    const amplitudes: number[] = [];
    for (let i = 0; i < bars; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[i * blockSize + j]);
      }
      amplitudes.push(sum / blockSize);
    }
    const max = Math.max(...amplitudes, 0.001);
    return amplitudes.map((a) => a / max);
  } finally {
    await audioCtx.close();
  }
}

export default function WaveformPlayer({ src, barCount = 52, className = "" }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1
  const [displayTime, setDisplayTime] = useState(0); // seconds

  // Compute waveform once
  useEffect(() => {
    let cancelled = false;
    computeWaveform(src, barCount)
      .then((bars) => { if (!cancelled) setWaveform(bars); })
      .catch(() => { if (!cancelled) setWaveform(Array(barCount).fill(0.35)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [src, barCount]);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    isPlaying ? a.pause() : a.play();
  }, [isPlaying]);

  function handleTimeUpdate() {
    const a = audioRef.current;
    if (!a) return;
    setProgress(a.duration ? a.currentTime / a.duration : 0);
    setDisplayTime(a.currentTime);
  }

  function handleLoadedMetadata() {
    const a = audioRef.current;
    if (a) setDisplayTime(a.duration);
  }

  function handleEnded() {
    const a = audioRef.current;
    setIsPlaying(false);
    setProgress(0);
    if (a) { a.currentTime = 0; setDisplayTime(a.duration); }
  }

  function handleScrub(e: React.MouseEvent<HTMLDivElement>) {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
  }

  const activeCount = Math.round(progress * barCount);

  return (
    <div className={`flex items-center gap-2.5 bg-base-300/60 rounded-full px-3 py-2 ${className}`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
      />

      {/* Play / Pause */}
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-base-content/10 hover:bg-base-content/20 disabled:opacity-30 transition-colors"
      >
        {isPlaying ? (
          <svg className="w-3 h-3 text-base-content" fill="currentColor" viewBox="0 0 24 24">
            <rect x="5" y="4" width="4" height="16" rx="1" />
            <rect x="15" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="w-3 h-3 text-base-content ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Waveform */}
      <div
        className="flex-1 flex items-center gap-[2px] h-7 cursor-pointer select-none overflow-hidden"
        onClick={handleScrub}
      >
        {(loading ? Array(barCount).fill(0.3) : waveform).map((h, i) => (
          <div
            key={i}
            className={`flex-1 max-w-[4px] min-w-[2px] shrink-0 rounded-full ${
              loading
                ? "bg-base-content/10 animate-pulse"
                : i < activeCount
                  ? "bg-indigo-400"
                  : "bg-base-content/20"
            }`}
            style={{ height: `${Math.max(12, Math.round(h * 100))}%` }}
          />
        ))}
      </div>

      {/* Time */}
      <span className="text-xs tabular-nums text-base-content/40 shrink-0 w-9 text-right">
        {formatTime(displayTime)}
      </span>
    </div>
  );
}
