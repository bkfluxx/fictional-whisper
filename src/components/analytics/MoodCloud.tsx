"use client";

import { getMoodGroup, getMoodLabel } from "@/lib/moods";
import { MoodFaceIcon } from "@/components/ui/MoodIcon";

// ─── Per-group pill colors for the default (light) surface ────────────────────

const GROUP_PILL: Record<string, { bg: string; text: string; ring: string }> = {
  bright: { bg: "bg-amber-500/10",   text: "text-amber-600 dark:text-amber-400",   ring: "ring-amber-500/20"   },
  calm:   { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/20" },
  low:    { bg: "bg-sky-500/10",     text: "text-sky-600 dark:text-sky-400",       ring: "ring-sky-500/20"     },
  tense:  { bg: "bg-rose-500/10",    text: "text-rose-600 dark:text-rose-400",     ring: "ring-rose-500/20"    },
  mixed:  { bg: "bg-foreground/5",   text: "text-foreground/55",                   ring: "ring-foreground/10"  },
};

interface MoodCloudProps {
  /** Sorted descending by count: [[moodValue, count], ...] */
  data: [string, number][];
}

export default function MoodCloud({ data }: MoodCloudProps) {
  if (data.length === 0) {
    return <p className="text-sm text-foreground/30">No mood data yet.</p>;
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
