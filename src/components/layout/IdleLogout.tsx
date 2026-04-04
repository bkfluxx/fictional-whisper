"use client";

/**
 * Invisible component that signs the user out after IDLE_MS of inactivity.
 * Resets on any mouse, keyboard, touch, or scroll event.
 * Mounted once in the app layout — no UI rendered.
 */

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

const IDLE_MS = 30 * 60 * 1000; // 30 minutes

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
] as const;

export default function IdleLogout() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function reset() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, IDLE_MS);
    }

    // Start the timer and bind activity listeners
    reset();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));

    return () => {
      if (timer.current) clearTimeout(timer.current);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, []);

  return null;
}
