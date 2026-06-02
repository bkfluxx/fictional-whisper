"use client";

import { useMemo, useState } from "react";
import { getMoodGroup, getMoodLabel, getMoodScore } from "@/lib/moods";

interface DataPoint {
  date: string; // YYYY-MM-DD
  mood: string;
}

interface MoodTrendChartProps {
  data: DataPoint[];
  days?: number;
}

// SVG canvas dimensions
const W = 600;
const H = 140;
const PAD = { top: 14, right: 10, bottom: 26, left: 36 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

// Mood group colors for SVG (hardcoded — same in light/dark)
const GROUP_COLORS: Record<string, string> = {
  bright: "#f59e0b",
  calm:   "#10b981",
  mixed:  "#737373",
  low:    "#0ea5e9",
  tense:  "#f43f5e",
};

function toY(score: number): number {
  return PAD.top + CH - ((score - 1) / 4) * CH;
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

type PlotPoint = {
  x: number;
  y: number;
  date: string;
  score: number;
  allMoods: string[];
  dominant: string;
};

type Hovered = PlotPoint;

const Y_LABELS = [
  { score: 5, label: "Bright" },
  { score: 4, label: "Calm"   },
  { score: 3, label: "Mixed"  },
  { score: 2, label: "Low"    },
  { score: 1, label: "Tense"  },
];

export default function MoodTrendChart({ data, days = 30 }: MoodTrendChartProps) {
  const [hovered, setHovered] = useState<Hovered | null>(null);

  const { points, xLabels } = useMemo(() => {
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = new Date(endDate.getTime() - (days - 1) * 86400000);

    function fmtDate(d: Date) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    const startStr = fmtDate(startDate);
    const endStr = fmtDate(endDate);

    // Group moods by day
    const dayData = new Map<string, string[]>();
    for (const pt of data) {
      if (pt.date >= startStr && pt.date <= endStr) {
        if (!dayData.has(pt.date)) dayData.set(pt.date, []);
        dayData.get(pt.date)!.push(pt.mood);
      }
    }

    const pts: PlotPoint[] = [...dayData.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, moods]) => {
        const d = new Date(date + "T12:00:00");
        const dayOffset = (d.getTime() - startDate.getTime()) / 86400000;
        const x = PAD.left + (dayOffset / (days - 1)) * CW;
        const avgScore = moods.reduce((sum, m) => sum + getMoodScore(m), 0) / moods.length;
        const y = toY(avgScore);
        // dominant = mood with highest score on that day
        const dominant = moods.reduce((best, m) =>
          getMoodScore(m) > getMoodScore(best) ? m : best, moods[0]);
        return { x, y, date, score: avgScore, allMoods: moods, dominant };
      });

    // X axis tick marks: roughly every 7 days + "Today" at end
    const step = Math.max(1, Math.floor(days / 5));
    const labels: { x: number; label: string }[] = [];
    for (let i = 0; i < days - step / 2; i += step) {
      const d = new Date(startDate.getTime() + i * 86400000);
      const x = PAD.left + (i / (days - 1)) * CW;
      labels.push({
        x,
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      });
    }
    labels.push({ x: PAD.left + CW, label: "Today" });

    return { points: pts, xLabels: labels };
  }, [data, days]);

  const linePath = smoothPath(points.map((p) => ({ x: p.x, y: p.y })));
  const chartBottom = PAD.top + CH;
  const areaPath =
    points.length >= 2
      ? `${linePath} L${points[points.length - 1].x.toFixed(1)},${chartBottom} L${points[0].x.toFixed(1)},${chartBottom} Z`
      : "";

  if (points.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-center" style={{ height: 80 }}>
        <p className="text-sm text-foreground/30">No mood data in the last {days} days.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div style={{ aspectRatio: `${W}/${H}` }} className="w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="100%"
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            <linearGradient id="mood-trend-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary, #6366f1)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--color-primary, #6366f1)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Y-axis grid lines + labels */}
          {Y_LABELS.map(({ score, label }) => {
            const y = toY(score);
            return (
              <g key={score}>
                <line
                  x1={PAD.left} y1={y} x2={PAD.left + CW} y2={y}
                  stroke="currentColor" strokeOpacity={score === 3 ? 0.1 : 0.05}
                  strokeWidth="1"
                  strokeDasharray={score === 3 ? undefined : "3 3"}
                />
                <text
                  x={PAD.left - 5} y={y}
                  textAnchor="end" dominantBaseline="middle"
                  fontSize="9" fill="currentColor" fillOpacity="0.35"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          {areaPath && <path d={areaPath} fill="url(#mood-trend-area)" />}

          {/* Spline line */}
          {points.length >= 2 && (
            <path
              d={linePath}
              fill="none"
              stroke="var(--color-primary, #6366f1)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data dots */}
          {points.map((pt) => {
            const fill = GROUP_COLORS[getMoodGroup(pt.dominant)?.id ?? "mixed"] ?? "#737373";
            const isHov = hovered?.date === pt.date;
            return (
              <circle
                key={pt.date}
                cx={pt.x} cy={pt.y}
                r={isHov ? 5.5 : 3.5}
                fill={fill}
                stroke="var(--color-card, #fff)"
                strokeWidth="2"
                style={{ cursor: "pointer", transition: "r 0.1s" }}
                onMouseEnter={() => setHovered(pt)}
              />
            );
          })}

          {/* Tooltip */}
          {hovered && (() => {
            const tx = Math.min(Math.max(hovered.x, PAD.left + 38), W - PAD.right - 38);
            const above = hovered.y > PAD.top + CH / 2;
            const ty = above ? hovered.y - 32 : hovered.y + 14;
            const dateLabel = new Date(hovered.date + "T12:00:00").toLocaleDateString("en-US", {
              month: "short", day: "numeric",
            });
            const moodLabel =
              hovered.allMoods.length === 1
                ? getMoodLabel(hovered.allMoods[0])
                : `${getMoodLabel(hovered.dominant)} (+${hovered.allMoods.length - 1})`;
            return (
              <g pointerEvents="none">
                <rect
                  x={tx - 36} y={ty - 12}
                  width={72} height={30}
                  rx={6}
                  fill="currentColor" fillOpacity="0.88"
                />
                <text x={tx} y={ty + 1} textAnchor="middle" fontSize="10" fill="var(--color-card, #fff)" fontWeight="600">
                  {moodLabel}
                </text>
                <text x={tx} y={ty + 13} textAnchor="middle" fontSize="9" fill="var(--color-card, #fff)" fillOpacity="0.6">
                  {dateLabel}
                </text>
              </g>
            );
          })()}

          {/* X axis labels */}
          {xLabels.map(({ x, label }) => (
            <text
              key={label}
              x={x} y={H - 5}
              textAnchor="middle" fontSize="9"
              fill="currentColor" fillOpacity="0.35"
            >
              {label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
