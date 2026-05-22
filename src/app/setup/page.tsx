"use client";

import { useState, FormEvent, useEffect } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Calendar,
  MessageCircle,
  BarChart2,
  Settings,
  Target,
} from "lucide-react";

const FEATURES = [
  {
    Icon: BookOpen,
    name: "Journal",
    description:
      "Write entries, set your mood, and categorise your thoughts. Every word is encrypted on your device.",
  },
  {
    Icon: Calendar,
    name: "Timeline",
    description:
      "Browse your entries chronologically and revisit past moments with ease.",
  },
  {
    Icon: MessageCircle,
    name: "Chat",
    description:
      "Ask Aura anything about your journal. Semantic search finds entries by meaning, not just keywords.",
  },
  {
    Icon: BarChart2,
    name: "Analytics",
    description:
      "Track your streak, mood trends, and writing habits over time with visual charts.",
  },
  {
    Icon: Settings,
    name: "Settings",
    description:
      "Configure AI models, manage templates, and import or export your data.",
  },
  {
    Icon: Target,
    name: "Goals",
    description:
      "Set intentions and track progress on what matters most to you.",
  },
];

export default function SetupPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "deriving" | "show-recovery" | "done">("idle");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((d) => {
        if (d.configured) router.replace("/login");
      });
  }, [router]);

  const mismatch = confirm.length > 0 && password !== confirm;
  const weak = password.length > 0 && password.length < 8;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm || password.length < 8) return;

    setError(null);
    setStatus("deriving");

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Setup failed");
        setStatus("idle");
        return;
      }

      const data = await res.json();
      setRecoveryCode(data.recoveryCode ?? "");
      setPendingPassword(password);
      setStatus("show-recovery");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  async function handleRecoveryAcknowledged() {
    setStatus("done");
    const result = await signIn("credentials", { password: pendingPassword, redirect: false });
    if (result?.error) {
      setError("Account created but sign-in failed. Please go to the login page.");
      setStatus("idle");
      return;
    }
    router.replace("/onboarding");
  }

  async function copyCode() {
    await navigator.clipboard.writeText(recoveryCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Feature cards panel — stacks above form on mobile, left side on desktop */}
      <div className="lg:w-1/2 flex flex-col justify-center bg-card/40 px-8 py-10 lg:px-12 lg:py-16">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Image
              src="/logo.jpg"
              alt="Aura"
              width={36}
              height={36}
              className="rounded-xl"
              priority
              unoptimized
            />
            <span className="text-lg font-bold text-foreground">Aura</span>
          </div>
          <p className="text-sm text-foreground/40">
            Your private, encrypted journal.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FEATURES.map(({ Icon, name, description }) => (
            <div
              key={name}
              className="bg-card border border-foreground/10 rounded-xl p-4 flex flex-col gap-2"
            >
              <div className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="font-bold text-sm text-foreground">{name}</span>
              <p className="text-xs text-foreground/50 leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Recovery code acknowledgement screen */}
          {status === "show-recovery" ? (
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-2">
                Save your recovery code
              </h1>
              <p className="text-sm text-foreground/50 mb-6">
                If you ever forget your password, this code lets you set a new one
                without losing your journal. It will never be shown again.
              </p>

              <div className="bg-card rounded-2xl px-6 py-6 shadow-xl space-y-5">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
                  <p className="text-xs font-medium text-amber-400">
                    Write this down or store it in a safe place. Once you continue, it cannot be retrieved.
                  </p>
                </div>

                <div className="bg-background rounded-lg px-4 py-4 text-center">
                  <p className="font-mono text-sm text-foreground tracking-widest break-all select-all">
                    {recoveryCode}
                  </p>
                </div>

                <button
                  onClick={copyCode}
                  className="w-full py-2 border border-foreground/20 text-sm text-foreground/70 hover:text-foreground hover:border-foreground/40 rounded-lg transition-colors"
                >
                  {copied ? "Copied!" : "Copy to clipboard"}
                </button>

                <button
                  onClick={handleRecoveryAcknowledged}
                  className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors"
                >
                  I&apos;ve saved my recovery code →
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-8">
                <h1 className="text-2xl font-semibold text-foreground mb-2">
                  Welcome to Aura
                </h1>
                <p className="text-base text-foreground/50">
                  Set a master password to get started.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="bg-card rounded-2xl px-8 py-8 shadow-xl space-y-4"
              >
                <div>
                  <label className="block text-sm text-foreground/70 mb-1">
                    Master password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    className="w-full px-3 py-2 bg-background border border-foreground/20 rounded-lg text-foreground placeholder-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  {weak && (
                    <p className="text-xs text-warning mt-1">
                      At least 8 characters required
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-foreground/70 mb-1">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground placeholder-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                      mismatch ? "border-error" : "border-foreground/20"
                    }`}
                  />
                  {mismatch && (
                    <p className="text-xs text-error mt-1">
                      Passwords do not match
                    </p>
                  )}
                </div>

                {error && <p className="text-sm text-error">{error}</p>}

                <button
                  type="submit"
                  disabled={
                    status !== "idle" ||
                    password.length < 8 ||
                    password !== confirm
                  }
                  className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                >
                  {status === "deriving"
                    ? "Setting up… (this takes a moment)"
                    : "Create account →"}
                </button>

                <p className="text-xs text-foreground/30 text-center pt-1">
                  Your password encrypts all journal entries and is never sent to any server.
                  A recovery code will be generated in the next step.
                </p>
              </form>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
