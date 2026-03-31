"use client";

import { useEffect } from "react";
import { THEME_KEY } from "./settings/ThemeSettings";

// Mounted in the root layout so every page gets OS-preference tracking
// when the user is in "system" mode.
export default function ThemeProvider() {
  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved && saved !== "system") return; // explicit theme — no listener needed

    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    function applyOS(dark: boolean) {
      document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    }

    // Set immediately in case the anti-flash script ran before localStorage was ready
    applyOS(mq.matches);

    function handler(e: MediaQueryListEvent) {
      if (!localStorage.getItem(THEME_KEY) || localStorage.getItem(THEME_KEY) === "system") {
        applyOS(e.matches);
      }
    }

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return null;
}
