/**
 * Thin wrapper around the Ollama REST API.
 *
 * Env var defaults (each function also accepts explicit overrides):
 *   OLLAMA_BASE_URL      default: http://localhost:11434
 *   OLLAMA_MODEL         default: llama3.2
 *   OLLAMA_EMBED_MODEL   default: nomic-embed-text
 */

export const DEFAULT_BASE_URL = () =>
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
export const DEFAULT_MODEL = () => process.env.OLLAMA_MODEL ?? "llama3.2";
export const DEFAULT_EMBED_MODEL = () =>
  process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";

export interface OllamaModelInfo {
  name: string;
  size: number;
  modifiedAt: string;
}

/** Returns true if Ollama is reachable at `baseUrl`. */
export async function isOllamaAvailable(baseUrl?: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl ?? DEFAULT_BASE_URL()}/api/version`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Returns the list of models pulled in this Ollama instance. */
export async function listModels(baseUrl?: string): Promise<OllamaModelInfo[]> {
  const res = await fetch(`${baseUrl ?? DEFAULT_BASE_URL()}/api/tags`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Ollama /api/tags failed (${res.status})`);
  const data = (await res.json()) as {
    models: Array<{ name: string; size: number; modified_at: string }>;
  };
  return (data.models ?? []).map((m) => ({
    name: m.name,
    size: m.size,
    modifiedAt: m.modified_at,
  }));
}

/** Non-streaming text generation. */
export async function generateText(
  prompt: string,
  system?: string,
  model?: string,
  baseUrl?: string,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(`${baseUrl ?? DEFAULT_BASE_URL()}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model ?? DEFAULT_MODEL(),
      prompt,
      system,
      stream: false,
    }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.status.toString());
    throw new Error(`Ollama generate failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { response: string };
  return data.response.trim();
}

/**
 * Non-streaming JSON generation.
 * Uses Ollama's `format:"json"` to guarantee valid JSON output.
 */
export async function generateJson<T = unknown>(
  prompt: string,
  system?: string,
  model?: string,
  baseUrl?: string,
): Promise<T> {
  const res = await fetch(`${baseUrl ?? DEFAULT_BASE_URL()}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model ?? DEFAULT_MODEL(),
      prompt,
      system,
      stream: false,
      format: "json",
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.status.toString());
    throw new Error(`Ollama generate failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { response: string };
  return JSON.parse(data.response.trim()) as T;
}

/**
 * Embedding. Supports new `/api/embed` (v0.5+) and legacy `/api/embeddings`.
 */
export async function embedText(
  text: string,
  model?: string,
  baseUrl?: string,
): Promise<number[]> {
  const base = baseUrl ?? DEFAULT_BASE_URL();
  const embedModel = model ?? DEFAULT_EMBED_MODEL();

  const res = await fetch(`${base}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: embedModel, input: text }),
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
  const res2 = await fetch(`${base}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: embedModel, prompt: text }),
  });
  if (!res2.ok) throw new Error(`Ollama embed failed (${res2.status})`);
  const data2 = (await res2.json()) as { embedding: number[] };
  return data2.embedding;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Multi-turn streaming chat via /api/chat.
 * Accepts a full messages array (system + history + current user message).
 */
export async function* chatStream(
  messages: ChatMessage[],
  model?: string,
  baseUrl?: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const res = await fetch(`${baseUrl ?? DEFAULT_BASE_URL()}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model ?? DEFAULT_MODEL(),
      messages,
      stream: true,
    }),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`Ollama chat failed (${res.status})`);
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
        const obj = JSON.parse(line) as {
          message?: { content?: string };
          done?: boolean;
        };
        if (obj.message?.content) yield obj.message.content;
        if (obj.done) return;
      } catch {
        // skip malformed lines
      }
    }
  }
}

/** Streaming token generator. */
export async function* generateStream(
  prompt: string,
  system?: string,
  model?: string,
  baseUrl?: string,
): AsyncGenerator<string> {
  const res = await fetch(`${baseUrl ?? DEFAULT_BASE_URL()}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model ?? DEFAULT_MODEL(),
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
