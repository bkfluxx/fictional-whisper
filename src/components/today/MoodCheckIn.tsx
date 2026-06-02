"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MOOD_GROUPS, getMoodLabel } from "@/lib/moods";
import { MoodGroupIcon, MoodFaceIcon, MoodPill } from "@/components/ui/MoodIcon";

interface MoodCheckInProps {
  todayStr: string;
  lastMood?: string | null;
}

type Phase = "idle" | "group-selected" | "done";

export default function MoodCheckIn({ todayStr, lastMood }: MoodCheckInProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [confirmedEmotion, setConfirmedEmotion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeGroup = selectedGroupId
    ? MOOD_GROUPS.find((g) => g.id === selectedGroupId) ?? null
    : null;

  async function handleEmotionSelect(emotionValue: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "", mood: emotionValue, entryDate: todayStr, entryType: "mood" }),
      });
      if (!res.ok) throw new Error("Failed to log mood");
      setConfirmedEmotion(emotionValue);
      setPhase("done");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPhase("idle");
    setSelectedGroupId(null);
    setConfirmedEmotion(null);
    setError(null);
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      {phase === "idle" && (
        <>
          <p className="text-xs font-semibold uppercase tracking-widest text-foreground/40 mb-3">
            How are you feeling?
          </p>
          <div className="flex gap-2">
            {MOOD_GROUPS.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => { setSelectedGroupId(group.id); setPhase("group-selected"); }}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-opacity hover:opacity-80 ${group.colorClass}`}
              >
                <MoodGroupIcon groupId={group.id} size={20} className={group.textClass} />
                <span className={`text-[10px] font-medium leading-none ${group.textClass}`}>
                  {group.label}
                </span>
              </button>
            ))}
          </div>
          {lastMood && (
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
              <span className="text-xs text-foreground/35">Last logged</span>
              <MoodPill value={lastMood} />
            </div>
          )}
        </>
      )}

      {phase === "group-selected" && activeGroup && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => { setSelectedGroupId(null); setPhase("idle"); }}
              className="p-1 rounded-lg text-foreground/40 hover:text-foreground/70 hover:bg-foreground/5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <MoodGroupIcon groupId={activeGroup.id} size={16} className={activeGroup.textClass} />
            <span className={`text-sm font-semibold ${activeGroup.textClass}`}>{activeGroup.label}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {activeGroup.emotions.map((emotion) => (
              <button
                key={emotion.value}
                type="button"
                disabled={loading}
                onClick={() => handleEmotionSelect(emotion.value)}
                className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl transition-colors hover:bg-foreground/5 disabled:opacity-40`}
              >
                <MoodFaceIcon value={emotion.value} size={22} className="text-foreground/50" />
                <span className="text-[10px] text-foreground/60 leading-none text-center">
                  {emotion.label}
                </span>
              </button>
            ))}
          </div>
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        </>
      )}

      {phase === "done" && confirmedEmotion && (
        <div className="flex items-center gap-3 py-1">
          <div className={`p-2 rounded-xl ${MOOD_GROUPS.find((g) => g.emotions.some((e) => e.value === confirmedEmotion))?.colorClass ?? ""}`}>
            <MoodFaceIcon
              value={confirmedEmotion}
              size={24}
              className={MOOD_GROUPS.find((g) => g.emotions.some((e) => e.value === confirmedEmotion))?.textClass ?? "text-foreground/60"}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground capitalize">
              {getMoodLabel(confirmedEmotion)}
            </p>
            <p className="text-xs text-foreground/40">Mood logged</p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-foreground/40 hover:text-foreground/70 transition-colors"
          >
            Log another
          </button>
        </div>
      )}
    </div>
  );
}
