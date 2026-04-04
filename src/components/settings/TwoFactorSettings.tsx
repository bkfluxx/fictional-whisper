"use client";

import { useEffect, useState } from "react";

type UIState = "loading" | "disabled" | "setup" | "confirming" | "enabled" | "disabling";

export default function TwoFactorSettings() {
  const [state, setState] = useState<UIState>("loading");
  const [secret, setSecret] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/totp/setup")
      .then((r) => r.json())
      .then((d) => setState(d.enabled ? "enabled" : "disabled"))
      .catch(() => setState("disabled"));
  }, []);

  async function startSetup() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/totp/setup", { method: "POST" });
      const d = await res.json() as { secret: string; qrDataUrl: string };
      setSecret(d.secret);
      setQrDataUrl(d.qrDataUrl);
      setCode("");
      setState("setup");
    } catch {
      setError("Failed to generate setup code.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable() {
    if (code.replace(/\s/g, "").length < 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, secret }),
      });
      if (!res.ok) {
        const d = await res.json() as { error: string };
        setError(d.error ?? "Invalid code.");
        return;
      }
      setCode("");
      setState("enabled");
    } catch {
      setError("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (code.replace(/\s/g, "").length < 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/totp/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const d = await res.json() as { error: string };
        setError(d.error ?? "Invalid code.");
        return;
      }
      setCode("");
      setState("disabled");
    } catch {
      setError("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") {
    return <p className="text-sm text-base-content/40">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      {/* Status row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-base-content">Two-factor authentication</p>
          <p className="text-xs text-base-content/40 mt-0.5">
            {state === "enabled"
              ? "On · Authenticator app"
              : "Off · Login requires only your password"}
          </p>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            state === "enabled"
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-base-content/10 text-base-content/40"
          }`}
        >
          {state === "enabled" ? "Enabled" : "Disabled"}
        </span>
      </div>

      {error && <p className="text-xs text-error">{error}</p>}

      {/* Disabled state */}
      {state === "disabled" && (
        <button
          onClick={startSetup}
          disabled={busy}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Enable 2FA
        </button>
      )}

      {/* Setup flow — show QR code */}
      {state === "setup" && (
        <div className="space-y-4 rounded-lg border border-base-content/10 p-4">
          <p className="text-sm text-base-content/70">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="2FA QR code" className="w-48 h-48 rounded-lg" />
          <div>
            <p className="text-xs text-base-content/40 mb-1">Or enter this code manually:</p>
            <p className="font-mono text-sm bg-base-200 rounded px-3 py-1.5 text-base-content tracking-widest break-all">
              {secret}
            </p>
          </div>
          <div>
            <label className="text-xs text-base-content/50 mb-1 block">
              Enter the 6-digit code from your app to confirm
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9 ]*"
              maxLength={7}
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(null); }}
              placeholder="000000"
              className="w-40 px-3 py-2 bg-base-100 border border-base-content/20 rounded-lg text-base-content text-center text-lg tracking-widest font-mono placeholder-base-content/30 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={confirmEnable}
              disabled={busy || code.replace(/\s/g, "").length < 6}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {busy ? "Confirming…" : "Confirm & Enable"}
            </button>
            <button
              onClick={() => { setState("disabled"); setCode(""); setError(null); }}
              className="px-4 py-2 bg-base-200 hover:bg-base-300 text-base-content/60 text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Enabled state — disable flow */}
      {state === "enabled" && (
        <div className="space-y-3">
          {state === "enabled" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-base-content/50 mb-1 block">
                  Enter your current 2FA code to disable
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9 ]*"
                  maxLength={7}
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setError(null); }}
                  placeholder="000000"
                  className="w-40 px-3 py-2 bg-base-100 border border-base-content/20 rounded-lg text-base-content text-center text-lg tracking-widest font-mono placeholder-base-content/30 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={disable}
                disabled={busy || code.replace(/\s/g, "").length < 6}
                className="px-4 py-2 bg-base-200 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-40 text-base-content/60 text-sm font-medium rounded-lg transition-colors"
              >
                {busy ? "Disabling…" : "Disable 2FA"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
