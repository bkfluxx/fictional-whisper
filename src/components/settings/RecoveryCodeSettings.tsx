"use client";

import { useState, FormEvent } from "react";

type State = "idle" | "confirming" | "saving" | "done" | "error";

export default function RecoveryCodeSettings() {
  const [state, setState] = useState<State>("idle");
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleRegenerate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setState("saving");

    try {
      const res = await fetch("/api/settings/recovery-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to regenerate recovery code");
        setState("confirming");
        return;
      }

      setNewCode(data.recoveryCode ?? "");
      setState("done");
      setCurrentPassword("");
    } catch {
      setError("Something went wrong. Please try again.");
      setState("confirming");
    }
  }

  async function copyCode() {
    await navigator.clipboard.writeText(newCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (state === "done") {
    return (
      <div className="space-y-4 max-w-sm">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
          <p className="text-xs font-medium text-amber-400">
            Your previous recovery code is now invalid. Save this new one — it cannot be shown again.
          </p>
        </div>

        <div className="bg-background border border-foreground/10 rounded-lg px-4 py-4 text-center">
          <p className="font-mono text-sm text-foreground tracking-widest break-all select-all">
            {newCode}
          </p>
        </div>

        <button
          onClick={copyCode}
          className="w-full py-2 border border-foreground/20 text-sm text-foreground/70 hover:text-foreground hover:border-foreground/40 rounded-lg transition-colors"
        >
          {copied ? "Copied!" : "Copy to clipboard"}
        </button>

        <button
          onClick={() => { setState("idle"); setNewCode(""); setCopied(false); }}
          className="text-xs text-foreground/40 hover:text-foreground/70 transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  if (state === "confirming" || state === "saving") {
    return (
      <form onSubmit={handleRegenerate} className="space-y-3 max-w-sm">
        <p className="text-sm text-foreground/60">
          Regenerating invalidates the current code immediately. Enter your password to confirm.
        </p>
        <div>
          <label className="block text-sm text-foreground/70 mb-1">Current password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
            placeholder="Your master password"
            className="w-full px-3 py-2 bg-background border border-foreground/20 rounded-lg text-foreground placeholder-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          />
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={state === "saving" || !currentPassword}
            className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-sm font-medium rounded-full transition-colors"
          >
            {state === "saving" ? "Regenerating…" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => { setState("idle"); setCurrentPassword(""); setError(null); }}
            className="px-4 py-2 text-sm text-foreground/50 hover:text-foreground border border-foreground/20 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-3 max-w-sm">
      <p className="text-sm text-foreground/60">
        Use a recovery code to reset your password if you ever get locked out. Each code can only be used once.
      </p>
      <button
        onClick={() => setState("confirming")}
        className="px-4 py-2 border border-foreground/20 text-sm text-foreground/70 hover:text-foreground hover:border-foreground/40 rounded-lg transition-colors"
      >
        Regenerate recovery code
      </button>
    </div>
  );
}
