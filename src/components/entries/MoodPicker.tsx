"use client";

import { useState, useRef, useEffect } from "react";
import { MOOD_GROUPS, getMoodByValue, getMoodGroup } from "@/lib/moods";
import { MoodFaceIcon, MoodGroupIcon } from "@/components/ui/MoodIcon";

interface CustomEmotion {
  id: string;
  label: string;
  value: string;
  groupId: string;
}

interface MoodPickerProps {
  value: string;
  onChange: (mood: string) => void;
  customEmotions?: CustomEmotion[];
}

export default function MoodPicker({ value, onChange, customEmotions = [] }: MoodPickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSelectedGroupId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const currentGroup = value ? getMoodGroup(value) : null;
  const currentEmotion = value ? getMoodByValue(value) : null;
  // For custom emotions not in lib, fall back to group lookup from customEmotions list
  const currentCustom = !currentEmotion && value
    ? customEmotions.find((c) => c.value === value)
    : null;

  const activeGroup = selectedGroupId
    ? MOOD_GROUPS.find((g) => g.id === selectedGroupId) ?? null
    : null;

  function handleEmotionClick(emotionValue: string) {
    onChange(emotionValue);
    setOpen(false);
    setSelectedGroupId(null);
  }

  function handleClear() {
    onChange("");
    setOpen(false);
    setSelectedGroupId(null);
  }

  const displayLabel = currentEmotion?.label ?? currentCustom?.label ?? (value || "Mood");
  const hasValue = Boolean(value);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setSelectedGroupId(null); }}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm transition-colors ${
          hasValue
            ? `${currentGroup?.textClass ?? "text-foreground/60"} bg-foreground/5 hover:bg-foreground/10`
            : "text-foreground/40 hover:text-foreground/70 hover:bg-foreground/5"
        }`}
      >
        {hasValue ? (
          <>
            <MoodFaceIcon value={value} size={15} />
            <span className="capitalize">{displayLabel}</span>
          </>
        ) : (
          <span>Mood</span>
        )}
      </button>

      {/* Backdrop (mobile only) */}
      {open && (
        <div
          className="fixed inset-0 z-20 sm:hidden"
          onClick={() => { setOpen(false); setSelectedGroupId(null); }}
        />
      )}

      {/* Panel — bottom sheet on mobile, popover on desktop */}
      {open && (
        <div className="fixed bottom-0 left-0 right-0 z-30 sm:absolute sm:bottom-auto sm:right-0 sm:left-auto sm:top-full sm:mt-1.5 sm:w-72 bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 sm:slide-in-from-top-1 duration-150">
          {!activeGroup ? (
            /* Screen 1 — group selection */
            <div className="p-3 pb-safe">
              <p className="text-xs text-foreground/40 font-semibold uppercase tracking-wider px-1 mb-2.5">
                How are you feeling?
              </p>
              <div className="space-y-1.5">
                {MOOD_GROUPS.map((group) => {
                  const groupCustom = customEmotions.filter((c) => c.groupId === group.id);
                  const totalCount = group.emotions.length + groupCustom.length;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-opacity hover:opacity-80 ${group.colorClass}`}
                    >
                      <MoodGroupIcon groupId={group.id} size={18} className={group.textClass} />
                      <span className={`text-sm font-medium flex-1 ${group.textClass}`}>
                        {group.label}
                      </span>
                      <span className={`text-xs opacity-60 ${group.textClass}`}>
                        {totalCount}
                      </span>
                    </button>
                  );
                })}
              </div>
              {hasValue && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="w-full mt-2.5 text-xs text-foreground/40 hover:text-foreground/70 py-1.5 transition-colors"
                >
                  Clear mood
                </button>
              )}
            </div>
          ) : (
            /* Screen 2 — specific emotion selection */
            <div className="p-3 pb-safe">
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setSelectedGroupId(null)}
                  className="p-1 rounded-lg text-foreground/40 hover:text-foreground/70 hover:bg-foreground/5 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <MoodGroupIcon groupId={activeGroup.id} size={16} className={activeGroup.textClass} />
                <span className={`text-sm font-semibold ${activeGroup.textClass}`}>
                  {activeGroup.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  ...activeGroup.emotions,
                  ...customEmotions
                    .filter((c) => c.groupId === activeGroup.id)
                    .map((c) => ({ value: c.value, label: c.label, expression: "neutral" as const })),
                ].map((emotion) => (
                  <button
                    key={emotion.value}
                    type="button"
                    onClick={() => handleEmotionClick(emotion.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors ${
                      value === emotion.value
                        ? `${activeGroup.colorClass} ring-1 ring-inset ${activeGroup.textClass.replace("text-", "ring-")}`
                        : "hover:bg-foreground/5"
                    }`}
                  >
                    <MoodFaceIcon
                      value={emotion.value}
                      size={17}
                      className={value === emotion.value ? activeGroup.textClass : "text-foreground/40"}
                    />
                    <span className={`text-xs ${value === emotion.value ? `${activeGroup.textClass} font-medium` : "text-foreground/70"}`}>
                      {emotion.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
