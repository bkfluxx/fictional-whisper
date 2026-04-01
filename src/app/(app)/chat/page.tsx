"use client";

/**
 * /chat — RAG chat interface with persistent session history.
 *
 * Left sidebar: list of past sessions, "New chat" button, delete.
 * Right panel:  message thread + streaming response.
 */

import { useState, useRef, useEffect, useCallback, FormEvent } from "react";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  entryDraft?: EntryDraft; // only present on assistant messages that contain a draft
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

// ── component ──────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // tracks which draft cards are being saved (keyed by message index)
  const [savingDraft, setSavingDraft] = useState<Record<number, boolean>>({});
  const [savedDraft, setSavedDraft] = useState<Record<number, true>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load session list on mount
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/chat/sessions");
      if (res.ok) setSessions(await res.json());
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Load messages for a session
  const openSession = useCallback(async (id: string) => {
    setActiveSessionId(id);
    setMessages([]);
    setError(null);
    setLoadingMessages(true);
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

  // Start a new (unsaved) chat
  function newChat() {
    setActiveSessionId(null);
    setMessages([]);
    setError(null);
    setInput("");
  }

  // Delete a session
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
        body: JSON.stringify({ message: text, sessionId: activeSessionId }),
      });

      if (!res.ok || !res.body) {
        throw new Error(await res.text().catch(() => "Chat failed"));
      }

      // Capture session id from header (new session created server-side)
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

      // Decode entry draft from header (if AI created one).
      // atob() returns a binary string (bytes as Latin-1); run through
      // TextDecoder to restore proper UTF-8 before JSON.parse.
      let entryDraft: EntryDraft | undefined;
      const draftHeader = res.headers.get("X-Entry-Draft");
      if (draftHeader) {
        try {
          const bytes = Uint8Array.from(atob(draftHeader), (c) =>
            c.charCodeAt(0),
          );
          entryDraft = JSON.parse(new TextDecoder().decode(bytes)) as EntryDraft;
        } catch {
          // ignore malformed header
        }
      }

      // Stream tokens into the last assistant message
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: next[next.length - 1].content + chunk,
          };
          return next;
        });
      }

      // Attach the entry draft to the final assistant message so the UI can show it
      if (entryDraft) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            ...next[next.length - 1],
            entryDraft,
          };
          return next;
        });
      }

      // Refresh session list so updatedAt + count are current
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
      // show generic error inline
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
        } shrink-0 transition-all duration-200 overflow-hidden border-r border-base-200 flex flex-col bg-base-100`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-base-200 shrink-0">
          <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">
            Conversations
          </span>
          <button
            onClick={newChat}
            title="New chat"
            className="text-base-content/60 hover:text-base-content p-1 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto py-2">
          {sessions.length === 0 ? (
            <p className="text-xs text-base-content/30 text-center px-4 mt-6">
              No conversations yet
            </p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => openSession(s.id)}
                className={`group flex items-start gap-2 px-3 py-2.5 cursor-pointer rounded-lg mx-1 transition-colors ${
                  activeSessionId === s.id
                    ? "bg-base-content/10 text-base-content"
                    : "text-base-content/60 hover:bg-base-content/5 hover:text-base-content"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate leading-snug">{s.title}</p>
                  <p className="text-[11px] text-base-content/30 mt-0.5">
                    {relativeDate(s.updatedAt)}
                    {" · "}
                    {Math.ceil(s._count.messages / 2)} turn
                    {Math.ceil(s._count.messages / 2) !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={(e) => deleteSession(s.id, e)}
                  title="Delete"
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-base-content/30 hover:text-red-400 transition-all p-0.5 rounded mt-0.5"
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
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-base-200 shrink-0">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            className="text-base-content/40 hover:text-base-content transition-colors p-1 rounded"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <h1 className="text-base font-semibold text-base-content leading-none">
              {activeSessionId
                ? (sessions.find((s) => s.id === activeSessionId)?.title ?? "Chat")
                : "New chat"}
            </h1>
            <p className="text-xs text-base-content/30 mt-0.5">
              Answers grounded in your journal entries
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6 min-h-0 max-w-2xl w-full mx-auto">
          {loadingMessages ? (
            <div className="flex justify-center py-12">
              <span className="text-base-content/30 text-sm">Loading…</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-base-content/30 text-sm">
                Start by asking something about your journal — a theme, a
                period, or a feeling.
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
                    className="text-xs px-3 py-1.5 bg-base-200 hover:bg-base-content/10 border border-base-content/20 text-base-content/60 rounded-full transition-colors"
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
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-base-200 text-base-content"
                  }`}
                >
                  {msg.content}
                  {streaming &&
                    i === messages.length - 1 &&
                    msg.role === "assistant" && (
                      <span className="inline-block w-1 h-4 bg-base-content/60 animate-pulse ml-0.5 align-middle" />
                    )}
                </div>

                {/* Entry draft card — only on assistant messages with a draft */}
                {msg.role === "assistant" && msg.entryDraft && (
                  <div className="mt-3 rounded-xl border border-indigo-800/60 bg-indigo-950/40 p-4 text-sm max-w-[85%]">
                    <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
                      Journal entry draft
                    </p>
                    <p className="text-base-content font-medium mb-1">
                      {msg.entryDraft.title}
                    </p>
                    <p className="text-base-content/60 text-xs leading-relaxed line-clamp-3 mb-3">
                      {msg.entryDraft.body}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {msg.entryDraft.categories?.map((c) => (
                        <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-base-content/10 text-base-content/60">
                          {c}
                        </span>
                      ))}
                      {msg.entryDraft.mood && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-base-content/10 text-base-content/60">
                          {msg.entryDraft.mood}
                        </span>
                      )}
                      <div className="ml-auto">
                        {savedDraft[i] ? (
                          <span className="text-xs text-emerald-400">
                            Saved to journal
                          </span>
                        ) : (
                          <button
                            onClick={() => saveEntryDraft(msg.entryDraft!, i)}
                            disabled={savingDraft[i]}
                            className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
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
          className="px-4 py-4 border-t border-base-200 shrink-0 max-w-2xl w-full mx-auto"
        >
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your journal…"
              disabled={streaming || loadingMessages}
              className="flex-1 bg-base-100 border border-base-content/20 text-base-content text-sm rounded-xl px-4 py-2.5 placeholder-base-content/30 focus:outline-none focus:border-indigo-500 disabled:opacity-50 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || streaming || loadingMessages}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
