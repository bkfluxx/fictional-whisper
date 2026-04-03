"use client";

import { useState, useEffect } from "react";

export const THEME_KEY = "aura-theme";

type ThemeId =
  | "system"
  | "light"
  | "dark"
  | "corporate"
  | "ghibli"
  | "gourmet"
  | "luxury"
  | "mintlify"
  | "pastel"
  | "soft"
  | "black"
  | "marshmallow";

interface ThemeDef {
  id: ThemeId;
  label: string;
  swatches: [string, string, string, string]; // base, primary, secondary, accent
}

const THEMES: ThemeDef[] = [
  {
    id: "system",
    label: "System",
    swatches: ["oklch(95% 0 0)", "oklch(57% 0.247 287)", "oklch(56% 0.022 302)", "oklch(62% 0.188 260)"],
  },
  {
    id: "light",
    label: "Light",
    swatches: ["oklch(100% 0 0)", "oklch(57.59% 0.247 287.24)", "oklch(55.79% 0.022 301.91)", "oklch(62.31% 0.188 259.81)"],
  },
  {
    id: "dark",
    label: "Dark",
    swatches: ["oklch(31.23% 0.026 301.24)", "oklch(53.93% 0.271 286.75)", "oklch(49.12% 0.021 303.05)", "oklch(54.61% 0.215 262.88)"],
  },
  {
    id: "corporate",
    label: "Corporate",
    swatches: ["oklch(99.43% 0.001 286.38)", "oklch(62.31% 0.188 259.81)", "oklch(55.79% 0.022 301.91)", "oklch(65.59% 0.212 354.31)"],
  },
  {
    id: "ghibli",
    label: "Ghibli",
    swatches: ["oklch(94% 0.026 82.38)", "oklch(62% 0.087 111.8)", "oklch(44% 0.043 257.28)", "oklch(70% 0.14 182.5)"],
  },
  {
    id: "gourmet",
    label: "Gourmet",
    swatches: ["oklch(99.45% 0.002 67.8)", "oklch(70.49% 0.187 47.6)", "oklch(55.79% 0.022 301.91)", "oklch(65.59% 0.212 354.31)"],
  },
  {
    id: "luxury",
    label: "Luxury",
    swatches: ["oklch(24.97% 0.0235 60.71)", "oklch(68.75% 0.095 67.23)", "oklch(55.79% 0.022 301.91)", "oklch(64.45% 0.16 354.64)"],
  },
  {
    id: "mintlify",
    label: "Mintlify",
    swatches: ["oklch(98.69% 0.007 145.52)", "oklch(62% 0.194 149.21)", "oklch(84.42% 0.172 84.93)", "oklch(55% 0.016 285.94)"],
  },
  {
    id: "pastel",
    label: "Pastel",
    swatches: ["oklch(28% 0.029 308.75)", "oklch(79% 0.12 295.97)", "oklch(91% 0.05 306.07)", "oklch(72% 0.2 210)"],
  },
  {
    id: "soft",
    label: "Soft",
    swatches: ["oklch(98.8% 0.007 304.24)", "oklch(62.68% 0.233 303.9)", "oklch(55.79% 0.022 301.91)", "oklch(62.31% 0.188 259.81)"],
  },
  {
    id: "black",
    label: "Black",
    swatches: ["oklch(23.2% 0.006 285.95)", "oklch(58% 0.233 277.12)", "oklch(60% 0.118 184.7)", "oklch(51% 0.27 271.36)"],
  },
  {
    id: "marshmallow",
    label: "Marshmallow",
    swatches: ["oklch(100% 0 0)", "oklch(80% 0.14 348.82)", "oklch(74.81% 0.141 97.42)", "oklch(83% 0.09 247.96)"],
  },
];

export function applyTheme(theme: ThemeId) {
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
  localStorage.setItem(THEME_KEY, theme);
}

export default function ThemeSettings() {
  const [current, setCurrent] = useState<ThemeId>("system");

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) as ThemeId | null;
    if (saved) setCurrent(saved);
  }, []);

  function select(theme: ThemeId) {
    setCurrent(theme);
    applyTheme(theme);
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {THEMES.map((t) => {
        const isActive = current === t.id;
        return (
          <button
            key={t.id}
            onClick={() => select(t.id)}
            className={`rounded-xl border-2 p-3 text-left transition-all ${
              isActive
                ? "border-primary shadow-sm"
                : "border-base-200 hover:border-base-300"
            }`}
          >
            {/* Swatch row */}
            <div className="flex gap-1 mb-2">
              {t.swatches.map((color, i) => (
                <span
                  key={i}
                  className="inline-block w-4 h-4 rounded-full ring-1 ring-black/10"
                  style={{ background: color }}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-base-content/70">{t.label}</span>
            {t.id === "system" && (
              <span className="block text-[10px] text-base-content/40 leading-tight mt-0.5">Follows OS</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
