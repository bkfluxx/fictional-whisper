"use client";

import { useState } from "react";

type Status = "idle" | "saving" | "success" | "error";

export default function PasswordChangeForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const mismatch = next.length > 0 && confirm.length > 0 && next !== confirm;
  const canSubmit =
    current.length > 0 && next.length >= 8 && next === confirm && status !== "saving";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong");
      } else {
        setStatus("success");
        setMessage("Password updated. Your session stays active.");
        setCurrent("");
        setNext("");
        setConfirm("");
      }
    } catch {
      setStatus("error");
      setMessage("Network error — please try again");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <div>
        <label className="block text-sm text-base-content/60 mb-1.5">Current password</label>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          className="w-full px-3 py-2 bg-base-100 border border-base-content/20 rounded-lg text-sm text-base-content placeholder-base-content/30 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      <div>
        <label className="block text-sm text-base-content/60 mb-1.5">New password</label>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          className="w-full px-3 py-2 bg-base-100 border border-base-content/20 rounded-lg text-sm text-base-content placeholder-base-content/30 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        {next.length > 0 && next.length < 8 && (
          <p className="text-xs text-warning mt-1">Minimum 8 characters</p>
        )}
      </div>

      <div>
        <label className="block text-sm text-base-content/60 mb-1.5">Confirm new password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className={`w-full px-3 py-2 bg-base-100 border rounded-lg text-sm text-base-content placeholder-base-content/30 focus:outline-none transition-colors ${
            mismatch ? "border-error focus:border-error" : "border-base-content/20 focus:border-indigo-500"
          }`}
        />
        {mismatch && <p className="text-xs text-error mt-1">Passwords don&apos;t match</p>}
      </div>

      {message && (
        <p className={`text-sm ${status === "success" ? "text-emerald-500" : "text-error"}`}>
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
      >
        {status === "saving" ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
