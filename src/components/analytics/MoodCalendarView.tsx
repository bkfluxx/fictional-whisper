"use client";

import { useState, useRef, useMemo } from "react";
import { getMoodGroup, getMoodLabel } from "@/lib/moods";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DataPoint {
  date: string; // YYYY-MM-DD
  mood: string;
}

// ─── Mood fill classes (SVG) ──────────────────────────────────────────────────

const GROUP_FILL_CLASS: Record<string, string> = {
  bright: "fill-amber-400",
  calm:   "fill-emerald-400",
  low:    "fill-sky-400",
  tense:  "fill-rose-400",
  mixed:  "fill-neutral-400",
};

function getMoodFillClass(mood: string): string {
  const g = getMoodGroup(mood);
  return g ? (GROUP_FILL_CLASS[g.id] ?? "fill-neutral-400") : "fill-neutral-400";
}

// ─── SVG pie arc helper ───────────────────────────────────────────────────────

function arcPath(
  cx: number, cy: number, r: number,
  startAngle: number, endAngle: number,
): string {
  if (endAngle - startAngle >= 2 * Math.PI - 0.001) {
    // SVG arcs cannot span exactly 360° — use two semicircles
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx + 0.001} ${cy - r} Z`;
  }
  const x1 = cx + r * Math.sin(startAngle);
  const y1 = cy - r * Math.cos(startAngle);
  const x2 = cx + r * Math.sin(endAngle);
  const y2 = cy - r * Math.cos(endAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1.toFixed(3)} ${y1.toFixed(3)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`;
}

// ─── Day cell ─────────────────────────────────────────────────────────────────

const SVG_SIZE = 26;
const CR  = SVG_SIZE / 2 - 1; // radius, 1px inset from edge
const CCX = SVG_SIZE / 2;
const CCY = SVG_SIZE / 2;

interface DayCellProps {
  day: number;
  moods: string[];
  isToday: boolean;
  onClick: (() => void) | undefined;
}

function DayCell({ day, moods, isToday, onClick }: DayCellProps) {
  const hasData = moods.length > 0;

  return (
    <button
      type="button"
      onClick={hasData ? onClick : undefined}
      disabled={!hasData}
      className={cn(
        "flex flex-col items-center gap-[3px] transition-all duration-150",
        hasData
          ? "cursor-pointer hover:opacity-70 active:scale-90"
          : "cursor-default",
      )}
      aria-label={
        hasData
          ? `${day}: ${moods.map(getMoodLabel).join(", ")}`
          : `${day}`
      }
    >
      <svg
        width={SVG_SIZE}
        height={SVG_SIZE}
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        overflow="visible"
        aria-hidden
      >
        {hasData ? (
          moods.length === 1 ? (
            <circle
              cx={CCX} cy={CCY} r={CR}
              className={getMoodFillClass(moods[0])}
              opacity={0.85}
            />
          ) : (
            moods.map((mood, i) => {
              const slice = (2 * Math.PI) / moods.length;
              return (
                <path
                  key={i}
                  d={arcPath(CCX, CCY, CR, i * slice, (i + 1) * slice)}
                  className={getMoodFillClass(mood)}
                  opacity={0.85}
                />
              );
            })
          )
        ) : (
          // No mood logged — subtle placeholder circle
          <circle
            cx={CCX} cy={CCY} r={CR}
            fill="currentColor"
            className="text-foreground/[0.06]"
          />
        )}

        {/* Today highlight ring */}
        {isToday && (
          <circle
            cx={CCX} cy={CCY} r={CR + 0.5}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="text-primary"
          />
        )}
      </svg>

      <span
        className={cn(
          "text-[9px] leading-none tabular-nums font-medium",
          isToday
            ? "text-primary"
            : hasData
              ? "text-foreground/55"
              : "text-foreground/20",
        )}
      >
        {day}
      </span>
    </button>
  );
}

// ─── Month grid ───────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

interface MonthGridProps {
  year: number;
  month: number;
  moodsByDate: Map<string, string[]>;
  todayStr: string;
  onDayClick: (date: string, moods: string[]) => void;
}

