"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface EntryDraft {
  title: string;
  body: string;
  mood?: string;
  categories?: string[];
}

type Phase = "chatting" | "synthesizing" | "review";

const OPENING_MESSAGE: Message = {
  role: "assistant",
  content: "Welcome. I'm here to help you reflect. How are you feeling right now, and what's been on your mind today?",
};

export default function GuidedSession() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([OPENING_MESSAGE]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [phase, setPhase] = useState<Phase>("chatting");
  const [draft, setDraft] = useState<EntryDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const canWrapUp = userMessageCount >= 2 && !streaming;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    // Add empty assistant bubble to stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/ai/guided", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "chat", messages: newMessages }),
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: accumulated };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function wrapUp() {
    setPhase("synthesizing");

    try {
      const res = await fetch("/api/ai/guided", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "synthesize", messages }),
      });
      if (!res.ok) throw new Error("Synthesis failed");
      const data: EntryDraft = await res.json();
      setDraft(data);
      setPhase("review");
    } catch {
      setPhase("chatting");
    }
  }

  async function saveEntry() {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          body: draft.body,
          mood: draft.mood,
          categories: draft.categories ?? [],
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const { id } = await res.json();
      router.push(`/journal/${id}/edit`);
    } catch {
      setSaving(false);
    }
  }

  // ── Review phase ──────────────────────────────────────────────────────────
  if (phase === "review" && draft) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between px-6 py-4 border-b border-base-content/10 shrink-0">
          <button
            onClick={() => setPhase("chatting")}
            className="text-sm text-base-content/40 hover:text-base-content transition-colors"
          >
            ← Keep talking
          </button>
          <span className="text-sm font-medium text-base-content/60">Entry preview</span>
          <span className="w-24" />
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-8 max-w-2xl mx-auto w-full">
          <p className="text-xs text-base-content/30 uppercase tracking-widest mb-4">
            Aura synthesised your session into a journal entry
          </p>

          <h2 className="text-2xl font-semibold text-base-content mb-3">{draft.title}</h2>

          {(draft.mood || (draft.categories && draft.categories.length > 0)) && (
            <div className="flex gap-2 flex-wrap mb-6">
              {draft.mood && (
                <span className="text-xs px-2.5 py-1 bg-indigo-500/15 text-indigo-400 rounded-full capitalize">
                  {draft.mood}
                </span>
              )}
              {draft.categories?.map((c) => (
                <span key={c} className="text-xs px-2.5 py-1 bg-base-content/10 text-base-content/50 rounded-full">
                  {c}
                </span>
              ))}
            </div>
          )}

          <div
            className="fw-prose max-w-none mb-10"
            dangerouslySetInnerHTML={{ __html: draft.body }}
          />

          <div className="flex gap-3">
            <button
              onClick={saveEntry}
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save as entry"}
            </button>
            <button
              onClick={() => setPhase("chatting")}
              className="px-5 py-2.5 text-sm text-base-content/40 hover:text-base-content rounded-xl border border-base-content/10 hover:border-base-content/30 transition-colors"
            >
              Keep talking
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Synthesizing spinner ──────────────────────────────────────────────────
  if (phase === "synthesizing") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-base-content/40">
        <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p className="text-sm">Synthesising your session…</p>
      </div>
    );
  }

  // ── Chatting phase ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-6 py-4 border-b border-base-content/10 shrink-0">
        <Link
          href="/journal/new"
          className="text-sm text-base-content/40 hover:text-base-content transition-colors"
        >
          ← Back
        </Link>
        <span className="text-sm font-medium text-base-content/60">Guided session</span>
        {canWrapUp ? (
          <button
            onClick={wrapUp}
            className="text-sm px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            Wrap up →
          </button>
        ) : (
          <span className="w-24" />
        )}
      </header>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-2xl mx-auto w-full">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-indigo-600 text-white rounded-br-sm"
                  : "bg-base-200 text-base-content rounded-bl-sm"
              }`}
            >
              {m.content}
              {m.role === "assistant" && streaming && i === messages.length - 1 && (
                <span className="inline-block w-1.5 h-4 bg-base-content/40 rounded-sm ml-0.5 animate-pulse align-middle" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Wrap-up hint */}
      {userMessageCount === 2 && !streaming && (
        <p className="text-center text-xs text-base-content/30 pb-2">
          When you're ready, tap <span className="text-indigo-400">Wrap up</span> to turn this into a journal entry
        </p>
      )}

      {/* Input area */}
      <div className="shrink-0 border-t border-base-content/10 px-4 py-4 max-w-2xl mx-auto w-full">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Share what's on your mind…"
            rows={2}
            disabled={streaming}
            className="flex-1 resize-none bg-base-200 text-base-content text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 placeholder-base-content/30 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || streaming}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors disabled:opacity-30 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
