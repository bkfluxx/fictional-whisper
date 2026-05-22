"use client";

/**
 * /chat — RAG chat interface with persistent session history.
 *
 * Left sidebar: list of past sessions, "New chat" button, delete.
 * Right panel:  message thread + streaming response.
 */

import { useState, useRef, useEffect, useCallback, FormEvent } from "react";
import { ChevronDown, BrainCircuit } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  thinkingContent?: string;   // accumulated thinking text
  thinkingDuration?: number;  // seconds; set when thinking phase ends
  entryDraft?: EntryDraft;
}

interface EntryDraft {
  title: string;
  body: string;
  mood?: string;
  categories?: string[];
}

interface Session {
  id: string;
  title: string;
  updatedAt: string;
  _count: { messages: number };
}

// ── helpers ────────────────────────────────────────────────────────────────

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── ThinkingBlock ──────────────────────────────────────────────────────────

function ThinkingBlock({
  content,
  duration,
  streaming,
}: {
  content: string;
  duration?: number;   // undefined = still thinking
  streaming: boolean;  // true = this is the active streaming message
}) {
  const isThinkingActive = streaming && duration === undefined;
  // Auto-open while thinking, auto-close once done
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!isThinkingActive) setOpen(false);
  }, [isThinkingActive]);

  const label = duration !== undefined
    ? `Thought for ${duration}s`
    : "Thinking\u2026";

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-foreground/40 hover:text-foreground/60 transition-colors select-none"
      >
        {/* status dot */}
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            isThinkingActive ? "bg-primary animate-pulse" : "bg-foreground/25"
          }`}
        />
        <span>{label}</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-150 ${open ? "" : "-rotate-90"}`}
        />
      </button>

      {open && content && (
        <div className="mt-1.5 ml-3 pl-3 border-l border-foreground/10 text-xs text-foreground/35 leading-relaxed whitespace-pre-wrap max-h-52 overflow-y-auto">
          {content}
        </div>
      )}
    </div>
  );
}

