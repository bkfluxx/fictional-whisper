"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "welcome" | "ai-setup" | "done";
type TestState = "idle" | "testing" | "ok" | "fail";

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ current }: { current: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2].map((n, i) => (
        <span key={n} className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full transition-colors ${
              n <= current ? "bg-indigo-500" : "bg-neutral-700"
            }`}
          />
          {i < 1 && (
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

// ─── Wizard ───────────────────────────────────────────────────────────────────

export default function OnboardingWizard() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("welcome");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI setup state
  const [ollamaUrl, setOllamaUrl] = useState("");
  const [testState, setTestState] = useState<TestState>("idle");
  const [aiConnected, setAiConnected] = useState(false);

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

  // ── Finish onboarding ─────────────────────────────────────────────────────
  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
            get you set up in just a moment.
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
            Point to your Ollama instance to enable AI-powered analysis, chat,
            and writing prompts. You can skip this and configure it later in Settings.
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
            onClick={() => setStep("welcome")}
            className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={() => setStep("done")}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // ── Step: Done ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-6">
      <ProgressDots current={2} />

      <div className="text-5xl">🎉</div>
      <div className="text-center max-w-lg">
        <h2 className="text-2xl font-semibold text-white mb-2">
          You&rsquo;re all set!
        </h2>
        <p className="text-neutral-400">
          Start writing and categorize entries however feels natural to you.
          {aiConnected && (
            <span className="block mt-1 text-indigo-400 text-sm">
              ✦ AI assistant is connected and ready.
            </span>
          )}
        </p>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => setStep("ai-setup")}
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
