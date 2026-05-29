import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  heading: string;
  subtitle?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export default function EmptyState({
  icon: Icon,
  heading,
  subtitle,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="w-14 h-14 rounded-2xl bg-foreground/5 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-foreground/20" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium text-foreground/60 mb-1">{heading}</p>
      {subtitle && (
        <p className="text-xs text-foreground/35 max-w-xs leading-relaxed mb-5">
          {subtitle}
        </p>
      )}
      {action && (
        <>
          {action.href ? (
            <Link
              href={action.href}
              className="mt-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-full transition-colors"
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="mt-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-full transition-colors"
            >
              {action.label}
            </button>
          )}
        </>
      )}
    </div>
  );
}
