const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface MonthlyBarsProps {
  data: { month: string; count: number }[]; // month = "YYYY-MM"
}

export default function MonthlyBars({ data }: MonthlyBarsProps) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map(({ month, count }) => {
        const heightPct = (count / max) * 100;
        const label = MONTH_ABBR[parseInt(month.slice(5)) - 1];
        return (
          <div key={month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <span className="text-[10px] text-neutral-600">{count || ""}</span>
            <div
              title={`${label}: ${count}`}
              className={`w-full rounded-t-sm transition-all ${
                count > 0 ? "bg-indigo-600" : "bg-neutral-800"
              }`}
              style={{ height: `${Math.max(heightPct, count > 0 ? 4 : 2)}%` }}
            />
            <span className="text-[10px] text-neutral-600">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
