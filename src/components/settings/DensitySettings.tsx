"use client";

import { useState, useEffect } from "react";
import { applyDensity, loadSavedDensity, type DensityId } from "@/lib/theme";

const OPTIONS: { id: DensityId; label: string; description: string; preview: string[] }[] = [
  {
    id: "spacious",
    label: "Spacious",
    description: "More breathing room",
    preview: ["h-3", "h-2", "h-2"],
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "Standard spacing",
    preview: ["h-2.5", "h-1.5", "h-1.5"],
  },
  {
    id: "compact",
    label: "Compact",
    description: "More content visible",
    preview: ["h-2", "h-1", "h-1"],
  },
];

export default function DensitySettings() {
  const [density, setDensity] = useState<DensityId>("spacious");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDensity(loadSavedDensity());
    setMounted(true);
  }, []);

  function select(id: DensityId) {
    setDensity(id);
    applyDensity(id);
  }

  if (!mounted) {
    return <div className="h-24 rounded-2xl bg-muted animate-pulse" />;
  }

  return (
    <div className="flex gap-3">
      {OPTIONS.map((opt) => {
        const isActive = density === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => select(opt.id)}
            className={`flex-1 flex flex-col items-center gap-3 rounded-2xl border-2 py-5 px-3 transition-all ${
              isActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            }`}
          >
            {/* Visual density preview */}
            <div className="w-full space-y-1.5 px-2">
              {opt.preview.map((h, i) => (
                <div
                  key={i}
                  className={`w-full ${h} rounded-full ${
                    isActive ? "bg-primary/40" : "bg-foreground/15"
                  }`}
                />
              ))}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">{opt.label}</p>
              <p className="text-[11px] text-foreground/40 mt-0.5">{opt.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
