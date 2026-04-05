"use client";

import { useState, useEffect } from "react";

export const FONT_SCALE_KEY = "aura-font-scale";
export const FONT_SCALE_DEFAULT = 110;

const STEPS = [
  { value: 90,  label: "Small",   hint: "90%" },
  { value: 100, label: "Default", hint: "100%" },
  { value: 110, label: "Medium",  hint: "110%" },
  { value: 120, label: "Large",   hint: "120%" },
  { value: 130, label: "Larger",  hint: "130%" },
];

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

  function select(value: number) {
    setScale(value);
    applyFontScale(value);
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {STEPS.map((s) => {
        const isActive = scale === s.value;
        return (
          <button
            key={s.value}
            onClick={() => select(s.value)}
            className={`flex flex-col items-center justify-center w-20 h-16 rounded-xl border-2 transition-all ${
              isActive
                ? "border-primary bg-primary/5"
                : "border-base-200 hover:border-base-300"
            }`}
          >
            <span
              className="font-semibold text-base-content leading-none mb-1"
              style={{ fontSize: `${s.value * 0.12}px` }}
            >
              Aa
            </span>
            <span className="text-[10px] text-base-content/50">{s.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
