"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ModelSetupStep from "./ModelSetupStep";
import WhisperChatStep from "./WhisperChatStep";
import AboutYouStep from "./AboutYouStep";
import FeatureMapStep from "./FeatureMapStep";

// ─── Step definitions ─────────────────────────────────────────────────────────

// AI path:    welcome → ai-connect → model-setup → whisper-chat → feature-map → done
// Non-AI path: welcome → ai-connect → about-you  → feature-map → done

type Step =
  | "welcome"
  | "ai-connect"
  | "model-setup"
  | "whisper-chat"
  | "about-you"
  | "feature-map"
  | "done";

type TestState = "idle" | "testing" | "ok" | "fail";

interface UserProfile {
  userName?: string;
  journalingIntention?: string[];
  writingStyle?: string;
}

// ─── Progress indicator ───────────────────────────────────────────────────────

const AI_STEPS: Step[] = [
  "welcome",
  "ai-connect",
  "model-setup",
  "whisper-chat",
  "feature-map",
];
const NO_AI_STEPS: Step[] = ["welcome", "ai-connect", "about-you", "feature-map"];

function ProgressBar({ current, aiPath }: { current: Step; aiPath: boolean }) {
  const steps = aiPath ? AI_STEPS : NO_AI_STEPS;
  const idx = steps.indexOf(current);
  if (idx < 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-0.5 bg-neutral-800 z-50">
      <div
        className="h-full bg-indigo-500 transition-all duration-500"
        style={{ width: `${((idx + 1) / steps.length) * 100}%` }}
      />
    </div>
  );
}

// ─── Skip link ────────────────────────────────────────────────────────────────

function SkipLink({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="fixed top-4 right-6 z-50">
      <button
        onClick={onSkip}
        className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
      >
        Skip setup →
      </button>
    </div>
  );
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

export default function OnboardingWizard() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("welcome");
  const [aiPath, setAiPath] = useState(true); // true until user skips/fails AI

  // AI connection state
  const [ollamaUrl, setOllamaUrl] = useState("");
  const [testState, setTestState] = useState<TestState>("idle");

  // AI model selections
  const [chatModel, setChatModel] = useState("");
  const [embedModel, setEmbedModel] = useState("");

  // User profile
  const [profile, setProfile] = useState<UserProfile>({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Finish onboarding ─────────────────────────────────────────────────────
  async function finish(finalProfile: UserProfile = profile) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(ollamaUrl ? { ollamaBaseUrl: ollamaUrl } : {}),
          ...(chatModel ? { ollamaModel: chatModel } : {}),
          ...(embedModel ? { ollamaEmbedModel: embedModel } : {}),
          ...finalProfile,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push("/journal");
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  // Skip everything and go straight to journal
  async function skipAll() {
    setSaving(true);
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => null);
    router.push("/journal");
  }

  // ── Test Ollama connection ────────────────────────────────────────────────
  async function testConnection() {
    if (!ollamaUrl.trim()) return;
    setTestState("testing");
    try {
      const url = new URL("/api/ai/ping", window.location.origin);
      url.searchParams.set("url", ollamaUrl.trim());
      const res = await fetch(url.toString());
      const data = (await res.json()) as { available: boolean };
      if (data.available) {
        setTestState("ok");
      } else {
        setTestState("fail");
      }
    } catch {
      setTestState("fail");
    }
  }

  // ── Step: Welcome ─────────────────────────────────────────────────────────
  if (step === "welcome") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-6">
        <SkipLink onSkip={skipAll} />
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
          onClick={() => setStep("ai-connect")}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
        >
          Get started →
        </button>
      </div>
    );
  }

  // ── Step: AI Connect ──────────────────────────────────────────────────────
  if (step === "ai-connect") {
    return (
      <div className="max-w-lg mx-auto px-6 py-16">
        <ProgressBar current={step} aiPath={aiPath} />
        <SkipLink onSkip={skipAll} />

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-2">
            Connect AI assistant{" "}
            <span className="text-neutral-500 font-normal text-lg">(optional)</span>
          </h2>
          <p className="text-neutral-400 text-sm">
            Point to your Ollama instance to enable Whisper — your AI journaling companion,
            semantic search, and writing prompts. You can skip this and set it up later in
            Settings.
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-neutral-300">Ollama URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={ollamaUrl}
              onChange={(e) => {
                setOllamaUrl(e.target.value);
                setTestState("idle");
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
              <span>✓</span> Connected — Ollama is reachable
            </p>
          )}
          {testState === "fail" && (
            <p className="text-sm text-red-400 flex items-center gap-1.5">
              <span>✗</span> Could not reach Ollama at that URL
            </p>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <button
            onClick={() => setStep("welcome")}
            className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            ← Back
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setAiPath(false);
                setStep("about-you");
              }}
              className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Skip AI
            </button>
            <button
              onClick={() => {
                setAiPath(true);
                setStep("model-setup");
              }}
              disabled={testState !== "ok"}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium rounded-xl transition-colors"
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Model Setup (AI path) ───────────────────────────────────────────
  if (step === "model-setup") {
    return (
      <>
        <ProgressBar current={step} aiPath={aiPath} />
        <SkipLink onSkip={skipAll} />
        <ModelSetupStep
          ollamaUrl={ollamaUrl}
          onContinue={(chat, embed) => {
            setChatModel(chat);
            setEmbedModel(embed);
            setStep("whisper-chat");
          }}
          onBack={() => setStep("ai-connect")}
        />
      </>
    );
  }

  // ── Step: Whisper Chat (AI path) ──────────────────────────────────────────
  if (step === "whisper-chat") {
    return (
      <>
        <ProgressBar current={step} aiPath={aiPath} />
        <SkipLink onSkip={skipAll} />
        <WhisperChatStep
          ollamaUrl={ollamaUrl}
          chatModel={chatModel}
          onContinue={(extracted) => {
            setProfile(extracted);
            setStep("feature-map");
          }}
          onBack={() => setStep("model-setup")}
        />
      </>
    );
  }

  // ── Step: About You (non-AI path) ─────────────────────────────────────────
  if (step === "about-you") {
    return (
      <>
        <ProgressBar current={step} aiPath={aiPath} />
        <SkipLink onSkip={skipAll} />
        <AboutYouStep
          onContinue={(p) => {
            setProfile(p);
            setStep("feature-map");
          }}
          onBack={() => setStep("ai-connect")}
        />
      </>
    );
  }

  // ── Step: Feature Map (both paths) ───────────────────────────────────────
  if (step === "feature-map") {
    return (
      <>
        <ProgressBar current={step} aiPath={aiPath} />
        <FeatureMapStep
          userName={profile.userName}
          aiEnabled={aiPath}
          onContinue={() => setStep("done")}
          onBack={() => setStep(aiPath ? "whisper-chat" : "about-you")}
        />
      </>
    );
  }

  // ── Step: Done ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-6">
      <div className="text-5xl">✨</div>
      <div className="text-center max-w-sm">
        <h2 className="text-2xl font-semibold text-white mb-2">Ready to write</h2>
        <p className="text-neutral-400 text-sm">
          {profile.userName
            ? `Your journal is set up, ${profile.userName}. Time to write your first entry.`
            : "Your journal is set up. Time to write your first entry."}
        </p>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => setStep("feature-map")}
          className="px-5 py-2.5 text-neutral-400 hover:text-neutral-200 transition-colors text-sm"
        >
          ← Back
        </button>
        <button
          onClick={() => finish(profile)}
          disabled={saving}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium rounded-xl transition-colors"
        >
          {saving ? "Saving…" : "Start journaling →"}
        </button>
      </div>
    </div>
  );
}
