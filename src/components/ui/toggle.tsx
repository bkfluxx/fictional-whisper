import * as React from "react";
import { cn } from "@/lib/utils";

interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ pressed, onPressedChange, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={pressed}
        data-state={pressed ? "on" : "off"}
        onClick={() => onPressedChange(!pressed)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors select-none",
          pressed
            ? "bg-foreground/15 border-foreground/30 text-foreground"
            : "bg-transparent border-foreground/20 text-foreground/40 hover:text-foreground/70 hover:border-foreground/30",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Toggle.displayName = "Toggle";

export { Toggle };
