"use client";

/**
 * /chat — RAG chat interface.
 *
 * Sends a message to POST /api/ai/chat which retrieves the most semantically
 * similar journal entries and streams a response from Ollama.
 */

import { useState, useRef, useEffect, FormEvent } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    // Append empty assistant message that we'll stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "Unknown error");
        throw new Error(errText);
      }

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
      setMessages((prev) => prev.slice(0, -1)); // remove empty assistant message
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto px-4">
      {/* Header */}
      <div className="py-6 border-b border-neutral-800 shrink-0">
        <h1 className="text-xl font-semibold text-white">Chat</h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          Ask questions about your journal. Answers are grounded in your entries.
        </p>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-neutral-600 text-sm">
              Start by asking something about your journal — a theme, a period,
              or a feeling.
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
                  className="text-xs px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-neutral-900 text-neutral-200"
              }`}
            >
              {msg.content}
              {streaming && i === messages.length - 1 && msg.role === "assistant" && (
                <span className="inline-block w-1 h-4 bg-neutral-400 animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          </div>
        ))}

        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="py-4 border-t border-neutral-800 shrink-0"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your journal…"
            disabled={streaming}
            className="flex-1 bg-neutral-900 border border-neutral-700 text-white text-sm rounded-xl px-4 py-2.5 placeholder-neutral-600 focus:outline-none focus:border-indigo-500 disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
