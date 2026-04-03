"use client";

import { useEffect } from "react";

const SESSION_KEY = "aura-ollama-warmed";

/**
 * Invisible component that fires a single warm-up request to pre-load
 * both Ollama models into memory on first page load after login.
 *
 * Uses sessionStorage so the request fires once per browser session,
 * not on every client-side navigation. The server-side Ollama calls
 * complete independently — navigating away does not interrupt them.
 */
export default function OllamaWarmup() {
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    fetch("/api/ai/warmup", { method: "POST" }).catch(() => {});
  }, []);

  return null;
}
