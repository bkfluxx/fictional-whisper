"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  JOURNAL_TYPES,
  JOURNAL_TYPES_BY_CATEGORY,
  getJournalType,
  type JournalTypeId,
} from "@/lib/journal-types";

type Step = "welcome" | "select" | "done";

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [selected, setSelected] = useState<Set<JournalTypeId>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: JournalTypeId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(JOURNAL_TYPES.map((t) => t.id)));
  }

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journalTypes: Array.from(selected) }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push("/journal");
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  if (step === "welcome") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-6">
        <div className="text-6xl">📖</div>
        <div className="text-center max-w-lg">
          <h1 className="text-3xl font-semibold text-white mb-3">
            Welcome to Fictional Whisper
          </h1>
          <p className="text-neutral-400 text-lg leading-relaxed">
            Your private, encrypted space for everything that matters. Let&rsquo;s
            personalize your experience in 60 seconds.
          </p>
        </div>
        <button
          onClick={() => setStep("select")}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
        >
          Get started →
        </button>
      </div>
    );
  }

  if (step === "select") {
    const categories = Object.entries(JOURNAL_TYPES_BY_CATEGORY);
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold text-white mb-2">
            What kind of journaling speaks to you?
          </h2>
          <p className="text-neutral-400">
            Select all that resonate — you can change this anytime in settings.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-2 h-2 rounded-full bg-neutral-700" />
          <div className="w-8 h-0.5 bg-indigo-500" />
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <div className="w-8 h-0.5 bg-neutral-700" />
          <div className="w-2 h-2 rounded-full bg-neutral-700" />
        </div>

        {/* Select all shortcut */}
        <div className="flex justify-end mb-4">
          <button
            onClick={selectAll}
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Select all
          </button>
        </div>

        {/* Category groups */}
        <div className="space-y-8">
          {categories.map(([category, types]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-3">
                {category}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {types.map((type) => {
                  const isSelected = selected.has(type.id);
                  return (
                    <button
                      key={type.id}
                      onClick={() => toggle(type.id)}
                      className={`relative text-left rounded-xl p-4 border transition-all ${
                        isSelected
                          ? "bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500/30"
                          : "bg-neutral-900 border-neutral-800 hover:border-neutral-600 hover:bg-neutral-800/60"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-3 right-3 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4.5 12.75l6 6 9-13.5"
                            />
                          </svg>
                        </span>
                      )}
                      <div className="text-2xl mb-2">{type.emoji}</div>
                      <div className="text-sm font-medium text-white leading-tight mb-1">
                        {type.name}
                      </div>
                      <div className="text-xs text-neutral-500 leading-snug">
                        {type.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-10 flex items-center justify-between">
          <span className="text-sm text-neutral-500">
            {selected.size === 0
              ? "Select at least one to continue"
              : `${selected.size} selected`}
          </span>
          <button
            disabled={selected.size === 0}
            onClick={() => setStep("done")}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // step === "done"
  const selectedTypes = Array.from(selected)
    .map((id) => getJournalType(id)!)
    .filter(Boolean);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-neutral-700" />
        <div className="w-8 h-0.5 bg-indigo-500" />
        <div className="w-2 h-2 rounded-full bg-neutral-700" />
        <div className="w-8 h-0.5 bg-indigo-500" />
        <div className="w-2 h-2 rounded-full bg-indigo-500" />
      </div>

      <div className="text-5xl">🎉</div>
      <div className="text-center max-w-lg">
        <h2 className="text-2xl font-semibold text-white mb-2">
          You&rsquo;re all set!
        </h2>
        <p className="text-neutral-400">
          You&rsquo;ve chosen {selectedTypes.length} journal{" "}
          {selectedTypes.length === 1 ? "type" : "types"}.
        </p>
      </div>

      {/* Selected type chips */}
      <div className="flex flex-wrap justify-center gap-2 max-w-lg">
        {selectedTypes.map((type) => (
          <span
            key={type.id}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-full text-sm text-neutral-300"
          >
            <span>{type.emoji}</span>
            <span>{type.name}</span>
          </span>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => setStep("select")}
          className="px-5 py-2.5 text-neutral-400 hover:text-neutral-200 transition-colors text-sm"
        >
          ← Back
        </button>
        <button
          onClick={finish}
          disabled={saving}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium rounded-xl transition-colors"
        >
          {saving ? "Saving…" : "Start journaling →"}
        </button>
      </div>
    </div>
  );
}
