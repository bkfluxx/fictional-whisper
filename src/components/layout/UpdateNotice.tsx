"use client";

/**
 * Checks for a newer Aura release once per browser session.
 * If one is available, renders a subtle notice at the bottom of the sidebar.
 */

import { useEffect, useState } from "react";

const SESSION_KEY = "aura-update-check";

interface UpdateInfo {
  latestVersion: string;
  releaseUrl: string;
}

export default function UpdateNotice() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as UpdateInfo | null;
      setUpdate(parsed);
      return;
    }

    fetch("/api/update-check")
      .then((r) => r.json())
      .then((d: { hasUpdate?: boolean; latestVersion?: string; releaseUrl?: string }) => {
        const info = d.hasUpdate && d.latestVersion && d.releaseUrl
          ? { latestVersion: d.latestVersion, releaseUrl: d.releaseUrl }
          : null;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(info));
        setUpdate(info);
      })
      .catch(() => sessionStorage.setItem(SESSION_KEY, JSON.stringify(null)));
  }, []);

  if (!update) return null;

  return (
    <a
      href={update.releaseUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
      v{update.latestVersion} available
    </a>
  );
}
