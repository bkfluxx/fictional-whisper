"use client";

/**
 * AiModelsSettings — lets the user configure the Ollama base URL and select
 * which model to use for text generation and embeddings.
 *
 * Loaded by the Settings page.
 */

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrainCircuit, Wrench, Eye } from "lucide-react";

interface ModelInfo {
  name: string;
  size: number;
  modifiedAt: string;
}

interface SelectedConfig {
  baseUrl: string;
  model: string;
  embedModel: string;
  whisperBaseUrl: string;
}

type LoadState = "loading" | "offline" | "ready" | "saving" | "saved" | "error";

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${bytes} B`;
}

// ── Capability badge ────────────────────────────────────────────────────────

const CAP_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  thinking: {
    label: "Thinking",
    icon: <BrainCircuit className="w-3 h-3" />,
    color: "bg-primary/10 text-primary border-primary/20",
  },
  tools: {
    label: "Tools",
    icon: <Wrench className="w-3 h-3" />,
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  vision: {
    label: "Vision",
    icon: <Eye className="w-3 h-3" />,
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
};

function CapabilityBadges({ caps, loading }: { caps: string[]; loading: boolean }) {
  const notable = caps.filter((c) => CAP_META[c]);
  if (loading) {
    return (
      <div className="flex gap-1.5 mt-2">
        <span className="h-5 w-16 rounded-full bg-foreground/10 animate-pulse" />
      </div>
    );
  }
  if (notable.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {notable.map((c) => {
        const m = CAP_META[c];
        return (
          <span
            key={c}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${m.color}`}
          >
            {m.icon}
            {m.label}
          </span>
        );
      })}
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

