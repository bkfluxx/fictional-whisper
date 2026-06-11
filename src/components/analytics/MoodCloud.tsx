"use client";

import { getMoodGroup, getMoodLabel } from "@/lib/moods";
import { MoodFaceIcon } from "@/components/ui/MoodIcon";

// ─── Pill colors ──────────────────────────────────────────────────────────────

const GROUP_PILL: Record<string, { bg: string; text: string; ring: string }> = {
  bright: { bg: "bg-amber-500/10",   text: "text-amber-600 dark:text-amber-400",     ring: "ring-amber-500/20"   },
  calm:   { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/20" },
  low:    { bg: "bg-sky-500/10",     text: "text-sky-600 dark:text-sky-400",         ring: "ring-sky-500/20"     },
  tense:  { bg: "bg-rose-500/10",    text: "text-rose-600 dark:text-rose-400",       ring: "ring-rose-500/20"    },
  mixed:  { bg: "bg-foreground/5",   text: "text-foreground/55",                     ring: "ring-foreground/10"  },
};

// ─── Quadrant mapping (mood meter model) ─────────────────────────────────────
// X-axis: Unpleasant ← center → Pleasant
// Y-axis: High Energy ↑ center ↓ Low Energy
//
//   TL = Tense  (High energy + Unpleasant)
//   TR = Bright (High energy + Pleasant)
//   BL = Low    (Low energy  + Unpleasant)
//   BR = Calm   (Low energy  + Pleasant)

type QKey = "tl" | "tr" | "bl" | "br" | "center";

const GROUP_QUADRANT: Record<string, QKey> = {
  tense:  "tl",
  bright: "tr",
  low:    "bl",
  calm:   "br",
  mixed:  "center",
};

// ─── Pill ─────────────────────────────────────────────────────────────────────

function Pill({ mood, count, max }: { mood: string; count: number; max: number }) {
  const group = getMoodGroup(mood);
  const pill  = group ? (GROUP_PILL[group.id] ?? GROUP_PILL.mixed) : GROUP_PILL.mixed;
  const t     = max > 0 ? count / max : 0;

  const fontSize = Math.round(11 + t * 9);  // 11 → 20 px
  const px       = Math.round(7  + t * 5);  // 7  → 12 px
  const py       = Math.round(3  + t * 4);  // 3  →  7 px
  const iconSize = Math.round(11 + t * 6);  // 11 → 17 px

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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MoodCloud({ data }: { data: [string, number][] }) {
  if (data.length === 0) {
    return <p className="text-sm text-foreground/30">No mood data yet.</p>;
  }

  const max = data[0][1];

  // Bucket moods by quadrant
  const buckets: Record<QKey, { mood: string; count: number }[]> = {
    tl: [], tr: [], bl: [], br: [], center: [],
  };
  for (const [mood, count] of data) {
    const group = getMoodGroup(mood);
    const q = group ? (GROUP_QUADRANT[group.id] ?? "center") : "center";
    buckets[q].push({ mood, count });
  }

  const axis = "text-[9px] font-medium uppercase tracking-widest text-foreground/25 select-none pointer-events-none whitespace-nowrap";

  return (
    // py/px create gutter space for the axis labels
    <div className="relative py-5 px-6">

      {/* ── Axis labels ── */}
      <span className={`absolute top-0 left-1/2 -translate-x-1/2 ${axis}`}>High energy</span>
      <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${axis}`}>Low energy</span>
      {/* Vertical labels use writing-mode so they stay within the px gutter */}
      <span className={`absolute left-0 top-1/2 -translate-y-1/2 ${axis} [writing-mode:vertical-rl] rotate-180`}>
        Unpleasant
      </span>
      <span className={`absolute right-0 top-1/2 -translate-y-1/2 ${axis} [writing-mode:vertical-rl]`}>
        Pleasant
      </span>

      {/* ── Grid + cross ── */}
      <div className="relative">

        {/* Center cross lines */}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-border pointer-events-none" aria-hidden />
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border pointer-events-none" aria-hidden />

        <div className="grid grid-cols-2">

          {/* TL — Tense: pills cluster toward bottom-right (nearest the origin) */}
          <div className="flex flex-wrap gap-1.5 justify-end content-end p-4 min-h-[130px]">
            {buckets.tl.map(({ mood, count }) => (
              <Pill key={mood} mood={mood} count={count} max={max} />
            ))}
          </div>

          {/* TR — Bright: pills cluster toward bottom-left */}
          <div className="flex flex-wrap gap-1.5 content-end p-4 min-h-[130px]">
            {buckets.tr.map(({ mood, count }) => (
              <Pill key={mood} mood={mood} count={count} max={max} />
            ))}
          </div>

          {/* BL — Low: pills cluster toward top-right */}
          <div className="flex flex-wrap gap-1.5 justify-end p-4 min-h-[130px]">
            {buckets.bl.map(({ mood, count }) => (
              <Pill key={mood} mood={mood} count={count} max={max} />
            ))}
          </div>

          {/* BR — Calm: pills cluster toward top-left */}
          <div className="flex flex-wrap gap-1.5 p-4 min-h-[130px]">
            {buckets.br.map(({ mood, count }) => (
              <Pill key={mood} mood={mood} count={count} max={max} />
            ))}
          </div>

        </div>

        {/* Mixed — floats at the origin */}
        {buckets.center.length > 0 && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-hidden={false}
          >
            <div className="flex flex-wrap gap-1 items-center justify-center pointer-events-auto bg-card/90 backdrop-blur-sm rounded-xl p-1.5 ring-1 ring-border max-w-[200px]">
              {buckets.center.map(({ mood, count }) => (
                <Pill key={mood} mood={mood} count={count} max={max} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
