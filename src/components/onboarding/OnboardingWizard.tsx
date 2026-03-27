"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  JOURNAL_TYPES,
  JOURNAL_TYPES_BY_CATEGORY,
  getJournalType,
  type JournalTypeId,
} from "@/lib/journal-types";

type Step = "welcome" | "ai-setup" | "goals" | "select" | "done";
type TestState = "idle" | "testing" | "ok" | "fail";
type RecommendState = "idle" | "loading" | "done" | "error";

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2, 3].map((n, i) => (
        <span key={n} className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full transition-colors ${
              n <= current ? "bg-indigo-500" : "bg-neutral-700"
            }`}
          />
          {i < 2 && (
            <span
              className={`w-8 h-0.5 transition-colors ${
                n < current ? "bg-indigo-500" : "bg-neutral-700"
              }`}
            />
          )}
        </span>
      ))}
    </div>
  );
}

// ─── Journal type card ────────────────────────────────────────────────────────

function TypeCard({
  type,
  selected,
  aiRecommended,
  onToggle,
}: {
  type: (typeof JOURNAL_TYPES)[0];
  selected: boolean;
  aiRecommended: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`relative text-left rounded-xl p-4 border transition-all ${
        selected
          ? "bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500/30"
          : "bg-neutral-900 border-neutral-800 hover:border-neutral-600 hover:bg-neutral-800/60"
      }`}
    >
      {selected && (
        <span className="absolute top-3 right-3 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
          <svg
            className="w-2.5 h-2.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </span>
      )}
      {aiRecommended && !selected && (
        <span className="absolute top-3 right-3 text-xs text-indigo-400">✦</span>
      )}
      <div className="text-2xl mb-2">{type.emoji}</div>
      <div className="text-sm font-medium text-white leading-tight mb-1">
        {type.name}
      </div>
      <div className="text-xs text-neutral-500 leading-snug">{type.description}</div>
    </button>
  );
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

export default function OnboardingWizard() {
  const router = useRouter();

  // Core state
  const [step, setStep] = useState<Step>("welcome");
  const [selected, setSelected] = useState<Set<JournalTypeId>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI setup state
  const [ollamaUrl, setOllamaUrl] = useState("");
  const [testState, setTestState] = useState<TestState>("idle");
  const [aiConnected, setAiConnected] = useState(false);

  // Goals + recommendation state
  const [goals, setGoals] = useState("");
  const [recommendState, setRecommendState] = useState<RecommendState>("idle");
  const [aiRecommended, setAiRecommended] = useState<string[]>([]);
  const [aiReasoning, setAiReasoning] = useState("");

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

  // ── Test Ollama connection ────────────────────────────────────────────────
  async function testConnection() {
    if (!ollamaUrl.trim()) return;
    setTestState("testing");
    try {
      const url = new URL("/api/ai/models", window.location.origin);
      url.searchParams.set("url", ollamaUrl.trim());
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.available) {
        setTestState("ok");
        setAiConnected(true);
      } else {
        setTestState("fail");
        setAiConnected(false);
      }
    } catch {
      setTestState("fail");
      setAiConnected(false);
    }
  }

  // ── Get AI journal type recommendations ───────────────────────────────────
  async function getRecommendations() {
    if (!goals.trim()) return;
    setRecommendState("loading");
    try {
      const res = await fetch("/api/ai/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goals: goals.trim(),
          baseUrl: ollamaUrl.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAiRecommended(data.recommended ?? []);
      setAiReasoning(data.reasoning ?? "");
      // Pre-select the recommended types
      setSelected(new Set(data.recommended as JournalTypeId[]));
      setRecommendState("done");
      setStep("select");
    } catch {
      setRecommendState("error");
    }
  }

  // ── Finish onboarding ─────────────────────────────────────────────────────
  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journalTypes: Array.from(selected),
          ...(ollamaUrl.trim() ? { ollamaBaseUrl: ollamaUrl.trim() } : {}),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push("/journal");
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  // ── Step: Welcome ─────────────────────────────────────────────────────────
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
            personalize your experience in a minute.
          </p>
        </div>
        <button
          onClick={() => setStep("ai-setup")}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
        >
          Get started →
        </button>
      </div>
    );
  }

  // ── Step: AI setup ────────────────────────────────────────────────────────
  if (step === "ai-setup") {
    return (
      <div className="max-w-lg mx-auto px-6 py-16">
        <ProgressDots current={1} />

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-2">
            Connect AI assistant{" "}
            <span className="text-neutral-500 font-normal text-lg">(optional)</span>
          </h2>
          <p className="text-neutral-400">
            Point to your Ollama instance and AI will help recommend journal types
            based on your goals. You can skip this and configure it later in Settings.
          </p>
        </div>

        {/* URL input + test */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-neutral-300">
            Ollama URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={ollamaUrl}
              onChange={(e) => {
                setOllamaUrl(e.target.value);
                setTestState("idle");
                setAiConnected(false);
              }}
              placeholder="http://localhost:11434"
              className="flex-1 bg-neutral-900 border border-neutral-700 text-white text-sm rounded-xl px-4 py-2.5 placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={testConnection}
              disabled={!ollamaUrl.trim() || testState === "testing"}
              className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 text-sm rounded-xl transition-colors"
            >
              {testState === "testing" ? "Testing…" : "Test"}
            </button>
          </div>

          {testState === "ok" && (
            <p className="text-sm text-emerald-400 flex items-center gap-1.5">
              <span>✓</span> Connected — AI is ready
            </p>
          )}
          {testState === "fail" && (
            <p className="text-sm text-red-400 flex items-center gap-1.5">
              <span>✗</span> Could not reach Ollama at that URL
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-10 flex items-center justify-between">
          <button
            onClick={() => setStep("select")}
            className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Skip →
          </button>
          <button
            onClick={() => setStep(aiConnected ? "goals" : "select")}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
          >
            {aiConnected ? "Continue with AI →" : "Choose journals manually →"}
          </button>
        </div>
      </div>
    );
  }

  // ── Step: Goals ───────────────────────────────────────────────────────────
  if (step === "goals") {
    return (
      <div className="max-w-lg mx-auto px-6 py-16">
        <ProgressDots current={2} />

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-2">
            What brings you to journaling?
          </h2>
          <p className="text-neutral-400">
            A sentence or two is enough. AI will suggest which journal types suit
            your goals — you can always change them later.
          </p>
        </div>

        <textarea
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          placeholder="e.g. I want to manage anxiety, track my fitness, and capture creative ideas…"
          rows={5}
          className="w-full bg-neutral-900 border border-neutral-700 text-white text-sm rounded-xl px-4 py-3 placeholder-neutral-600 focus:outline-none focus:border-indigo-500 resize-none"
        />

        {recommendState === "error" && (
          <p className="text-sm text-red-400 mt-2">
            AI recommendation failed — you can pick manually instead.
          </p>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setStep("ai-setup")}
            className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            ← Back
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setStep("select")}
              className="px-4 py-2.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Skip
            </button>
            <button
              onClick={getRecommendations}
              disabled={!goals.trim() || recommendState === "loading"}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {recommendState === "loading" ? "Thinking…" : "✦ Get recommendations →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Select ──────────────────────────────────────────────────────────
  if (step === "select") {
    const categories = Object.entries(JOURNAL_TYPES_BY_CATEGORY);
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <ProgressDots current={2} />

        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold text-white mb-2">
            What kind of journaling speaks to you?
          </h2>
          <p className="text-neutral-400">
            Select all that resonate — you can change this anytime in settings.
          </p>
        </div>

        {/* AI reasoning banner */}
        {aiReasoning && (
          <div className="mb-6 px-4 py-3 bg-indigo-950/40 border border-indigo-800/50 rounded-xl text-sm text-indigo-200 flex gap-2">
            <span className="shrink-0 mt-0.5">✦</span>
            <span>{aiReasoning}</span>
          </div>
        )}

        <div className="flex justify-end mb-4">
          <button
            onClick={selectAll}
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Select all
          </button>
        </div>

        <div className="space-y-8">
          {categories.map(([category, types]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-3">
                {category}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {types.map((type) => (
                  <TypeCard
                    key={type.id}
                    type={type}
                    selected={selected.has(type.id)}
                    aiRecommended={aiRecommended.includes(type.id)}
                    onToggle={() => toggle(type.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

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

  // ── Step: Done ────────────────────────────────────────────────────────────
  const selectedTypes = Array.from(selected)
    .map((id) => getJournalType(id)!)
    .filter(Boolean);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-6">
      <ProgressDots current={3} />

      <div className="text-5xl">🎉</div>
      <div className="text-center max-w-lg">
        <h2 className="text-2xl font-semibold text-white mb-2">
          You&rsquo;re all set!
        </h2>
        <p className="text-neutral-400">
          You&rsquo;ve chosen {selectedTypes.length} journal{" "}
          {selectedTypes.length === 1 ? "type" : "types"}.
          {aiConnected && (
            <span className="block mt-1 text-indigo-400 text-sm">
              ✦ AI assistant is connected and ready.
            </span>
          )}
        </p>
      </div>

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