function MonthGrid({ year, month, moodsByDate, todayStr, onDayClick }: MonthGridProps) {
  const firstDOW   = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const label = new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-3 text-center">
        {label}
      </p>
      <div className="grid grid-cols-7 gap-y-1">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={i} className="flex justify-center text-[10px] text-foreground/25 pb-1.5 font-medium">
            {d}
          </div>
        ))}
        {Array.from({ length: firstDOW }).map((_, i) => (
          <div key={`gap-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const moods = moodsByDate.get(dateStr) ?? [];
          return (
            <div key={day} className="flex justify-center py-0.5">
              <DayCell
                day={day}
                moods={moods}
                isToday={dateStr === todayStr}
                onClick={moods.length > 0 ? () => onDayClick(dateStr, moods) : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MoodCalendarView({ data }: { data: DataPoint[] }) {
  const today = new Date();
  const currentYear  = today.getFullYear();
  const currentMonth = today.getMonth();
  const todayStr = [
    currentYear,
    String(currentMonth + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  // viewMonth/viewYear = the LEFT panel anchor.
  // Start at currentMonth−1 so the right (desktop) panel shows the current month.
  const initTotal = currentYear * 12 + currentMonth - 1;
  const [viewYear,  setViewYear]  = useState(() => Math.floor(initTotal / 12));
  const [viewMonth, setViewMonth] = useState(() => ((initTotal % 12) + 12) % 12);

  const [tooltip, setTooltip] = useState<{ date: string; moods: string[] } | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Right-panel month (desktop)
  const totalRight = viewYear * 12 + viewMonth + 1;
  const year2  = Math.floor(totalRight / 12);
  const month2 = totalRight % 12;

  // Group data by date
  const moodsByDate = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const d of data) {
      const arr = map.get(d.date);
      if (arr) arr.push(d.mood);
      else map.set(d.date, [d.mood]);
    }
    return map;
  }, [data]);

  // Boundary checks (allow up to 11 months back from current month)
  const totalView    = viewYear * 12 + viewMonth;
  const totalCurrent = currentYear * 12 + currentMonth;

  // isAtLatest: advancing would push the right panel past currentMonth
  const isAtLatest   = totalView >= totalCurrent;
  // isAtEarliest: 11 months back max
  const isAtEarliest = totalView <= totalCurrent - 11;

  function stepMonth(dir: 1 | -1) {
    const total = viewYear * 12 + viewMonth + dir;
    setViewYear(Math.floor(total / 12));
    setViewMonth(((total % 12) + 12) % 12);
    setTooltip(null);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta > 0 && !isAtLatest)   stepMonth(1);
    else if (delta < 0 && !isAtEarliest) stepMonth(-1);
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 overflow-hidden">
      {/* Navigation bar */}
      <div className="flex items-center mb-4">
        <button
          onClick={() => !isAtEarliest && stepMonth(-1)}
          disabled={isAtEarliest}
          className="w-8 h-8 flex items-center justify-center rounded-md text-foreground/40 hover:text-foreground hover:bg-foreground/8 transition-colors disabled:opacity-20 disabled:cursor-default"
          aria-label="Previous months"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex-1" />
        <button
          onClick={() => !isAtLatest && stepMonth(1)}
          disabled={isAtLatest}
          className="w-8 h-8 flex items-center justify-center rounded-md text-foreground/40 hover:text-foreground hover:bg-foreground/8 transition-colors disabled:opacity-20 disabled:cursor-default"
          aria-label="Next months"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Calendar grids */}
      <div
        className="flex gap-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Left panel — always visible */}
        <MonthGrid
          year={viewYear}
          month={viewMonth}
          moodsByDate={moodsByDate}
          todayStr={todayStr}
          onDayClick={(date, moods) => setTooltip(t => t?.date === date ? null : { date, moods })}
        />

        {/* Divider — desktop only */}
        <div className="hidden md:block w-px shrink-0 bg-border self-stretch" />

        {/* Right panel — desktop only */}
        <div className="hidden md:flex flex-1 min-w-0">
          <MonthGrid
            year={year2}
            month={month2}
            moodsByDate={moodsByDate}
            todayStr={todayStr}
            onDayClick={(date, moods) => setTooltip(t => t?.date === date ? null : { date, moods })}
          />
        </div>
      </div>

      {/* Detail row — shown when a day is tapped */}
      {tooltip && (
        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex items-start gap-3">
            <span className="text-xs text-foreground/40 shrink-0 pt-0.5">
              {new Date(tooltip.date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
            <div className="flex flex-wrap gap-1.5 flex-1">
              {tooltip.moods.map((mood, i) => {
                const g = getMoodGroup(mood);
                return (
                  <span
                    key={i}
                    className={cn(
                      "inline-flex items-center text-xs px-2 py-0.5 rounded-full",
                      g?.colorClass ?? "bg-foreground/5",
                      g?.textClass ?? "text-foreground/50",
                    )}
                  >
                    {getMoodLabel(mood)}
                  </span>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setTooltip(null)}
              className="text-foreground/30 hover:text-foreground/60 transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-border">
        {[
          { label: "Bright", cls: "bg-amber-400"   },
          { label: "Calm",   cls: "bg-emerald-400" },
          { label: "Low",    cls: "bg-sky-400"     },
          { label: "Tense",  cls: "bg-rose-400"    },
          { label: "Mixed",  cls: "bg-neutral-400" },
        ].map(({ label, cls }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cls}`} />
            <span className="text-xs text-foreground/50">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
