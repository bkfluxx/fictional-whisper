"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "aura-update-check-v2";
const CURRENT = process.env.NEXT_PUBLIC_APP_VERSION ?? "";

interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion?: string;
  releaseUrl?: string;
}

export default function UpdateNotice() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) {
      setUpdate(JSON.parse(cached) as UpdateInfo);
      return;
    }

    fetch("/api/update-check")
      .then((r) => r.json())
      .then((d: { hasUpdate?: boolean; latestVersion?: string; releaseUrl?: string }) => {
        const info: UpdateInfo = {
          hasUpdate: d.hasUpdate ?? false,
          latestVersion: d.latestVersion,
          releaseUrl: d.releaseUrl,
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(info));
        setUpdate(info);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="border-t border-border mt-1 pt-3 pb-1 px-3 flex flex-col gap-1">
      <span className="text-xs text-foreground/30">
        Aura{CURRENT ? ` v${CURRENT}` : ""}
      </span>
      {update?.hasUpdate && update.latestVersion && update.releaseUrl && (
        <a
          href={update.releaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:underline"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          v{update.latestVersion} available
        </a>
      )}
    </div>
  );
}
