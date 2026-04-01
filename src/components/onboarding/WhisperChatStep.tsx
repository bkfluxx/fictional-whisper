"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface UserProfile {
  userName?: string;
  journalingIntention?: string[];
  writingStyle?: string;
}

interface Props {
  ollamaUrl: string;
  chatModel: string;
  onContinue: (profile: UserProfile) => void;
  onBack: () => void;
}

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hi! I'm Whisper, your personal journaling assistant. I'm here to help you get started. What's your name?",
};

export default function WhisperChatStep({
  ollamaUrl,
  chatModel,
  onContinue,
  onBack,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnCount, setTurnCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    setError(null);

    const userMsg: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setStreaming(true);

    // Add empty assistant placeholder
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/onboarding/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          ollamaUrl,
          model: chatModel,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const line = chunk.replace(/^data:\s*/, "").trim();
          if (!line) continue;
          try {
            const obj = JSON.parse(line) as {
              token?: string;
              done?: boolean;
              error?: string;
            };
            if (obj.token) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: updated[updated.length - 1].content + obj.token,
                };
                return updated;
              });
            }
            if (obj.error) throw new Error(obj.error);
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }

      setTurnCount((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      // Remove the empty assistant placeholder on error
      setMessages((prev) =>
        prev[prev.length - 1].content === "" ? prev.slice(0, -1) : prev,
      );
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }

  async function finish() {
    setExtracting(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          ollamaUrl,
          model: chatModel,
        }),
      });

      if (!res.ok) throw new Error(`Extraction failed (${res.status})`);

      const profile = (await res.json()) as UserProfile;
      onContinue(profile);
    } catch {
      // Fall back to empty profile rather than blocking the user
      onContinue({});
    } finally {
      setExtracting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const canFinish = turnCount >= 3 && !streaming;

  return (
    <div className="max-w-lg mx-auto px-6 py-8 flex flex-col" style={{ minHeight: "calc(100vh - 4rem)" }}>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-sm">
            ✦
          </div>
          <span className="text-base-content font-medium">Whisper</span>
        </div>
        <p className="text-xs text-base-content/40 ml-9">
          Have a quick conversation to personalise your experience
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto pb-4 min-h-[300px] max-h-[50vh]">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-br-sm"
                  : "bg-base-content/10 text-base-content rounded-bl-sm"
              }`}
            >
              {msg.content || (
                <span className="inline-flex gap-1 text-base-content/40">
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse delay-75">●</span>
                  <span className="animate-pulse delay-150">●</span>
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="text-xs text-red-400 mb-2">{error}</p>
      )}

      {/* Input */}
      <div className="mt-4 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={streaming || extracting}
          placeholder="Type a message…"
          className="flex-1 bg-base-100 border border-base-content/20 text-base-content text-sm rounded-xl px-4 py-2.5 placeholder-base-content/30 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          autoFocus
        />
        <button
          onClick={send}
          disabled={!input.trim() || streaming || extracting}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-colors text-sm font-medium"
        >
          Send
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={extracting}
          className="text-sm text-base-content/40 hover:text-base-content/80 transition-colors disabled:opacity-40"
        >
          ← Back
        </button>

        <button
          onClick={finish}
          disabled={!canFinish || extracting}
          className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-colors ${
            canFinish && !extracting
              ? "bg-indigo-600 hover:bg-indigo-500 text-white"
              : "text-base-content/40 hover:text-base-content/60"
          }`}
        >
          {extracting
            ? "Personalising…"
            : canFinish
              ? "I'm ready →"
              : "Keep chatting to continue"}
        </button>
      </div>
    </div>
  );
}
