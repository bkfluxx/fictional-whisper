"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface CustomTemplate {
  title: string;
  emoji: string;
  body: string;
}

interface UserProfile {
  userName?: string;
  journalingIntention?: string[];
  writingStyle?: string;
  customTemplate?: CustomTemplate;
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
  const [progress, setProgress] = useState<{ label: string; pct: number } | null>(null);
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
      let receivedContent = false;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        let done: boolean;
        let value: Uint8Array | undefined;
        try {
          ({ done, value } = await reader.read());
        } catch {
          // Safari throws instead of returning done:true when the stream ends
          break;
        }
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
              receivedContent = true;
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

      // Only count as a completed turn if we received content
      if (receivedContent) setTurnCount((n) => n + 1);
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
    setProgress({ label: "Analysing your conversation…", pct: 0 });

    try {
      // Step 1: extract profile
      const res1 = await fetch("/api/onboarding/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, ollamaUrl, model: chatModel, step: "profile" }),
      });
      if (!res1.ok) throw new Error(`Extraction failed (${res1.status})`);

      const { needsTemplate, ...profile } = (await res1.json()) as UserProfile & {
        needsTemplate?: boolean;
      };

      if (needsTemplate) {
        // Step 2: generate custom template
        setProgress({ label: "Creating your custom template…", pct: 50 });

        const res2 = await fetch("/api/onboarding/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, ollamaUrl, model: chatModel, step: "template" }),
        });

        if (res2.ok) {
          const { customTemplate } = (await res2.json()) as { customTemplate?: UserProfile["customTemplate"] };
          if (customTemplate) profile.customTemplate = customTemplate;
        }
      }

      setProgress({ label: "All done!", pct: 100 });
      // Brief pause so the user sees 100% before moving on
      await new Promise((r) => setTimeout(r, 400));
      onContinue(profile);
    } catch {
      // Fall back to empty profile rather than blocking the user
      onContinue({});
    } finally {
      setExtracting(false);
      setProgress(null);
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

      {progress && (
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-base-content/50">
            <span>{progress.label}</span>
            <span>{progress.pct}%</span>
          </div>
          <div className="h-1.5 w-full bg-base-content/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress.pct === 0 ? 8 : progress.pct}%` }}
            />
          </div>
        </div>
      )}

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
            ? "Working…"
            : canFinish
              ? "I'm ready →"
              : "Keep chatting to continue"}
        </button>
      </div>
    </div>
  );
}
