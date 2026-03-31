"use client";

import { useState, FormEvent, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "deriving" | "done">("idle");

  // If already configured, bounce to login
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

      const result = await signIn("credentials", { password, redirect: false });
      if (result?.error) {
        setError("Account created but sign-in failed. Please go to the login page.");
        setStatus("idle");
        return;
      }

      setStatus("done");
      router.replace("/onboarding");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-base-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">📖</div>
          <h1 className="text-2xl font-semibold text-base-content mb-2">
            Welcome to Fictional Whisper
          </h1>
          <p className="text-sm text-base-content/50">
            Set a master password to get started. This password encrypts all
            your journal entries — there is no way to recover it, so choose
            something you will remember.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-base-200 rounded-2xl px-8 py-8 shadow-xl space-y-4"
        >
          <div>
            <label className="block text-sm text-base-content/70 mb-1">
              Master password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="w-full px-3 py-2 bg-base-300 border border-base-content/20 rounded-lg text-base-content placeholder-base-content/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {weak && (
              <p className="text-xs text-warning mt-1">
                At least 8 characters required
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-base-content/70 mb-1">
              Confirm password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              className={`w-full px-3 py-2 bg-base-300 border rounded-lg text-base-content placeholder-base-content/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                mismatch ? "border-error" : "border-base-content/20"
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
              status !== "idle" ||
              password.length < 8 ||
              password !== confirm
            }
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {status === "deriving"
              ? "Setting up… (this takes a moment)"
              : status === "done"
                ? "Done!"
                : "Create account →"}
          </button>

          <p className="text-xs text-base-content/30 text-center pt-1">
            Your password is never sent to any server — encryption happens
            entirely on your machine.
          </p>
        </form>
      </div>
    </main>
  );
}
