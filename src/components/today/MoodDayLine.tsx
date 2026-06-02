"use client";

import { useMemo, useState } from "react";
import { getMoodGroup, getMoodLabel } from "@/lib/moods";

interface MoodEntry {
  mood: string;
  time: string; // "HH:MM" — local time formatted by the server
}

interface MoodDayLineProps {
  entries: MoodEntry[]; // chronological, ≥2 expected before rendering
}

// Mood group colors (same as MoodTrendChart)
const GROUP_COLORS: Record<string, string> = {
  bright: "#f59e0b",
  calm:   "#10b981",
  mixed:  "#737373",
  low:    "#0ea5e9",
  tense:  "#f43f5e",
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function fmt12(t: string): string {
  const mins = timeToMinutes(t);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

const W = 500;
const H = 48;
const DOT_R = 5;
const LINE_Y = 28;
const PAD_X = 24;
const TICK_W = W - PAD_X * 2;

// Fixed window: 6am → 11pm (1020 minutes total)
const DAY_START = 6 * 60;
const DAY_END = 23 * 60;
const DAY_SPAN = DAY_END - DAY_START;

function toX(time: string): number {
  const mins = Math.min(Math.max(timeToMinutes(time), DAY_START), DAY_END);
  return PAD_X + ((mins - DAY_START) / DAY_SPAN) * TICK_W;
}

export default function MoodDayLine({ entries }: MoodDayLineProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const pts = useMemo(
    () => entries.map((e) => ({ ...e, x: toX(e.time) })),
    [entries],
  );

  if (pts.length < 2) return null;

  // Build connecting line path
  const linePts = pts.map((p) => ({ x: p.x, y: LINE_Y }));
  const linePath = `M${linePts.map((p) => `${p.x.toFixed(1)},${p.y}`).join(" L")}`;

  // Hour tick marks for context (6am, 12pm, 6pm, 11pm)
  const TICKS = [
    { mins: 6 * 60, label: "6am" },
    { mins: 12 * 60, label: "12pm" },
    { mins: 18 * 60, label: "6pm" },
    { mins: 23 * 60, label: "11pm" },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground/35 mb-2">
        Today's mood arc
      </p>
      <div style={{ aspectRatio: `${W}/${H}` }} className="w-full">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" onMouseLeave={() => setHovered(null)}>
          {/* Base timeline rule */}
          <line
            x1={PAD_X} y1={LINE_Y} x2={PAD_X + TICK_W} y2={LINE_Y}
            stroke="currentColor" strokeOpacity="0.1" strokeWidth="1.5"
          />

          {/* Hour tick marks */}
          {TICKS.map(({ mins, label }) => {
            const x = PAD_X + ((mins - DAY_START) / DAY_SPAN) * TICK_W;
            return (
              <g key={mins}>
                <line x1={x} y1={LINE_Y - 3} x2={x} y2={LINE_Y + 3}
                  stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
                <text x={x} y={H - 2} textAnchor="middle" fontSize="8"
                  fill="currentColor" fillOpacity="0.3">
                  {label}
                </text>
              </g>
            );
          })}

          {/* Connecting line between dots */}
          <path d={linePath} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1.5" />

          {/* Mood dots */}
          {pts.map((pt, i) => {
            const fill = GROUP_COLORS[getMoodGroup(pt.mood)?.id ?? "mixed"] ?? "#737373";
            const isHov = hovered === i;
            return (
              <g key={i} onMouseEnter={() => setHovered(i)} style={{ cursor: "default" }}>
                <circle
                  cx={pt.x} cy={LINE_Y} r={isHov ? DOT_R + 2 : DOT_R}
                  fill={fill}
                  stroke="var(--color-card, #fff)" strokeWidth="2"
                  style={{ transition: "r 0.1s" }}
                />
                {/* Tooltip bubble */}
                {isHov && (() => {
                  const tx = Math.min(Math.max(pt.x, PAD_X + 28), W - PAD_X - 28);
                  const above = i === pts.length - 1 || pt.x > W * 0.75;
                  const ty = LINE_Y - 14;
                  return (
                    <g pointerEvents="none">
                      <rect x={tx - 28} y={ty - 10} width={56} height={22} rx={5}
                        fill="currentColor" fillOpacity="0.88" />
                      <text x={tx} y={ty - 1} textAnchor="middle" fontSize="9"
                        fill="var(--color-card, #fff)" fontWeight="600">
                        {getMoodLabel(pt.mood)}
                      </text>
                      <text x={tx} y={ty + 9} textAnchor="middle" fontSize="8"
                        fill="var(--color-card, #fff)" fillOpacity="0.6">
                        {fmt12(pt.time)}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
