"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CalendarGridProps {
  year: number;
  month: number; // 1-indexed
  counts: Record<string, number>; // { "2026-03-15": 2, ... }
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarGrid({ year, month, counts }: CalendarGridProps) {
  const router = useRouter();
  const [current, setCurrent] = useState({ year, month });

  const firstDay = new Date(current.year, current.month - 1, 1).getDay();
  const daysInMonth = new Date(current.year, current.month, 0).getDate();
  const today = new Date();

  function prevMonth() {
    setCurrent(({ year: y, month: m }) =>
      m === 1 ? { year: y - 1, month: 12 } : { year: y, month: m - 1 },
    );
  }

  function nextMonth() {
    setCurrent(({ year: y, month: m }) =>
      m === 12 ? { year: y + 1, month: 1 } : { year: y, month: m + 1 },
    );
  }

  function handleDayClick(day: number) {
    const dateStr = `${current.year}-${String(current.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    router.push(`/journal?from=${dateStr}&to=${dateStr}`);
  }

  const monthLabel = new Date(current.year, current.month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          aria-label="Previous month"
        >
          ‹
        </button>
        <h2 className="text-base font-semibold text-white">{monthLabel}</h2>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs text-neutral-500 py-1 font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;

          const dateStr = `${current.year}-${String(current.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const entryCount = counts[dateStr] ?? 0;
          const isToday =
            today.getFullYear() === current.year &&
            today.getMonth() + 1 === current.month &&
            today.getDate() === day;

          return (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              className={`relative flex flex-col items-center justify-center aspect-square rounded-lg text-sm transition-colors
                ${isToday ? "ring-1 ring-indigo-500" : ""}
                ${entryCount > 0
                  ? "text-white hover:bg-indigo-600 font-medium"
                  : "text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
                }`}
            >
              {day}
              {entryCount > 0 && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {[...Array(Math.min(entryCount, 3))].map((_, j) => (
                    <span key={j} className="w-1 h-1 rounded-full bg-indigo-400" />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
