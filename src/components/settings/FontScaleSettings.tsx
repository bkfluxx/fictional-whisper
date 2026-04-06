"use client";

import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";

export const FONT_SCALE_KEY = "aura-font-scale";
export const FONT_SCALE_DEFAULT = 100;

export function applyFontScale(scale: number) {
  document.documentElement.style.fontSize = `${scale}%`;
  localStorage.setItem(FONT_SCALE_KEY, String(scale));
}

export default function FontScaleSettings() {
  const [scale, setScale] = useState(FONT_SCALE_DEFAULT);

  useEffect(() => {
    const saved = localStorage.getItem(FONT_SCALE_KEY);
    if (saved) setScale(Number(saved));
  }, []);

  function handleChange(value: number | readonly number[]) {
    const next = Array.isArray(value) ? (value as number[])[0] : (value as number);
    setScale(next);
    applyFontScale(next);
  }

  return (
    <div className="space-y-4 max-w-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground/60">Small</span>
        <span className="text-sm font-medium text-foreground tabular-nums">{scale}%</span>
        <span className="text-sm text-foreground/60">Large</span>
      </div>
      <Slider
        min={100}
        max={120}
        step={5}
        value={scale}
        onValueChange={handleChange}
        aria-label="Font size"
      />
      <div className="flex justify-between text-[10px] text-foreground/30 tabular-nums px-0.5">
        {[100, 105, 110, 115, 120].map((v) => (
          <span key={v}>{v}%</span>
        ))}
      </div>
      <p
        className="text-foreground/60 leading-relaxed mt-2 transition-all"
        style={{ fontSize: `${scale * 0.01 * 0.875}rem` }}
      >
        Preview — The quick brown fox jumps over the lazy dog.
      </p>
    </div>
  );
}
