const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LABELS = ["S","M","T","W","T","F","S"];

interface Day {
  date: string; // YYYY-MM-DD
  count: number;
}

interface ActivityHeatmapProps {
  weeks: Day[][];
}

function cellColor(count: number): string {
  if (count === 0) return "bg-neutral-800";
  if (count === 1) return "bg-indigo-900";
  if (count === 2) return "bg-indigo-700";
  if (count <= 4) return "bg-indigo-500";
  return "bg-indigo-400";
}

/** Returns the month label to show above a given week column (only for the first week in that month). */
function monthLabel(weeks: Day[][], wi: number): string | null {
  const first = weeks[wi][0];
  if (!first) return null;
  const day = parseInt(first.date.slice(8));
  // Show label if the first day of this week is within the first 7 days of a month
  // and (it's the first week overall OR the previous week was in a different month)
  const thisMonth = first.date.slice(5, 7);
  if (wi === 0) return MONTH_ABBR[parseInt(thisMonth) - 1];
  const prevFirst = weeks[wi - 1][0];
  if (prevFirst && prevFirst.date.slice(5, 7) !== thisMonth && day <= 7) {
    return MONTH_ABBR[parseInt(thisMonth) - 1];
  }
  return null;
}

export default function ActivityHeatmap({ weeks }: ActivityHeatmapProps) {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0.5 min-w-max">
        {/* Day-of-week labels on the left */}
        <div className="flex flex-col gap-0.5 mr-1">
          <div className="h-4" /> {/* spacer for month labels row */}
          {DAY_LABELS.map((d, i) => (
            <div key={i} className="w-3 h-3 flex items-center justify-center">
              {i % 2 === 1 && (
                <span className="text-[9px] text-neutral-600">{d}</span>
              )}
            </div>
          ))}
        </div>

        {/* Week columns */}
        {weeks.map((week, wi) => {
          const label = monthLabel(weeks, wi);
          return (
            <div key={wi} className="flex flex-col gap-0.5">
              {/* Month label */}
              <div className="h-4 flex items-center">
                {label && (
                  <span className="text-[9px] text-neutral-500 whitespace-nowrap">{label}</span>
                )}
              </div>
              {/* Day cells */}
              {week.map((day, di) => (
                <div
                  key={di}
                  title={`${day.date}: ${day.count} ${day.count === 1 ? "entry" : "entries"}`}
                  className={`w-3 h-3 rounded-sm ${cellColor(day.count)}`}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-[10px] text-neutral-600">Less</span>
        {["bg-neutral-800","bg-indigo-900","bg-indigo-700","bg-indigo-500","bg-indigo-400"].map((c) => (
          <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
        ))}
        <span className="text-[10px] text-neutral-600">More</span>
      </div>
    </div>
  );
}
