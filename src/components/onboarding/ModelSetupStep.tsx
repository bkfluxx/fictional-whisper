"use client";

import { useEffect, useState, useRef } from "react";

export const DEFAULT_CHAT_MODEL = "qwen3.5";
export const DEFAULT_EMBED_MODEL = "qwen3-embedding";

interface ModelInfo {
  name: string;
  size: number;
}

type PullState = "idle" | "pulling" | "done" | "error";

interface PullStatus {
  status?: string;
  pct?: number;
  done?: boolean;
  error?: string;
}

interface Props {
  ollamaUrl: string;
  onContinue: (chatModel: string, embedModel: string) => void;
  onBack: () => void;
}

function humanSize(bytes: number) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  return `${(bytes / 1e6).toFixed(0)} MB`;
}

function ModelPuller({
  url,
  model,
  onDone,
}: {
  url: string;
  model: string;
  onDone: () => void;
}) {
  const [state, setState] = useState<PullState>("idle");
  const [progress, setProgress] = useState<PullStatus>({});
  const pullingRef = useRef(false);

  async function pull() {
    if (pullingRef.current) return;
    pullingRef.current = true;
    setState("pulling");

    const res = await fetch("/api/ai/pull", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, model }),
    });

    if (!res.ok || !res.body) {
      setState("error");
      setProgress({ error: `Request failed (${res.status})` });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";

      for (const chunk of lines) {
        const line = chunk.replace(/^data:\s*/, "").trim();
        if (!line) continue;
        try {
          const obj = JSON.parse(line) as PullStatus;
          setProgress(obj);
          if (obj.done) {
            setState("done");
            onDone();
            return;
          }
          if (obj.error) {
            setState("error");
            return;
          }
        } catch {
          // skip
        }
      }
    }
  }

  if (state === "done") {
    return <span className="text-xs text-emerald-400">✓ Downloaded</span>;
  }
  if (state === "error") {
    return (
      <span className="text-xs text-red-400">
        {progress.error ?? "Pull failed"}
      </span>
    );
  }
  if (state === "pulling") {
    return (
      <div className="flex items-center gap-2 min-w-[140px]">
        <div className="flex-1 h-1.5 bg-base-content/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${progress.pct ?? 0}%` }}
          />
        </div>
        <span className="text-xs text-base-content/60 shrink-0">
          {progress.pct !== undefined ? `${progress.pct}%` : progress.status ?? "…"}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={pull}
      className="text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
    >
      Download
    </button>
  );
}

export default function ModelSetupStep({ ollamaUrl, onContinue, onBack }: Props) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatModel, setChatModel] = useState(DEFAULT_CHAT_MODEL);
  const [embedModel, setEmbedModel] = useState(DEFAULT_EMBED_MODEL);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `/api/ai/ping?url=${encodeURIComponent(ollamaUrl)}`
        );
        const data = (await res.json()) as {
          available: boolean;
          models: ModelInfo[];
        };
        setModels(data.models ?? []);
      } catch {
        setModels([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [ollamaUrl]);

  const modelNames = models.map((m) => m.name);
  const hasChatModel = modelNames.some((n) => n === chatModel || n.startsWith(chatModel + ":"));
  const hasEmbedModel = modelNames.some((n) => n === embedModel || n.startsWith(embedModel + ":"));

  const canContinue = hasChatModel && hasEmbedModel;

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-base-content mb-2">Set up AI models</h2>
        <p className="text-base-content/60 text-sm">
          Whisper needs two models — one for conversation and one for semantic search.
          We&apos;ll download them to your Ollama instance if they&apos;re not already there.
        </p>
      </div>

      {loading ? (
        <div className="text-base-content/40 text-sm">Checking installed models…</div>
      ) : (
        <div className="space-y-4">
          {/* Chat model */}
          <div className="bg-base-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-base-content">Chat model</div>
                <div className="text-xs text-base-content/60 mt-0.5">
                  Used for journaling prompts, analysis, and conversations with Whisper
                </div>
              </div>
              {hasChatModel ? (
                <span className="text-xs text-emerald-400 shrink-0 mt-0.5">✓ Installed</span>
              ) : (
                <ModelPuller
                  url={ollamaUrl}
                  model={chatModel}
                  onDone={() => setModels((prev) => [...prev, { name: chatModel, size: 0 }])}
                />
              )}
            </div>

            {/* Model selector */}
            <div>
              <label className="text-xs text-base-content/40 mb-1 block">Selected model</label>
              {models.length > 0 ? (
                <select
                  value={chatModel}
                  onChange={(e) => setChatModel(e.target.value)}
                  className="w-full bg-base-300 border border-base-content/20 text-base-content text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value={DEFAULT_CHAT_MODEL}>{DEFAULT_CHAT_MODEL} (recommended)</option>
                  {models
                    .filter(
                      (m) =>
                        !m.name.includes("embed") &&
                        m.name !== DEFAULT_CHAT_MODEL &&
                        !m.name.startsWith(DEFAULT_CHAT_MODEL + ":")
                    )
                    .map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name} ({humanSize(m.size)})
                      </option>
                    ))}
                </select>
              ) : (
                <div className="text-sm text-base-content/40 bg-base-300 rounded-lg px-3 py-1.5">
                  {DEFAULT_CHAT_MODEL} (will be downloaded)
                </div>
              )}
            </div>
          </div>

          {/* Embed model */}
          <div className="bg-base-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-base-content">Embedding model</div>
                <div className="text-xs text-base-content/60 mt-0.5">
                  Used for semantic search — find entries by meaning, not just keywords
                </div>
              </div>
              {hasEmbedModel ? (
                <span className="text-xs text-emerald-400 shrink-0 mt-0.5">✓ Installed</span>
              ) : (
                <ModelPuller
                  url={ollamaUrl}
                  model={embedModel}
                  onDone={() => setModels((prev) => [...prev, { name: embedModel, size: 0 }])}
                />
              )}
            </div>

            <div>
              <label className="text-xs text-base-content/40 mb-1 block">Selected model</label>
              {models.length > 0 ? (
                <select
                  value={embedModel}
                  onChange={(e) => setEmbedModel(e.target.value)}
                  className="w-full bg-base-300 border border-base-content/20 text-base-content text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value={DEFAULT_EMBED_MODEL}>{DEFAULT_EMBED_MODEL} (recommended)</option>
                  {models
                    .filter(
                      (m) =>
                        m.name.includes("embed") &&
                        m.name !== DEFAULT_EMBED_MODEL &&
                        !m.name.startsWith(DEFAULT_EMBED_MODEL + ":")
                    )
                    .map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name} ({humanSize(m.size)})
                      </option>
                    ))}
                </select>
              ) : (
                <div className="text-sm text-base-content/40 bg-base-300 rounded-lg px-3 py-1.5">
                  {DEFAULT_EMBED_MODEL} (will be downloaded)
                </div>
              )}
            </div>
          </div>

          {!canContinue && (
            <p className="text-xs text-amber-400">
              Download the models above before continuing.
            </p>
          )}
        </div>
      )}

      <div className="mt-10 flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm text-base-content/40 hover:text-base-content/80 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={() => onContinue(chatModel, embedModel)}
          disabled={!canContinue}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium rounded-xl transition-colors"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
