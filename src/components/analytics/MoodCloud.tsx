"use client";

import { getMoodGroup, getMoodLabel, MOOD_GROUPS } from "@/lib/moods";
import { MoodFaceIcon } from "@/components/ui/MoodIcon";

const GROUP_PILL: Record<string, { bg: string; text: string; ring: string }> = {
  bright: { bg: "bg-amber-500/10",   text: "text-amber-600 dark:text-amber-400",     ring: "ring-amber-500/20"   },
  calm:   { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/20" },
  low:    { bg: "bg-sky-500/10",     text: "text-sky-600 dark:text-sky-400",         ring: "ring-sky-500/20"     },
  tense:  { bg: "bg-rose-500/10",    text: "text-rose-600 dark:text-rose-400",       ring: "ring-rose-500/20"    },
  mixed:  { bg: "bg-foreground/5",   text: "text-foreground/55",                     ring: "ring-foreground/10"  },
};

function Pill({ mood, count, max }: { mood: string; count: number; max: number }) {
  const group = getMoodGroup(mood);
  const pill  = group ? (GROUP_PILL[group.id] ?? GROUP_PILL.mixed) : GROUP_PILL.mixed;
  const t     = max > 0 ? count / max : 0;

  const fontSize = Math.round(11 + t * 9);
  const px       = Math.round(7  + t * 5);
  const py       = Math.round(3  + t * 4);
  const iconSize = Math.round(11 + t * 6);

  return (
    <span
      title={`${getMoodLabel(mood)} · ${count} ${count === 1 ? "entry" : "entries"}`}
      className={`inline-flex items-center gap-1 rounded-full ring-1 select-none cursor-default transition-opacity hover:opacity-70 ${pill.bg} ${pill.text} ${pill.ring}`}
      style={{
        fontSize:      `${fontSize}px`,
        paddingLeft:   `${px}px`,
        paddingRight:  `${px}px`,
        paddingTop:    `${py}px`,
        paddingBottom: `${py}px`,
        lineHeight:    1.3,
      }}
    >
      <MoodFaceIcon value={mood} size={iconSize} />
      {getMoodLabel(mood)}
    </span>
  );
}

export default function MoodCloud({ data }: { data: [string, number][] }) {
  if (data.length === 0) {
    return <p className="text-sm text-foreground/30">No mood data yet.</p>;
  }

  const max = data[0][1];

  // Bucket by group, preserving count-descending order within each group
  const byGroup = new Map<string, { mood: string; count: number }[]>();
  for (const [mood, count] of data) {
    const g = getMoodGroup(mood);
    const key = g?.id ?? "mixed";
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push({ mood, count });
  }

  return (
    <div className="flex flex-col gap-3">
      {MOOD_GROUPS.map((group) => {
        const items = byGroup.get(group.id);
        if (!items?.length) return null;
        return (
          <div key={group.id} className="flex items-start gap-3">
            {/* Group color dot */}
            <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${group.barClass}`} />
            {/* Pills */}
            <div className="flex flex-wrap gap-1.5">
              {items.map(({ mood, count }) => (
                <Pill key={mood} mood={mood} count={count} max={max} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
