"use client";

import { useState, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";

type Step = "form" | "success";

export default function RecoverPage() {
  const [step, setStep] = useState<Step>("form");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newRecoveryCode, setNewRecoveryCode] = useState("");
  const [copied, setCopied] = useState(false);

  const mismatch = confirm.length > 0 && newPassword !== confirm;
  const weak = newPassword.length > 0 && newPassword.length < 8;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm || newPassword.length < 8) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recoveryCode, newPassword }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setError("Too many attempts. Please wait 15 minutes and try again.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Recovery failed. Please try again.");
        return;
      }

      setNewRecoveryCode(data.recoveryCode ?? "");
      setStep("success");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    await navigator.clipboard.writeText(newRecoveryCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.jpg"
            alt="Aura"
            width={72}
            height={72}
            className="rounded-2xl"
            priority
            unoptimized
          />
        </div>

        {step === "form" ? (
          <div>
            <h1 className="text-xl font-semibold text-foreground mb-1 text-center">
              Account recovery
            </h1>
            <p className="text-sm text-foreground/50 text-center mb-6">
              Enter your recovery code and choose a new password.
            </p>

            <form
              onSubmit={handleSubmit}
              className="bg-card rounded-2xl px-8 py-8 shadow-xl space-y-4"
            >
              <div>
                <label className="block text-sm text-foreground/70 mb-1">
                  Recovery code
                </label>
                <input
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                  className="w-full px-3 py-2 bg-background border border-foreground/20 rounded-lg text-foreground font-mono text-sm placeholder-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm text-foreground/70 mb-1">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Re-enter your new password"
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground placeholder-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                    mismatch ? "border-error" : "border-foreground/20"
                  }`}
                />
                {mismatch && (
                  <p className="text-xs text-error mt-1">Passwords do not match</p>
                )}
              </div>

              {error && <p className="text-sm text-error">{error}</p>}

              <button
                type="submit"
                disabled={
                  loading ||
                  !recoveryCode.trim() ||
                  newPassword.length < 8 ||
                  newPassword !== confirm
                }
                className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-medium rounded-full transition-colors"
              >
                {loading ? "Recovering…" : "Reset password →"}
              </button>
            </form>

            <p className="text-center mt-4">
              <Link
                href="/login"
                className="text-sm text-foreground/40 hover:text-foreground/70 transition-colors"
              >
                ← Back to login
              </Link>
            </p>
          </div>
        ) : (
          <div>
            <h1 className="text-xl font-semibold text-foreground mb-1 text-center">
              Password reset
            </h1>
            <p className="text-sm text-foreground/50 text-center mb-6">
              Your password has been updated. Save your new recovery code before logging in.
            </p>

            <div className="bg-card rounded-2xl px-6 py-6 shadow-xl space-y-5">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
                <p className="text-xs font-medium text-amber-400">
                  Your previous recovery code has been invalidated. Save this new one — it cannot be shown again.
                </p>
              </div>

              <div className="bg-background rounded-lg px-4 py-4 text-center">
                <p className="font-mono text-sm text-foreground tracking-widest break-all select-all">
                  {newRecoveryCode}
                </p>
              </div>

              <button
                onClick={copyCode}
                className="w-full py-2 border border-foreground/20 text-sm text-foreground/70 hover:text-foreground hover:border-foreground/40 rounded-lg transition-colors"
              >
                {copied ? "Copied!" : "Copy to clipboard"}
              </button>

              <Link
                href="/login"
                className="block w-full py-2.5 bg-primary hover:bg-primary/90 text-white font-medium rounded-full transition-colors text-center"
              >
                Go to login →
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
