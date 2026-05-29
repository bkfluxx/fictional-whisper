interface HorizontalBarProps {
  label: string;
  count: number;
  max: number;
  color: string;
  variant?: "light" | "dark";
}

export default function HorizontalBar({ label, count, max, color, variant = "light" }: HorizontalBarProps) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  const dark = variant === "dark";
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className={`text-sm w-32 shrink-0 truncate ${dark ? "text-surface-dark-foreground/70" : "text-foreground/80"}`}>
        {label}
      </span>
      <div className={`flex-1 h-2 rounded-full overflow-hidden ${dark ? "bg-surface-dark-foreground/15" : "bg-card"}`}>
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs w-6 text-right shrink-0 ${dark ? "text-surface-dark-foreground/40" : "text-foreground/40"}`}>
        {count}
      </span>
    </div>
  );
}