// ── component ──────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [thinkMode, setThinkMode] = useState(false);
  const [modelSupportsThinking, setModelSupportsThinking] = useState(false);
  const [savingDraft, setSavingDraft] = useState<Record<number, boolean>>({});
  const [savedDraft, setSavedDraft] = useState<Record<number, true>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Open sidebar by default on desktop, keep closed on mobile
  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 768);
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/chat/sessions");
      if (res.ok) setSessions(await res.json());
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Load model capabilities to gate the thinking toggle
  useEffect(() => {
    fetch("/api/ai/models")
      .then((r) => r.json())
      .then((data) => {
        const caps: string[] = data.selected?.capabilities ?? [];
        setModelSupportsThinking(caps.includes("thinking"));
      })
      .catch(() => {});
  }, []);

  const openSession = useCallback(async (id: string) => {
    setActiveSessionId(id);
    setMessages([]);
    setError(null);
    setLoadingMessages(true);
    // On mobile, close sidebar so the chat area is visible
    if (window.innerWidth < 768) setSidebarOpen(false);
    try {
      const res = await fetch(`/api/ai/chat/sessions/${id}/messages`);
      if (res.ok) {
        const data: Message[] = await res.json();
        setMessages(data);
      }
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  function newChat() {
    setActiveSessionId(null);
    setMessages([]);
    setError(null);
    setInput("");
  }

  async function deleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/ai/chat/sessions/${id}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) newChat();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId: activeSessionId, think: thinkMode }),
      });

      if (!res.ok || !res.body) {
        throw new Error(await res.text().catch(() => "Chat failed"));
      }

      const returnedId = res.headers.get("X-Session-Id");
      if (returnedId && returnedId !== activeSessionId) {
        setActiveSessionId(returnedId);
        setSessions((prev) => [
          {
            id: returnedId,
            title: text.slice(0, 80),
            updatedAt: new Date().toISOString(),
            _count: { messages: 1 },
          },
          ...prev.filter((s) => s.id !== returnedId),
        ]);
      }

      let entryDraft: EntryDraft | undefined;
      const draftHeader = res.headers.get("X-Entry-Draft");
      if (draftHeader) {
        try {
          const bytes = Uint8Array.from(atob(draftHeader), (c) => c.charCodeAt(0));
          entryDraft = JSON.parse(new TextDecoder().decode(bytes)) as EntryDraft;
        } catch {
          // ignore malformed header
        }
      }

      // ── Parse NDJSON stream ─────────────────────────────────────────────
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = "";

      while (true) {
        let done: boolean;
        let value: Uint8Array | undefined;
        try {
          ({ done, value } = await reader.read());
        } catch {
          break;
        }
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let event: { k: string; v: unknown };
          try {
            event = JSON.parse(line) as { k: string; v: unknown };
          } catch {
            continue;
          }

          if (event.k === "t") {
            // thinking token
            setMessages((prev) => {
              const next = [...prev];
              const last = { ...next[next.length - 1] };
              last.thinkingContent = (last.thinkingContent ?? "") + String(event.v);
              next[next.length - 1] = last;
              return next;
            });
          } else if (event.k === "td") {
            // thinking done — record duration
            setMessages((prev) => {
              const next = [...prev];
              const last = { ...next[next.length - 1] };
              last.thinkingDuration = Number(event.v);
              next[next.length - 1] = last;
              return next;
            });
          } else if (event.k === "c") {
            // content token
            setMessages((prev) => {
              const next = [...prev];
              const last = { ...next[next.length - 1] };
              last.content = last.content + String(event.v);
              next[next.length - 1] = last;
              return next;
            });
          } else if (event.k === "e") {
            setError(String(event.v));
            setMessages((prev) => prev.slice(0, -1));
          }
        }
      }

      if (entryDraft) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], entryDraft };
          return next;
        });
      }

      fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  async function saveEntryDraft(draft: EntryDraft, msgIndex: number) {
    setSavingDraft((s) => ({ ...s, [msgIndex]: true }));
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          body: draft.body,
          mood: draft.mood,
          categories: draft.categories ?? [],
          entryDate: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSavedDraft((s) => ({ ...s, [msgIndex]: true }));
    } catch {
      setSavingDraft((s) => { const n = { ...s }; delete n[msgIndex]; return n; });
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } shrink-0 transition-all duration-200 overflow-hidden border-r border-border flex flex-col bg-background`}
      >
        <div className="flex items-center justify-between px-3 py-4 border-b border-border shrink-0">
          <span className="text-xs font-semibold text-foreground/40 uppercase tracking-wider">
            Conversations
          </span>
          <button
            onClick={newChat}
            title="New chat"
            className="text-foreground/60 hover:text-foreground p-1 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {sessions.length === 0 ? (
            <div className="text-center px-4 mt-8">
              <p className="text-xs font-medium text-foreground/30">No conversations yet</p>
              <p className="text-[11px] text-foreground/20 mt-1 leading-relaxed">Ask something about your journal to start a chat.</p>
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => openSession(s.id)}
                className={`group flex items-start gap-2 px-3 py-2.5 cursor-pointer rounded-lg mx-1 transition-colors ${
                  activeSessionId === s.id
                    ? "bg-foreground/10 text-foreground"
                    : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate leading-snug">{s.title}</p>
                  <p className="text-[11px] text-foreground/30 mt-0.5">
                    {relativeDate(s.updatedAt)}
                    {" · "}
                    {Math.ceil(s._count.messages / 2)} turn
                    {Math.ceil(s._count.messages / 2) !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={(e) => deleteSession(s.id, e)}
                  title="Delete"
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-foreground/30 hover:text-red-400 transition-all p-0.5 rounded mt-0.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Main chat area ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border shrink-0">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            className="text-foreground/40 hover:text-foreground transition-colors p-1 rounded"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <h1 className="text-base font-semibold text-foreground leading-none">
              {activeSessionId
                ? (sessions.find((s) => s.id === activeSessionId)?.title ?? "Chat")
                : "New chat"}
            </h1>
            <p className="text-xs text-foreground/30 mt-0.5">Answers grounded in your journal entries</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6 min-h-0 max-w-2xl w-full mx-auto">
          {loadingMessages ? (
            <div className="flex justify-center py-12">
              <span className="text-foreground/30 text-sm">Loading…</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-foreground/30 text-sm">
                Start by asking something about your journal — a theme, a period, or a feeling.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {[
                  "What have I been grateful for lately?",
                  "How has my mood been this month?",
                  "What goals am I working on?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="text-xs px-3 py-1.5 bg-card hover:bg-foreground/10 border border-foreground/20 text-foreground/60 rounded-full transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={msg.id ?? i}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                {/* Thinking block — assistant only */}
                {msg.role === "assistant" && msg.thinkingContent !== undefined && (
                  <ThinkingBlock
                    content={msg.thinkingContent}
                    duration={msg.thinkingDuration}
                    streaming={streaming && i === messages.length - 1}
                  />
                )}

                {/* Message bubble */}
                {(msg.content || (streaming && i === messages.length - 1 && !msg.thinkingContent)) && (
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-white"
                        : "bg-card text-foreground"
                    }`}
                  >
                    {msg.content}
                    {streaming &&
                      i === messages.length - 1 &&
                      msg.role === "assistant" &&
                      msg.thinkingDuration !== undefined && (
                        <span className="inline-block w-1 h-4 bg-foreground/60 animate-pulse ml-0.5 align-middle" />
                      )}
                  </div>
                )}

                {/* Entry draft card */}
                {msg.role === "assistant" && msg.entryDraft && (
                  <div className="mt-3 rounded-xl border border-primary/20 bg-primary/[0.06] p-4 text-sm max-w-[85%]">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                      Journal entry draft
                    </p>
                    <p className="text-foreground font-medium mb-1">{msg.entryDraft.title}</p>
                    <p className="text-foreground/60 text-xs leading-relaxed line-clamp-3 mb-3">
                      {msg.entryDraft.body}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {msg.entryDraft.categories?.map((c) => (
                        <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-foreground/10 text-foreground/60">
                          {c}
                        </span>
                      ))}
                      {msg.entryDraft.mood && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-foreground/10 text-foreground/60">
                          {msg.entryDraft.mood}
                        </span>
                      )}
                      <div className="ml-auto">
                        {savedDraft[i] ? (
                          <span className="text-xs text-emerald-400">Saved to journal</span>
                        ) : (
                          <button
                            onClick={() => saveEntryDraft(msg.entryDraft!, i)}
                            disabled={savingDraft[i]}
                            className="text-xs px-3 py-1.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg transition-colors"
                          >
                            {savingDraft[i] ? "Saving…" : "Save as journal entry"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="px-4 py-4 border-t border-border shrink-0 max-w-2xl w-full mx-auto"
        >
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your journal…"
              disabled={streaming || loadingMessages}
              className="flex-1 bg-background border border-foreground/20 text-foreground text-sm rounded-xl px-4 py-2.5 placeholder-foreground/30 focus:outline-none focus:border-primary disabled:opacity-50 transition-colors"
            />
            {modelSupportsThinking && (
              <Toggle
                pressed={thinkMode}
                onPressedChange={setThinkMode}
                title={thinkMode ? "Deep thinking on — click to disable" : "Deep thinking off — click to enable"}
              >
                <BrainCircuit className="w-3.5 h-3.5" />
                Thinking
              </Toggle>
            )}
            <button
              type="submit"
              disabled={!input.trim() || streaming || loadingMessages}
              className="px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
