"use client";

import { useState } from "react";
import { getMoodColor, getMoodLabel, getMoodBgClass, getMoodTextClass } from "@/lib/moods";
import { MoodFaceIcon } from "@/components/ui/MoodIcon";

interface DataPoint {
  date: string; // YYYY-MM-DD
  mood: string;
}

interface MoodTimelineProps {
  data: DataPoint[];
}

function groupByMonth(data: DataPoint[]): { month: string; label: string; points: DataPoint[] }[] {
  const map = new Map<string, DataPoint[]>();
  for (const d of data) {
    const key = d.date.slice(0, 7); // YYYY-MM
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, points]) => {
      const [year, m] = month.split("-");
      const label = new Date(Number(year), Number(m) - 1, 1).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      return { month, label, points };
    });
}

export default function MoodTimeline({ data }: MoodTimelineProps) {
  const [tooltip, setTooltip] = useState<{ date: string; mood: string } | null>(null);

  const months = groupByMonth(data);
  // Show last 6 months only if there are many
  const visible = months.length > 6 ? months.slice(-6) : months;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="flex gap-6 min-w-0 pb-1">
          {visible.map(({ month, label, points }) => (
            <div key={month} className="flex flex-col gap-2 min-w-0 shrink-0">
              <p className="text-xs text-foreground/40 font-medium whitespace-nowrap">{label}</p>
              <div className="flex flex-wrap gap-1.5" style={{ maxWidth: "160px" }}>
                {points.map((p, i) => (
                  <div key={i} className="relative group">
                    <button
                      type="button"
                      onMouseEnter={() => setTooltip(p)}
                      onMouseLeave={() => setTooltip(null)}
                      onFocus={() => setTooltip(p)}
                      onBlur={() => setTooltip(null)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${getMoodBgClass(p.mood)}`}
                      aria-label={`${getMoodLabel(p.mood)} on ${p.date}`}
                    >
                      <MoodFaceIcon value={p.mood} size={14} className={getMoodTextClass(p.mood)} />
                    </button>
                    {/* Tooltip */}
                    {tooltip?.date === p.date && tooltip?.mood === p.mood && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-10 pointer-events-none">
                        <div className="bg-foreground text-background text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                          <div className="font-medium">{getMoodLabel(p.mood)}</div>
                          <div className="opacity-60 text-[10px]">{new Date(p.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend — one dot per group */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-border">
        {[
          { id: "bright", label: "Bright", color: "bg-amber-400",  text: "text-amber-600 dark:text-amber-400"  },
          { id: "calm",   label: "Calm",   color: "bg-emerald-400", text: "text-emerald-600 dark:text-emerald-400" },
          { id: "low",    label: "Low",    color: "bg-sky-400",     text: "text-sky-600 dark:text-sky-400"     },
          { id: "tense",  label: "Tense",  color: "bg-rose-400",    text: "text-rose-600 dark:text-rose-400"   },
          { id: "mixed",  label: "Mixed",  color: "bg-neutral-400", text: "text-foreground/50"                 },
        ].map((g) => (
          <div key={g.id} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${g.color}`} />
            <span className="text-xs text-foreground/50">{g.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
