"use client";

/**
 * AiPanel — collapsible AI sidebar shown inside the entry editor.
 *
 * Features:
 *   - Analyze: requests summary + mood detection from Ollama
 *   - Apply mood: lets the user push the AI-detected mood back to the form
 *   - Writing prompts: fetches 3 prompts for the current journal type
 */

import { useState } from "react";

interface AiPanelProps {
  entryId: string | null; // null = entry not yet saved
  journalType: string;
  currentMood: string;
  onApplyMood: (mood: string) => void;
  onApplyPrompt: (prompt: string) => void;
}

type AnalysisState = "idle" | "loading" | "done" | "error";
type PromptState = "idle" | "loading" | "done" | "error";

export default function AiPanel({
  entryId,
  journalType,
  onApplyMood,
  onApplyPrompt,
}: AiPanelProps) {
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [summary, setSummary] = useState<string | null>(null);
  const [aiMood, setAiMood] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [promptState, setPromptState] = useState<PromptState>("idle");
  const [prompts, setPrompts] = useState<string[]>([]);
  const [promptError, setPromptError] = useState<string | null>(null);

  async function analyze() {
    if (!entryId) return;
    setAnalysisState("loading");
    setSummary(null);
    setAiMood(null);
    setAnalysisError(null);

    try {
      const res = await fetch(`/api/ai/analyze/${entryId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setAnalysisError(data.error ?? "Analysis failed");
        setAnalysisState("error");
        return;
      }
      // Also trigger embedding in background (fire-and-forget)
      fetch(`/api/ai/embed/${entryId}`, { method: "POST" }).catch(() => {});
      setSummary(data.summary);
      setAiMood(data.aiMood);
      setAnalysisState("done");
    } catch {
      setAnalysisError("Network error");
      setAnalysisState("error");
    }
  }

  async function fetchPrompts() {
    setPromptState("loading");
    setPrompts([]);
    setPromptError(null);

    try {
      const res = await fetch("/api/ai/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journalType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromptError(data.error ?? "Failed to fetch prompts");
        setPromptState("error");
        return;
      }
      setPrompts(data.prompts ?? []);
      setPromptState("done");
    } catch {
      setPromptError("Network error");
      setPromptState("error");
    }
  }

  const MOOD_EMOJI: Record<string, string> = {
    joyful: "😄",
    content: "😌",
    neutral: "😐",
    reflective: "🤔",
    anxious: "😰",
    frustrated: "😤",
    sad: "😢",
  };

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto">
      {/* Analysis section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
            Analysis
          </h3>
          <button
            onClick={analyze}
            disabled={!entryId || analysisState === "loading"}
            className="text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-md transition-colors"
          >
            {analysisState === "loading" ? "Analyzing…" : "Analyze"}
          </button>
        </div>

        {!entryId && (
          <p className="text-xs text-neutral-600">
            Save the entry first to enable AI analysis.
          </p>
        )}

        {analysisState === "error" && (
          <p className="text-xs text-red-400">{analysisError}</p>
        )}

        {analysisState === "done" && summary && (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-neutral-500 mb-1">Summary</p>
              <p className="text-sm text-neutral-200 leading-relaxed">
                {summary}
              </p>
            </div>

            {aiMood && (
              <div>
                <p className="text-xs text-neutral-500 mb-1">Detected mood</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-200">
                    {MOOD_EMOJI[aiMood] ?? "•"} {aiMood}
                  </span>
                  <button
                    onClick={() => onApplyMood(aiMood)}
                    className="text-xs px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="border-t border-neutral-800" />

      {/* Writing prompts section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
            Prompts
          </h3>
          <button
            onClick={fetchPrompts}
            disabled={promptState === "loading"}
            className="text-xs px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 rounded-md transition-colors"
          >
            {promptState === "loading" ? "Loading…" : "Suggest"}
          </button>
        </div>

        {promptState === "error" && (
          <p className="text-xs text-red-400">{promptError}</p>
        )}

        {promptState === "done" && prompts.length > 0 && (
          <ul className="space-y-2">
            {prompts.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-xs text-neutral-600 mt-0.5 shrink-0">
                  {i + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-300 leading-snug">{p}</p>
                  <button
                    onClick={() => onApplyPrompt(p)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 mt-0.5 transition-colors"
                  >
                    Use this prompt
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {promptState === "idle" && (
          <p className="text-xs text-neutral-600">
            Get writing ideas for your{" "}
            {journalType ? journalType.replace(/-/g, " ") : "journal"}.
          </p>
        )}
      </section>
    </div>
  );
}
