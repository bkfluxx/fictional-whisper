"use client";

import { useState, useEffect } from "react";

export const FONT_SCALE_KEY = "aura-font-scale";
export const FONT_SCALE_DEFAULT = 100;

export function applyFontScale(scale: number) {
  document.documentElement.style.fontSize = `${scale}%`;
  localStorage.setItem(FONT_SCALE_KEY, String(scale));
}

const STEPS = [100, 105, 110, 115, 120];
const MIN = 100;
const MAX = 120;

export default function FontScaleSettings() {
  const [scale, setScale] = useState(FONT_SCALE_DEFAULT);  // applied value
  const [draft, setDraft] = useState(FONT_SCALE_DEFAULT);  // slider position

  useEffect(() => {
    const saved = localStorage.getItem(FONT_SCALE_KEY);
    if (saved) {
      const n = Number(saved);
      setScale(n);
      setDraft(n);
    }
  }, []);

  const pct = ((draft - MIN) / (MAX - MIN)) * 100;
  const isDirty = draft !== scale;

  function apply() {
    setScale(draft);
    applyFontScale(draft);
  }

  return (
    <div className="space-y-4 max-w-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground/60">Small</span>
        <span className="text-sm font-medium text-foreground tabular-nums">{draft}%</span>
        <span className="text-sm text-foreground/60">Large</span>
      </div>

      {/* Native range — avoids base-ui data-attr variant issues */}
      <input
        type="range"
        min={MIN}
        max={MAX}
        step={5}
        value={draft}
        onChange={(e) => setDraft(Number(e.target.value))}
        style={{
          background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${pct}%, var(--color-muted) ${pct}%, var(--color-muted) 100%)`,
        }}
        className="w-full h-1.5 appearance-none rounded-full cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-ring
          [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-grab
          [&::-webkit-slider-thumb]:active:cursor-grabbing
          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white
          [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-ring
          [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:cursor-grab"
        aria-label="Font size"
      />

      <div className="flex justify-between text-[10px] text-foreground/30 tabular-nums px-0.5">
        {STEPS.map((v) => (
          <span key={v}>{v}%</span>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-1">
        <p
          className="flex-1 text-foreground/60 leading-relaxed"
          style={{ fontSize: `${draft * 0.01 * 0.875}rem` }}
        >
          Preview — The quick brown fox jumps over the lazy dog.
        </p>
        <button
          onClick={apply}
          disabled={!isDirty}
          className="px-4 py-1.5 bg-primary hover:bg-primary/85 disabled:opacity-40 text-primary-foreground text-sm font-medium rounded-full transition-colors whitespace-nowrap shrink-0"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
