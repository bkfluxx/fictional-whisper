"use client";

import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";

const DEFAULT_NUM_CTX = 8192;
const STEPS = [4096, 8192, 16384, 32768];

function fmt(n: number) {
  return `${n / 1024}k`;
}

export default function ContextWindowSettings() {
  const [value, setValue] = useState(DEFAULT_NUM_CTX);
  const [saved, setSaved] = useState(DEFAULT_NUM_CTX);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    fetch("/api/ai/models")
      .then((r) => r.json())
      .then((data) => {
        const n = data.selected?.numCtx;
        if (typeof n === "number") {
          const snapped = STEPS.reduce((a, b) =>
            Math.abs(b - n) < Math.abs(a - n) ? b : a,
          );
          setValue(snapped);
          setSaved(snapped);
        }
      })
      .catch(() => {});
  }, []);

  const stepIndex = STEPS.indexOf(value);
  const dirty = value !== saved;

  async function save() {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/ai/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numCtx: value }),
      });
      if (!res.ok) throw new Error();
      setSaved(value);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-sm">
      {/* Slider + step indicators */}
      <div className="space-y-3">
        <Slider
          min={0}
          max={STEPS.length - 1}
          step={1}
          value={stepIndex >= 0 ? stepIndex : 1}
          onValueChange={(idx) => setValue(STEPS[idx as number])}
        />

        {/* Step indicator dots + labels */}
        <div className="flex justify-between px-px">
          {STEPS.map((step, i) => {
            const active = stepIndex === i;
            return (
              <button
                key={step}
                onClick={() => setValue(step)}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div
                  className={`w-1 h-1 rounded-full transition-colors ${
                    active
                      ? "bg-primary"
                      : "bg-foreground/25 group-hover:bg-foreground/50"
                  }`}
                />
                <span
                  className={`text-xs tabular-nums transition-colors ${
                    active
                      ? "text-foreground font-medium"
                      : "text-foreground/40 group-hover:text-foreground/60"
                  }`}
                >
                  {fmt(step)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Save row */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-default"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {status === "saved" && (
          <span className="text-xs text-foreground/50">Saved</span>
        )}
        {status === "error" && (
          <span className="text-xs text-destructive">Failed to save</span>
        )}
      </div>
    </div>
  );
}
