export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-foreground/8 ${className ?? ""}`} />
  );
}
