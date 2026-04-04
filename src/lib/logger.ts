import fs from "fs";
import path from "path";

const LOG_DIR =
  process.env.LOG_DIR ??
  (process.env.NODE_ENV === "production" ? "/app/logs" : "./logs");
const LOG_FILE = path.join(LOG_DIR, "aura.log");
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function ensureDir() {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

function maybeRotate() {
  try {
    const stat = fs.statSync(LOG_FILE);
    if (stat.size >= MAX_BYTES) {
      fs.renameSync(LOG_FILE, LOG_FILE + ".1");
    }
  } catch {
    // file doesn't exist yet — fine
  }
}

function write(level: "error" | "warn", msg: string, err?: unknown) {
  ensureDir();
  maybeRotate();

  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg,
  };

  if (err instanceof Error) {
    entry.error = err.message;
    if (err.stack) entry.stack = err.stack;
  } else if (err !== undefined) {
    entry.error = String(err);
  }

  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n", "utf8");
  } catch {
    // can't log the logger failing
  }
}

export const logger = {
  error: (msg: string, err?: unknown) => write("error", msg, err),
  warn: (msg: string, err?: unknown) => write("warn", msg, err),
  logPath: () => LOG_FILE,
  logDir: () => LOG_DIR,
};
