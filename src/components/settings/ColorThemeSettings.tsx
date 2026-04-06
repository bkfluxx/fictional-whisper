"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PALETTE_PRESETS,
  applyColorPalette,
  loadSavedColorTheme,
  hexToOklch,
  type ColorThemeState,
  type PaletteId,
} from "@/lib/theme";

// ─── Custom color picker slot ─────────────────────────────────────────────────

function ColorSlot({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const [oklch, setOklch] = useState("");

  useEffect(() => {
    try {
      const [l, c, h] = hexToOklch(value);
      setOklch(`L ${(l * 100).toFixed(0)}% C ${c.toFixed(2)} H ${h.toFixed(0)}°`);
    } catch { setOklch(""); }
  }, [value]);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-foreground/60">{label}</label>
      <div className="flex items-center gap-3">
        <div className="relative">
          <div
            className="w-10 h-10 rounded-full border-2 border-border shadow-sm overflow-hidden cursor-pointer"
            style={{ background: value }}
          >
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>
        </div>
        <div>
          <p className="text-sm font-mono text-foreground/80">{value.toUpperCase()}</p>
          <p className="text-[10px] text-foreground/40 mt-0.5">{oklch}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ColorThemeSettings() {
  const [state, setState] = useState<ColorThemeState>({ preset: "olive" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setState(loadSavedColorTheme());
    setMounted(true);
  }, []);

  const apply = useCallback((next: ColorThemeState) => {
    setState(next);
    applyColorPalette(next);
  }, []);

  function selectPreset(id: PaletteId) {
    if (id === "custom") {
      apply({
        preset: "custom",
        customBase:  state.customBase  ?? "#4a7c59",
        customTheme: state.customTheme ?? "#2d7a4f",
        customChart: state.customChart ?? "#3aa876",
      });
    } else {
      apply({ preset: id });
    }
  }

  function updateCustom(field: "customBase" | "customTheme" | "customChart", hex: string) {
    const next: ColorThemeState = {
      preset: "custom",
      customBase:  state.customBase  ?? "#4a7c59",
      customTheme: state.customTheme ?? "#2d7a4f",
      customChart: state.customChart ?? "#3aa876",
      [field]: hex,
    };
    apply(next);
  }

  if (!mounted) {
    return <div className="h-48 rounded-2xl bg-muted animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      {/* Preset grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PALETTE_PRESETS.map((p) => {
          const isActive = state.preset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => selectPreset(p.id)}
              className={`relative flex flex-col gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {/* Swatches */}
              <div className="flex gap-1.5">
                {p.id === "custom"
                  ? [
                      state.customBase  ?? "#4a7c59",
                      state.customTheme ?? "#2d7a4f",
                      state.customChart ?? "#3aa876",
                    ].map((color, i) => (
                      <span
                        key={i}
                        className="inline-block w-5 h-5 rounded-full ring-1 ring-black/10 shrink-0"
                        style={{ background: color }}
                      />
                    ))
                  : p.swatches.map((color, i) => (
                      <span
                        key={i}
                        className="inline-block w-5 h-5 rounded-full ring-1 ring-black/10 shrink-0"
                        style={{ background: color }}
                      />
                    ))}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground leading-none">{p.label}</p>
                <p className="text-[11px] text-foreground/40 mt-1 leading-tight">{p.description}</p>
              </div>
              {isActive && (
                <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Custom color pickers — shown when custom is active */}
      {state.preset === "custom" && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <p className="text-sm font-medium text-foreground">Custom palette</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <ColorSlot
              label="Base color"
              value={state.customBase ?? "#4a7c59"}
              onChange={(hex) => updateCustom("customBase", hex)}
            />
            <ColorSlot
              label="Theme / Primary"
              value={state.customTheme ?? "#2d7a4f"}
              onChange={(hex) => updateCustom("customTheme", hex)}
            />
            <ColorSlot
              label="Chart color"
              value={state.customChart ?? "#3aa876"}
              onChange={(hex) => updateCustom("customChart", hex)}
            />
          </div>
          <p className="text-xs text-foreground/40 leading-relaxed">
            Base tints the page background and surfaces. Theme drives buttons and
            interactive elements. Chart sets the data visualization palette.
          </p>
        </div>
      )}
    </div>
  );
}
