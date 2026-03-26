/**
 * Thin wrapper around the Ollama REST API.
 *
 * Env vars:
 *   OLLAMA_BASE_URL      default: http://localhost:11434
 *   OLLAMA_MODEL         default: llama3.2   (text generation)
 *   OLLAMA_EMBED_MODEL   default: nomic-embed-text  (768-dim embeddings)
 */

const BASE = () => process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
export const MODEL = () => process.env.OLLAMA_MODEL ?? "llama3.2";
export const EMBED_MODEL = () =>
  process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";

/** Returns true if Ollama is reachable. */
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE()}/api/version`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Generate text from a prompt (non-streaming).
 * Throws if Ollama returns an error.
 */
export async function generateText(
  prompt: string,
  system?: string,
): Promise<string> {
  const res = await fetch(`${BASE()}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL(),
      prompt,
      system,
      stream: false,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.status.toString());
    throw new Error(`Ollama generate failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { response: string };
  return data.response.trim();
}

/**
 * Generate an embedding vector for `text`.
 * Supports both the newer `/api/embed` (v0.5+) and legacy `/api/embeddings` APIs.
 */
export async function embedText(text: string): Promise<number[]> {
  // Try new API first
  const res = await fetch(`${BASE()}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL(), input: text }),
  });
  if (res.ok) {
    const data = (await res.json()) as {
      embeddings?: number[][];
      embedding?: number[];
    };
    const vec = data.embeddings?.[0] ?? data.embedding;
    if (!vec) throw new Error("Ollama embed: empty response");
    return vec;
  }
  // Fall back to legacy endpoint
  const res2 = await fetch(`${BASE()}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL(), prompt: text }),
  });
  if (!res2.ok) {
    throw new Error(`Ollama embed failed (${res2.status})`);
  }
  const data2 = (await res2.json()) as { embedding: number[] };
  return data2.embedding;
}

/**
 * Async generator that yields text tokens from a streaming Ollama generate call.
 * Usage:
 *   for await (const token of generateStream(prompt)) { ... }
 */
export async function* generateStream(
  prompt: string,
  system?: string,
): AsyncGenerator<string> {
  const res = await fetch(`${BASE()}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL(),
      prompt,
      system,
      stream: true,
    }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`Ollama stream failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line) as { response?: string; done?: boolean };
        if (obj.response) yield obj.response;
        if (obj.done) return;
      } catch {
        // skip malformed lines
      }
    }
  }
}
