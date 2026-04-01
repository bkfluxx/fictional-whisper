#!/usr/bin/env node
/**
 * Weekly AI digest cron script.
 * Invoked by supercronic (docker/crontab) every Sunday at 8 PM UTC.
 *
 * Calls POST /api/ai/digest authenticated with CRON_SECRET.
 * The API route decrypts entries via the backup DEK (requires BACKUP_SECRET
 * to be set when the app was first configured).
 *
 * Required env vars:
 *   NEXTAUTH_URL   — base URL of the running app (e.g. http://localhost:3000)
 *   CRON_SECRET    — shared secret checked by the digest route
 */

"use strict";

const appUrl = process.env.NEXTAUTH_URL;
const cronSecret = process.env.CRON_SECRET;

if (!appUrl) {
  console.error("[digest] NEXTAUTH_URL is not set — aborting");
  process.exit(1);
}
if (!cronSecret) {
  console.error("[digest] CRON_SECRET is not set — aborting");
  process.exit(1);
}

async function run() {
  console.log(`[digest] Generating weekly digest via ${appUrl}/api/ai/digest`);

  let res;
  try {
    res = await fetch(`${appUrl}/api/ai/digest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
  } catch (err) {
    console.error("[digest] Request failed:", err.message);
    process.exit(1);
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error(`[digest] API returned ${res.status}:`, body);
    process.exit(1);
  }

  if (body.skipped) {
    console.log("[digest] No entries this week — skipped");
    process.exit(0);
  }

  console.log(
    `[digest] Done — week of ${body.weekStart}, ${body.entryCount} entries processed`,
  );
}

run();
