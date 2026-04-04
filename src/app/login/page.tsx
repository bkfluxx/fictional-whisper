"use client";

import { useState, useEffect, FormEvent } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type Step = "password" | "totp";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("password");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((d) => {
        if (!d.configured) router.replace("/setup");
      });
  }, [router]);

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/check-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.status === 429) {
        setError("Too many attempts. Please wait 15 minutes and try again.");
        return;
      }
      if (!res.ok) {
        setError("Invalid password.");
        return;
      }

      const { requires2fa, challengeToken: token } = await res.json() as {
        requires2fa: boolean;
        challengeToken: string;
      };

      setChallengeToken(token);

      if (requires2fa) {
        setStep("totp");
        setTotpCode("");
      } else {
        // No 2FA — complete sign-in immediately with challenge token
        const result = await signIn("credentials", {
          challengeToken: token,
          redirect: false,
        });
        if (result?.error) {
          setError("Sign-in failed. Please try again.");
          setStep("password");
        } else {
          router.replace("/journal");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleTotpSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        challengeToken,
        totpCode,
        redirect: false,
      });

      if (result?.error === "INVALID_TOTP") {
        setError("Invalid code. Please try again.");
        setTotpCode("");
      } else if (result?.error === "INVALID_CHALLENGE") {
        setError("Session expired or too many attempts. Please start over.");
        setStep("password");
        setPassword("");
        setChallengeToken("");
      } else if (result?.error) {
        setError("Something went wrong. Please try again.");
        setStep("password");
      } else {
        router.replace("/journal");
      }
    } finally {
      setLoading(false);
    }
  }

  function backToPassword() {
    setStep("password");
    setTotpCode("");
    setChallengeToken("");
    setError(null);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-base-100 px-4">
      <div className="w-full max-w-sm px-8 py-10 bg-base-200 rounded-2xl shadow-xl">
        <div className="flex justify-center mb-4">
          <Image src="/logo.jpg" alt="Aura" width={96} height={96} className="rounded-2xl" priority unoptimized />
        </div>
        <p className="text-sm text-center text-base-content/50 mb-8">Your private journal</p>

        {step === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm text-base-content/70 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-base-100 border border-base-content/20 rounded-lg text-base-content placeholder-base-content/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {error && <p className="text-sm text-error">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? "Checking…" : "Continue"}
            </button>
          </form>
        )}

        {step === "totp" && (
          <form onSubmit={handleTotpSubmit} className="space-y-4">
            <div>
              <p className="text-sm font-medium text-base-content mb-1">
                Two-factor authentication
              </p>
              <p className="text-xs text-base-content/50 mb-3">
                Enter the 6-digit code from your authenticator app.
              </p>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9 ]*"
                maxLength={7}
                autoFocus
                autoComplete="one-time-code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="000000"
                className="w-full px-3 py-2 bg-base-100 border border-base-content/20 rounded-lg text-base-content text-center text-lg tracking-widest placeholder-base-content/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
              />
            </div>

            {error && <p className="text-sm text-error">{error}</p>}

            <button
              type="submit"
              disabled={loading || totpCode.replace(/\s/g, "").length < 6}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? "Verifying…" : "Verify"}
            </button>

            <button
              type="button"
              onClick={backToPassword}
              className="w-full py-1.5 text-sm text-base-content/50 hover:text-base-content transition-colors"
            >
              ← Back
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
