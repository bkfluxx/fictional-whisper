"use client";

/**
 * AiModelsSettings — lets the user view available Ollama models and select
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

interface SelectedModels {
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
  const [selected, setSelected] = useState<SelectedModels>({
    model: "",
    embedModel: "",
  });
  const [draft, setDraft] = useState<SelectedModels>({ model: "", embedModel: "" });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai/models")
      .then((r) => r.json())
      .then((data) => {
        if (!data.available) {
          setLoadState("offline");
          return;
        }
        setModels(data.models ?? []);
        setSelected(data.selected);
        setDraft(data.selected);
        setLoadState("ready");
      })
      .catch(() => setLoadState("offline"));
  }, []);

  const isDirty =
    draft.model !== selected.model || draft.embedModel !== selected.embedModel;

  async function save() {
    setLoadState("saving");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/ai/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: draft.model || null,
          embedModel: draft.embedModel || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSelected(data.selected);
      setDraft(data.selected);
      setLoadState("saved");
      setTimeout(() => setLoadState("ready"), 2000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Save failed");
      setLoadState("error");
    }
  }

  if (loadState === "loading") {
    return <p className="text-sm text-neutral-500">Checking Ollama…</p>;
  }

  if (loadState === "offline") {
    return (
      <div className="rounded-xl bg-neutral-900 border border-neutral-800 px-4 py-3 text-sm text-neutral-400">
        Ollama is not reachable. Start the Ollama service and reload this page.
        <br />
        <span className="text-neutral-600 text-xs mt-1 block">
          Expected at{" "}
          {process.env.NEXT_PUBLIC_OLLAMA_BASE_URL ?? "http://localhost:11434"}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {models.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No models found. Pull one with:{" "}
          <code className="text-neutral-300 bg-neutral-900 px-1.5 py-0.5 rounded text-xs">
            docker compose exec ollama ollama pull llama3.2
          </code>
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* LLM model */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Text model
              <span className="text-neutral-600 font-normal ml-1">
                (analysis, chat, prompts)
              </span>
            </label>
            <select
              value={draft.model}
              onChange={(e) =>
                setDraft((d) => ({ ...d, model: e.target.value }))
              }
              className="w-full bg-neutral-900 border border-neutral-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              {models.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}{" "}
                  <span className="text-neutral-500">
                    ({formatBytes(m.size)})
                  </span>
                </option>
              ))}
            </select>
          </div>

          {/* Embed model */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Embedding model
              <span className="text-neutral-600 font-normal ml-1">
                (semantic search, chat context)
              </span>
            </label>
            <select
              value={draft.embedModel}
              onChange={(e) =>
                setDraft((d) => ({ ...d, embedModel: e.target.value }))
              }
              className="w-full bg-neutral-900 border border-neutral-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              {models.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} ({formatBytes(m.size)})
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-600 mt-1">
              Changing this model requires re-embedding entries for semantic
              search to work correctly.
            </p>
          </div>
        </div>
      )}

      {/* Available models table */}
      {models.length > 0 && (
        <div>
          <p className="text-xs font-medium text-neutral-500 mb-2 uppercase tracking-widest">
            Pulled models
          </p>
          <div className="rounded-xl border border-neutral-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left px-4 py-2 text-xs text-neutral-500 font-medium">
                    Model
                  </th>
                  <th className="text-right px-4 py-2 text-xs text-neutral-500 font-medium">
                    Size
                  </th>
                </tr>
              </thead>
              <tbody>
                {models.map((m, i) => (
                  <tr
                    key={m.name}
                    className={
                      i < models.length - 1 ? "border-b border-neutral-800" : ""
                    }
                  >
                    <td className="px-4 py-2.5 text-neutral-200 font-mono text-xs">
                      {m.name}
                      {(m.name === selected.model ||
                        m.name === selected.embedModel) && (
                        <span className="ml-2 text-indigo-400 font-sans font-normal">
                          {m.name === selected.model &&
                          m.name === selected.embedModel
                            ? "text + embed"
                            : m.name === selected.model
                              ? "text"
                              : "embed"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-500 text-right">
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
      {models.length > 0 && (
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
            <p className="text-sm text-red-400">{errorMsg}</p>
          )}
        </div>
      )}
    </div>
  );
}
