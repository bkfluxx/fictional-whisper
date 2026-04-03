interface HorizontalBarProps {
  label: string;
  count: number;
  max: number;
  color: string;
}

export default function HorizontalBar({ label, count, max, color }: HorizontalBarProps) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm text-base-content/80 w-32 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-base-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-base-content/40 w-6 text-right shrink-0">{count}</span>
    </div>
  );
}
