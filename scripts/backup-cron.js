#!/usr/bin/env node
/**
 * Nightly pg_dump backup script.
 * Invoked by supercronic (docker/crontab) at 2 AM inside the container.
 * Saves gzipped SQL dumps to /app/backups/, retaining the last 7.
 *
 * Env vars consumed (all set by entrypoint.sh or docker-compose):
 *   DATABASE_URL  — full postgresql:// connection string
 */

"use strict";

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const BACKUP_DIR = "/app/backups";
const KEEP = 7;

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("[backup] DATABASE_URL is not set — aborting");
  process.exit(1);
}

// Timestamp: 2026-03-26T02-00-00
const timestamp = new Date()
  .toISOString()
  .slice(0, 19)
  .replace("T", "T")
  .replace(/:/g, "-");

const filename = `backup-${timestamp}.sql.gz`;
const filepath = path.join(BACKUP_DIR, filename);

// Ensure backup directory exists (volume may not yet be initialised on first run)
fs.mkdirSync(BACKUP_DIR, { recursive: true });

try {
  console.log(`[backup] Starting dump → ${filename}`);
  // pg_dump writes SQL to stdout; gzip compresses it to the output file.
  // DATABASE_URL is set by our own entrypoint — not user-supplied, safe to interpolate.
  execSync(`pg_dump "${dbUrl}" | gzip > "${filepath}"`, {
    shell: true,
    stdio: ["ignore", "inherit", "inherit"],
  });
  const sizeKB = Math.round(fs.statSync(filepath).size / 1024);
  console.log(`[backup] Done — ${filename} (${sizeKB} KB)`);
} catch (err) {
  console.error("[backup] pg_dump failed:", err.message);
  // Remove partial file if it was created
  try { fs.unlinkSync(filepath); } catch { /* ignore */ }
  process.exit(1);
}

// Prune old backups: keep the most recent KEEP files
try {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("backup-") && f.endsWith(".sql.gz"))
    .sort() // lexicographic = chronological for ISO timestamps
    .reverse();

  for (const f of files.slice(KEEP)) {
    fs.unlinkSync(path.join(BACKUP_DIR, f));
    console.log(`[backup] Pruned old backup: ${f}`);
  }
} catch (err) {
  // Non-fatal — backup succeeded, pruning is best-effort
  console.error("[backup] Pruning failed:", err.message);
}