export default function AiModelsSettings() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selected, setSelected] = useState<SelectedConfig>({
    baseUrl: "",
    model: "",
    embedModel: "",
    whisperBaseUrl: "",
  });
  const [draft, setDraft] = useState<SelectedConfig>({
    baseUrl: "",
    model: "",
    embedModel: "",
    whisperBaseUrl: "",
  });
  const [savedCaps, setSavedCaps] = useState<string[]>([]);
  const [draftCaps, setDraftCaps] = useState<string[]>([]);
  const [loadingCaps, setLoadingCaps] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [testingUrl, setTestingUrl] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);

  useEffect(() => {
    fetch("/api/ai/models")
      .then((r) => r.json())
      .then((data) => {
        const modelList: ModelInfo[] = data.models ?? [];
        const savedModel: string = data.selected?.model ?? "";
        const caps: string[] = data.selected?.capabilities ?? [];

        const resolveModel = (saved: string) => {
          if (!saved) return "";
          if (modelList.some((m) => m.name === saved)) return saved;
          const match = modelList.find(
            (m) => m.name.startsWith(saved + ":") || saved.startsWith(m.name + ":"),
          );
          return match ? match.name : saved;
        };

        const cfg: SelectedConfig = {
          baseUrl: data.selected?.baseUrl ?? "",
          model: resolveModel(savedModel),
          embedModel: data.selected?.embedModel ?? "",
          whisperBaseUrl: data.selected?.whisperBaseUrl ?? "",
        };
        setSelected(cfg);
        setDraft(cfg);
        setSavedCaps(caps);
        setDraftCaps(caps);
        if (!data.available) {
          setLoadState("offline");
          return;
        }
        setModels(modelList);
        setLoadState("ready");
      })
      .catch(() => setLoadState("offline"));
  }, []);

  const isDirty =
    draft.baseUrl !== selected.baseUrl ||
    draft.model !== selected.model ||
    draft.whisperBaseUrl !== selected.whisperBaseUrl;

  async function fetchCapsForModel(model: string, baseUrl: string) {
    if (!model) { setDraftCaps([]); return; }
    setLoadingCaps(true);
    try {
      const params = new URLSearchParams({ capabilities: model, url: baseUrl });
      const res = await fetch(`/api/ai/models?${params}`);
      const data = await res.json();
      setDraftCaps(data.capabilities ?? []);
    } catch {
      setDraftCaps([]);
    } finally {
      setLoadingCaps(false);
    }
  }

  function handleModelChange(model: string) {
    if (!model) return;
    setDraft((d) => ({ ...d, model }));
    fetchCapsForModel(model, draft.baseUrl);
  }

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
        const modelList: ModelInfo[] = data.models ?? [];
        setModels(modelList);
        setDraft((d) => {
          const match = modelList.find(
            (m) => m.name.startsWith(d.model + ":") || d.model.startsWith(m.name + ":"),
          );
          return match && d.model !== match.name ? { ...d, model: match.name } : d;
        });
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
          whisperBaseUrl: draft.whisperBaseUrl || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const cfg: SelectedConfig = {
        baseUrl: data.selected?.baseUrl ?? "",
        model: data.selected?.model ?? "",
        embedModel: data.selected?.embedModel ?? "",
        whisperBaseUrl: data.selected?.whisperBaseUrl ?? "",
      };
      const caps: string[] = data.selected?.capabilities ?? [];
      setSelected(cfg);
      setDraft(cfg);
      setSavedCaps(caps);
      setDraftCaps(caps);
      setLoadState("saved");
      setTimeout(() => setLoadState(models.length > 0 ? "ready" : "offline"), 2000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Save failed");
      setLoadState("error");
    }
  }

  if (loadState === "loading") {
    return <p className="text-sm text-foreground/50">Checking Ollama…</p>;
  }

  return (
    <div className="space-y-6">
      {/* URL field */}
      <div>
        <label className="block text-xs font-medium text-foreground/60 mb-1.5">
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
            className="flex-1 h-9 bg-background border border-border text-foreground text-sm rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-foreground/30"
          />
          <button
            onClick={testUrl}
            disabled={testingUrl || !draft.baseUrl.trim()}
            className="h-9 px-4 bg-foreground/10 hover:bg-foreground/20 disabled:opacity-40 text-foreground text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
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

      {/* Whisper URL */}
      <div>
        <label className="block text-xs font-medium text-foreground/60 mb-1.5">
          Whisper base URL
          <span className="text-foreground/40 font-normal ml-1">(voice transcription)</span>
        </label>
        <input
          type="url"
          value={draft.whisperBaseUrl}
          onChange={(e) => setDraft((d) => ({ ...d, whisperBaseUrl: e.target.value }))}
          placeholder="http://localhost:8080"
          className="w-full h-9 bg-background border border-border text-foreground text-sm rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-foreground/30"
        />
        <p className="text-xs text-foreground/40 mt-1">
          URL of a local Whisper-compatible server (e.g.{" "}
          <span className="font-mono">faster-whisper-server</span>,{" "}
          <span className="font-mono">whisper.cpp</span>). Leave blank to disable voice input.
        </p>
      </div>

      {/* Model selectors */}
      {models.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* LLM model */}
          <div>
            <label className="block text-xs font-medium text-foreground/60 mb-1.5">
              Text model
              <span className="text-foreground/40 font-normal ml-1">(analysis, chat, prompts)</span>
            </label>
            <Select value={draft.model} onValueChange={(v) => v && handleModelChange(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a model…" />
              </SelectTrigger>
              <SelectContent>
                {models
                  .filter(
                    (m) =>
                      !m.name.startsWith("nomic-embed") &&
                      !m.name.startsWith("qwen3-embedding") &&
                      !m.name.includes("embed"),
                  )
                  .map((m) => (
                    <SelectItem key={m.name} value={m.name}>
                      {m.name} ({formatBytes(m.size)})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {/* Capability badges for the draft model */}
            <CapabilityBadges
              caps={draftCaps}
              loading={loadingCaps}
            />
            {/* Unsaved indicator when caps differ from saved */}
            {!loadingCaps && isDirty && draft.model !== selected.model && (
              <p className="text-[11px] text-foreground/30 mt-1">
                Capabilities shown for selected model. Save to apply.
              </p>
            )}
          </div>

          {/* Embed model — fixed */}
          <div>
            <label className="block text-xs font-medium text-foreground/60 mb-1.5">
              Embedding model
              <span className="text-foreground/40 font-normal ml-1">(semantic search, chat context)</span>
            </label>
            <div className="w-full bg-background border border-foreground/20 text-sm rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="font-mono text-foreground/70">nomic-embed-text</span>
              <span className="text-xs text-foreground/30">fixed</span>
            </div>
            <p className="text-xs text-foreground/40 mt-1">
              Fixed to <span className="font-mono">nomic-embed-text</span> (768-dim) to match the search index.
            </p>
          </div>
        </div>
      )}

      {models.length === 0 && loadState === "ready" && (
        <p className="text-sm text-foreground/50">
          No models found. Pull one with:{" "}
          <code className="text-foreground/80 bg-card px-1.5 py-0.5 rounded text-xs">
            ollama pull llama3.2
          </code>
        </p>
      )}

      {/* Save row */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={!isDirty || loadState === "saving"}
          className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loadState === "saving" ? "Saving…" : loadState === "saved" ? "Saved" : "Save"}
        </button>
        {loadState === "error" && errorMsg && (
          <p className="text-sm text-destructive">{errorMsg}</p>
        )}
      </div>
    </div>
  );
}
