"use client";

/**
 * AiModelsSettings — lets the user configure the Ollama base URL and select
 * which model to use for text generation and embeddings.
 *
 * Loaded by the Settings page.
 */

import { useState, useEffect } from "react";

interface ModelInfo {
  name: string;
  size: number;
  modifiedAt: string;
}

interface SelectedConfig {
  baseUrl: string;
  model: string;
  embedModel: string;
}

type LoadState = "loading" | "offline" | "ready" | "saving" | "saved" | "error";

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${bytes} B`;
}

export default function AiModelsSettings() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selected, setSelected] = useState<SelectedConfig>({
    baseUrl: "",
    model: "",
    embedModel: "",
  });
  const [draft, setDraft] = useState<SelectedConfig>({
    baseUrl: "",
    model: "",
    embedModel: "",
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [testingUrl, setTestingUrl] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);

  useEffect(() => {
    fetch("/api/ai/models")
      .then((r) => r.json())
      .then((data) => {
        const cfg: SelectedConfig = {
          baseUrl: data.selected?.baseUrl ?? "",
          model: data.selected?.model ?? "",
          embedModel: data.selected?.embedModel ?? "",
        };
        setSelected(cfg);
        setDraft(cfg);
        if (!data.available) {
          setLoadState("offline");
          return;
        }
        setModels(data.models ?? []);
        setLoadState("ready");
      })
      .catch(() => setLoadState("offline"));
  }, []);

  const isDirty =
    draft.baseUrl !== selected.baseUrl ||
    draft.model !== selected.model;

  async function testUrl() {
    if (!draft.baseUrl.trim()) return;
    setTestingUrl(true);
    setTestResult(null);
    try {
      const params = new URLSearchParams({ url: draft.baseUrl.trim() });
      const res = await fetch(`/api/ai/models?${params}`);
      const data = await res.json();
      if (data.available) {
        setTestResult("ok");
        setModels(data.models ?? []);
        setLoadState("ready");
      } else {
        setTestResult("fail");
      }
    } catch {
      setTestResult("fail");
    } finally {
      setTestingUrl(false);
    }
  }

  async function save() {
    setLoadState("saving");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/ai/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: draft.baseUrl || null,
          model: draft.model || null,
          embedModel: "nomic-embed-text",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const cfg: SelectedConfig = {
        baseUrl: data.selected?.baseUrl ?? "",
        model: data.selected?.model ?? "",
        embedModel: data.selected?.embedModel ?? "",
      };
      setSelected(cfg);
      setDraft(cfg);
      setLoadState("saved");
      setTimeout(() => setLoadState(models.length > 0 ? "ready" : "offline"), 2000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Save failed");
      setLoadState("error");
    }
  }

  if (loadState === "loading") {
    return <p className="text-sm text-base-content/50">Checking Ollama…</p>;
  }

  return (
    <div className="space-y-6">
      {/* URL field — always visible */}
      <div>
        <label className="block text-xs font-medium text-base-content/60 mb-1.5">
          Ollama base URL
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={draft.baseUrl}
            onChange={(e) => {
              setDraft((d) => ({ ...d, baseUrl: e.target.value }));
              setTestResult(null);
            }}
            placeholder="http://localhost:11434"
            className="flex-1 bg-base-100 border border-base-content/20 text-base-content text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 placeholder:text-base-content/30"
          />
          <button
            onClick={testUrl}
            disabled={testingUrl || !draft.baseUrl.trim()}
            className="px-3 py-2 bg-base-content/10 hover:bg-base-content/20 disabled:opacity-40 text-base-content text-sm rounded-lg transition-colors whitespace-nowrap"
          >
            {testingUrl ? "Testing…" : "Test"}
          </button>
        </div>
        {testResult === "ok" && (
          <p className="text-xs text-emerald-500 mt-1.5">Connected — models loaded.</p>
        )}
        {testResult === "fail" && (
          <p className="text-xs text-red-500 mt-1.5">Could not reach Ollama at that URL.</p>
        )}
        {loadState === "offline" && testResult === null && (
          <p className="text-xs text-amber-500 mt-1.5">
            Ollama is not reachable at the current URL. Update it above and click Test.
          </p>
        )}
      </div>

      {/* Model selectors — only when models are available */}
      {models.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* LLM model */}
          <div>
            <label className="block text-xs font-medium text-base-content/60 mb-1.5">
              Text model
              <span className="text-base-content/40 font-normal ml-1">
                (analysis, chat, prompts)
              </span>
            </label>
            <select
              value={draft.model}
              onChange={(e) =>
                setDraft((d) => ({ ...d, model: e.target.value }))
              }
              className="w-full bg-base-100 border border-base-content/20 text-base-content text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              {models.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} ({formatBytes(m.size)})
                </option>
              ))}
            </select>
          </div>

          {/* Embed model — fixed */}
          <div>
            <label className="block text-xs font-medium text-base-content/60 mb-1.5">
              Embedding model
              <span className="text-base-content/40 font-normal ml-1">
                (semantic search, chat context)
              </span>
            </label>
            <div className="w-full bg-base-100 border border-base-content/20 text-sm rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="font-mono text-base-content/70">nomic-embed-text</span>
              <span className="text-xs text-base-content/30">fixed</span>
            </div>
            <p className="text-xs text-base-content/40 mt-1">
              Fixed to <span className="font-mono">nomic-embed-text</span> (768-dim) to match the search index.
            </p>
          </div>
        </div>
      )}

      {models.length > 0 && (
        <p className="text-xs text-base-content/40 border border-base-content/10 rounded-lg px-3 py-2 leading-relaxed">
          <span className="text-base-content/60 font-medium">Model tip:</span> Fictional Whisper works best with thinking-enabled models (e.g. <span className="font-mono text-base-content/60">qwen3</span>, <span className="font-mono text-base-content/60">deepseek-r2</span>). Thinking models reason through prompts before responding, which significantly improves journaling insights and chat quality.
        </p>
      )}

      {models.length === 0 && loadState === "ready" && (
        <p className="text-sm text-base-content/50">
          No models found. Pull one with:{" "}
          <code className="text-base-content/80 bg-base-200 px-1.5 py-0.5 rounded text-xs">
            ollama pull llama3.2
          </code>
        </p>
      )}

      {/* Available models table */}
      {models.length > 0 && (
        <div>
          <p className="text-xs font-medium text-base-content/40 mb-2 uppercase tracking-widest">
            Pulled models
          </p>
          <div className="rounded-xl border border-base-content/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-content/10">
                  <th className="text-left px-4 py-2 text-xs text-base-content/50 font-medium">
                    Model
                  </th>
                  <th className="text-right px-4 py-2 text-xs text-base-content/50 font-medium">
                    Size
                  </th>
                </tr>
              </thead>
              <tbody>
                {models.map((m, i) => (
                  <tr
                    key={m.name}
                    className={
                      i < models.length - 1 ? "border-b border-base-content/10" : ""
                    }
                  >
                    <td className="px-4 py-2.5 text-base-content font-mono text-xs">
                      {m.name}
                      {(m.name === selected.model ||
                        m.name === selected.embedModel) && (
                        <span className="ml-2 text-indigo-500 font-sans font-normal">
                          {m.name === selected.model &&
                          m.name === selected.embedModel
                            ? "text + embed"
                            : m.name === selected.model
                              ? "text"
                              : "embed"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-base-content/50 text-right">
                      {formatBytes(m.size)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Save row */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={!isDirty || loadState === "saving"}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loadState === "saving"
            ? "Saving…"
            : loadState === "saved"
              ? "Saved"
              : "Save"}
        </button>
        {loadState === "error" && errorMsg && (
          <p className="text-sm text-error">{errorMsg}</p>
        )}
      </div>
    </div>
  );
}
