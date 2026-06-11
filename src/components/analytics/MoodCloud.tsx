"use client";

import { getMoodGroup, getMoodLabel } from "@/lib/moods";
import { MoodFaceIcon } from "@/components/ui/MoodIcon";

// ─── Per-group pill colors tuned for the dark surface-dark background ─────────

const GROUP_PILL: Record<string, { bg: string; text: string; ring: string }> = {
  bright: { bg: "bg-amber-400/20",   text: "text-amber-300",   ring: "ring-amber-400/30"   },
  calm:   { bg: "bg-emerald-400/20", text: "text-emerald-300", ring: "ring-emerald-400/30" },
  low:    { bg: "bg-sky-400/20",     text: "text-sky-300",     ring: "ring-sky-400/30"     },
  tense:  { bg: "bg-rose-400/20",    text: "text-rose-300",    ring: "ring-rose-400/30"    },
  mixed:  { bg: "bg-white/8",        text: "text-white/45",    ring: "ring-white/15"       },
};

interface MoodCloudProps {
  /** Sorted descending by count: [[moodValue, count], ...] */
  data: [string, number][];
}

export default function MoodCloud({ data }: MoodCloudProps) {
  if (data.length === 0) {
    return <p className="text-sm text-surface-dark-foreground/40">No mood data yet.</p>;
  }

  const max = data[0][1];

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {data.map(([mood, count]) => {
        const group = getMoodGroup(mood);
        const pill = group ? (GROUP_PILL[group.id] ?? GROUP_PILL.mixed) : GROUP_PILL.mixed;

        // t ∈ [0, 1] — 1 = most frequent
        const t = max > 0 ? count / max : 0;

        // Scale font: 11px → 20px
        const fontSize = Math.round(11 + t * 9);
        // Scale horizontal padding: 8px → 14px
        const px = Math.round(8 + t * 6);
        // Scale vertical padding: 4px → 8px
        const py = Math.round(4 + t * 4);
        // Scale icon: 12px → 18px
        const iconSize = Math.round(12 + t * 6);

        return (
          <div
            key={mood}
            title={`${getMoodLabel(mood)} · ${count} ${count === 1 ? "entry" : "entries"}`}
            className={`inline-flex items-center gap-1.5 rounded-full ring-1 select-none cursor-default transition-opacity hover:opacity-75 ${pill.bg} ${pill.text} ${pill.ring}`}
            style={{
              fontSize: `${fontSize}px`,
              paddingLeft:  `${px}px`,
              paddingRight: `${px}px`,
              paddingTop:   `${py}px`,
              paddingBottom:`${py}px`,
              lineHeight: 1.3,
            }}
          >
            <MoodFaceIcon value={mood} size={iconSize} />
            {getMoodLabel(mood)}
          </div>
        );
      })}
    </div>
  );
}
