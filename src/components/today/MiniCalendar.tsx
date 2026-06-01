"use client";

import Link from "next/link";
import { useState } from "react";

interface Props {
  /** All dates that have at least one entry, as "YYYY-MM-DD" strings */
  entryDates: string[];
  /** Today as "YYYY-MM-DD" */
  todayStr: string;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function MiniCalendar({ entryDates, todayStr }: Props) {
  const entrySet = new Set(entryDates);
  const today = new Date(todayStr + "T00:00:00");

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

  const monthStart = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = monthStart.getDay();

  const monthName = monthStart.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const entriesThisMonth = entryDates.filter((d) =>
    d.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`),
  ).length;

  function prev() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function next() {
    const now = new Date();
    if (viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth >= now.getMonth())) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  const isCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const oldest = entryDates[0];
  const minYear = oldest ? parseInt(oldest.slice(0, 4)) : viewYear;
  const minMonth = oldest ? parseInt(oldest.slice(5, 7)) - 1 : viewMonth;
  const isEarliestMonth = viewYear < minYear || (viewYear === minYear && viewMonth <= minMonth);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <button
            onClick={prev}
            disabled={isEarliestMonth}
            className="w-9 h-9 flex items-center justify-center rounded-md text-foreground/40 hover:text-foreground hover:bg-foreground/8 transition-colors disabled:opacity-20 disabled:cursor-default"
            aria-label="Previous month"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <p className="text-xs font-semibold uppercase tracking-widest text-foreground/40 shrink-0 text-center px-1">
            {monthName}
          </p>
          <button
            onClick={next}
            disabled={isCurrentMonth}
            className="w-9 h-9 flex items-center justify-center rounded-md text-foreground/40 hover:text-foreground hover:bg-foreground/8 transition-colors disabled:opacity-20 disabled:cursor-default"
            aria-label="Next month"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-primary font-medium">
          {entriesThisMonth} {entriesThisMonth === 1 ? "entry" : "entries"}
        </p>
      </div>

      <div className="grid grid-cols-7 gap-y-1 gap-x-0.5">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="text-center text-xs text-foreground/35 pb-1.5 font-medium">
            {d}
          </div>
        ))}

        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const hasEntry = entrySet.has(dateStr);
          const isToday = dateStr === todayStr;

          const circle = (
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                isToday
                  ? "bg-primary text-primary-foreground"
                  : hasEntry
                    ? "bg-tertiary text-tertiary-foreground hover:opacity-80"
                    : "text-foreground/40"
              }`}
            >
              {day}
            </div>
          );

          return hasEntry && !isToday ? (
            <Link
              key={day}
              href={`/journal?from=${dateStr}&to=${dateStr}`}
              title={dateStr}
              className="flex items-center justify-center py-1"
            >
              {circle}
            </Link>
          ) : (
            <div key={day} className="flex items-center justify-center py-1">
              {circle}
            </div>
          );
        })}
      </div>
    </div>
  );
}
