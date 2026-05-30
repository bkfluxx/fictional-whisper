"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "aura-update-check";

interface CheckResult {
  currentVersion: string;
  hasUpdate: boolean;
  latestVersion?: string;
  releaseUrl?: string;
}

export default function UpdateNotice() {
  const [info, setInfo] = useState<CheckResult | null>(null);

  useEffect(() => {
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) {
      setInfo(JSON.parse(cached) as CheckResult);
      return;
    }

    fetch("/api/update-check")
      .then((r) => r.json())
      .then((d: CheckResult) => {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(d));
        setInfo(d);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-1 px-3 py-1">
      {info?.currentVersion && (
        <span className="text-[11px] text-foreground/30 tabular-nums">
          v{info.currentVersion}
        </span>
      )}
      {info?.hasUpdate && info.latestVersion && info.releaseUrl && (
        <a
          href={info.releaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:underline"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          v{info.latestVersion} available
        </a>
      )}
    </div>
  );
}
