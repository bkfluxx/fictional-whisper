"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ModelSetupStep from "./ModelSetupStep";
import AuraChatStep from "./AuraChatStep";
import AboutYouStep from "./AboutYouStep";
import FeatureMapStep from "./FeatureMapStep";

// ─── Step definitions ─────────────────────────────────────────────────────────

// AI path:    welcome → ai-connect → model-setup → whisper-chat → feature-map → done
// Non-AI path: welcome → ai-connect → about-you  → feature-map → done

type Step =
  | "welcome"
  | "ai-connect"
  | "model-setup"
  | "aura-chat"
  | "about-you"
  | "feature-map"
  | "done";

type TestState = "idle" | "testing" | "ok" | "fail";

interface CustomTemplate {
  title: string;
  emoji: string;
  body: string;
}

interface UserProfile {
  userName?: string;
  journalingIntention?: string[];
  writingStyle?: string;
  customTemplate?: CustomTemplate;
}

// ─── Progress indicator ───────────────────────────────────────────────────────

const AI_STEPS: Step[] = [
  "welcome",
  "ai-connect",
  "model-setup",
  "aura-chat",
];
const NO_AI_STEPS: Step[] = ["welcome", "ai-connect", "about-you"];

function ProgressBar({ current, aiPath }: { current: Step; aiPath: boolean }) {
  const steps = aiPath ? AI_STEPS : NO_AI_STEPS;
  const idx = steps.indexOf(current);
  if (idx < 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-0.5 bg-muted z-50">
      <div
        className="h-full bg-primary transition-all duration-500"
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
        className="text-xs text-foreground/30 hover:text-foreground/60 transition-colors"
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
      // Send user straight to new entry so they start writing immediately
      router.push("/journal/new");
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

  // ── Step: Welcome (feature overview intro) ───────────────────────────────
  if (step === "welcome") {
    return (
      <>
        <SkipLink onSkip={skipAll} />
        <FeatureMapStep
          aiEnabled={true}
          introMode={true}
          onContinue={() => setStep("ai-connect")}
        />
      </>
    );
  }

  // ── Step: AI Connect ──────────────────────────────────────────────────────
  if (step === "ai-connect") {
    return (
      <div className="max-w-lg mx-auto px-6 py-16">
        <ProgressBar current={step} aiPath={aiPath} />
        <SkipLink onSkip={skipAll} />

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Connect AI assistant{" "}
            <span className="text-foreground/40 font-normal text-lg">(optional)</span>
          </h2>
          <p className="text-foreground/60 text-sm">
            Point to your Ollama instance to enable Aura — your AI journaling companion,
            semantic search, and writing prompts. You can skip this and set it up later in
            Settings.
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground/80">Ollama URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={ollamaUrl}
              onChange={(e) => {
                setOllamaUrl(e.target.value);
                setTestState("idle");
              }}
              placeholder="http://localhost:11434"
              className="flex-1 bg-background border border-foreground/20 text-foreground text-sm rounded-xl px-4 py-2.5 placeholder-foreground/30 focus:outline-none focus:border-primary"
            />
            <button
              onClick={testConnection}
              disabled={!ollamaUrl.trim() || testState === "testing"}
              className="px-4 py-2.5 bg-foreground/10 hover:bg-foreground/20 disabled:opacity-40 text-foreground text-sm rounded-xl transition-colors"
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
            className="text-sm text-foreground/40 hover:text-foreground/80 transition-colors"
          >
            ← Back
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setAiPath(false);
                setStep("about-you");
              }}
              className="text-sm text-foreground/40 hover:text-foreground/80 transition-colors"
            >
              Skip AI
            </button>
            <button
              onClick={() => {
                setAiPath(true);
                setStep("model-setup");
              }}
              disabled={testState !== "ok"}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-40 text-white font-medium rounded-xl transition-colors"
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
            setStep("aura-chat");
          }}
          onBack={() => setStep("ai-connect")}
        />
      </>
    );
  }

  // ── Step: Aura Chat (AI path) ──────────────────────────────────────────
  if (step === "aura-chat") {
    return (
      <>
        <ProgressBar current={step} aiPath={aiPath} />
        <SkipLink onSkip={skipAll} />
        <AuraChatStep
          ollamaUrl={ollamaUrl}
          chatModel={chatModel}
          onContinue={(extracted) => {
            setProfile(extracted);
            setStep("done");
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
            setStep("done");
          }}
          onBack={() => setStep("ai-connect")}
        />
      </>
    );
  }

  // ── Step: Done ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-6">
      <div className="flex justify-center text-foreground/60">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
        </svg>
      </div>
      <div className="text-center max-w-sm">
        <h2 className="text-2xl font-semibold text-foreground mb-2">Ready to write</h2>
        <p className="text-foreground/60 text-sm">
          {profile.userName
            ? `Your journal is set up, ${profile.userName}. Time to write your first entry.`
            : "Your journal is set up. Time to write your first entry."}
        </p>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => setStep(aiPath ? "aura-chat" : "about-you")}
          className="px-5 py-2.5 text-foreground/60 hover:text-foreground transition-colors text-sm"
        >
          ← Back
        </button>
        <button
          onClick={() => finish(profile)}
          disabled={saving}
          className="px-6 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-medium rounded-xl transition-colors"
        >
          {saving ? "Saving…" : "Start journaling →"}
        </button>
      </div>
    </div>
  );
}
