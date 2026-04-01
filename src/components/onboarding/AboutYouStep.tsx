"use client";

import { useState } from "react";

const INTENTIONS = [
  { id: "self-reflection", label: "Self-reflection", emoji: "🪞" },
  { id: "stress-relief", label: "Stress relief", emoji: "🌿" },
  { id: "creative-writing", label: "Creative writing", emoji: "✍️" },
  { id: "gratitude", label: "Gratitude", emoji: "🙏" },
  { id: "habit-tracking", label: "Habit tracking", emoji: "📈" },
];

interface UserProfile {
  userName?: string;
  journalingIntention?: string[];
  writingStyle?: string;
}

interface Props {
  onContinue: (profile: UserProfile) => void;
  onBack: () => void;
}

export default function AboutYouStep({ onContinue, onBack }: Props) {
  const [name, setName] = useState("");
  const [intentions, setIntentions] = useState<string[]>([]);
  const [style, setStyle] = useState<"prompts" | "blank" | "">("");

  function toggleIntention(id: string) {
    setIntentions((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  const canContinue = name.trim().length > 0 && intentions.length > 0 && style !== "";

  return (
    <div className="max-w-lg mx-auto px-6 py-12 space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-base-content mb-2">Tell us about yourself</h2>
        <p className="text-base-content/60 text-sm">
          A couple of quick questions so we can tailor your experience.
        </p>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-base-content/80 block">
          What should we call you?
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name or nickname"
          autoFocus
          className="w-full bg-base-100 border border-base-content/20 text-base-content text-sm rounded-xl px-4 py-2.5 placeholder-base-content/30 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Intentions */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-base-content/80 block">
          What brings you to journaling? <span className="text-base-content/40">(pick all that apply)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {INTENTIONS.map((item) => {
            const active = intentions.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleIntention(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  active
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-base-200 border-base-content/20 text-base-content/80 hover:border-base-content/40"
                }`}
              >
                <span>{item.emoji}</span>
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Writing style */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-base-content/80 block">
          How do you prefer to write?
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setStyle("prompts")}
            className={`p-4 rounded-xl border text-left transition-colors ${
              style === "prompts"
                ? "bg-indigo-600/15 border-indigo-500 text-base-content"
                : "bg-base-200 border-base-content/20 hover:border-base-content/40"
            }`}
          >
            <div className="text-2xl mb-2">💬</div>
            <div className="text-sm font-medium text-base-content">Give me prompts</div>
            <div className="text-xs text-base-content/60 mt-1">
              Guided questions to get me thinking
            </div>
          </button>
          <button
            onClick={() => setStyle("blank")}
            className={`p-4 rounded-xl border text-left transition-colors ${
              style === "blank"
                ? "bg-indigo-600/15 border-indigo-500 text-base-content"
                : "bg-base-200 border-base-content/20 hover:border-base-content/40"
            }`}
          >
            <div className="text-2xl mb-2">📄</div>
            <div className="text-sm font-medium text-base-content">Blank page</div>
            <div className="text-xs text-base-content/60 mt-1">
              I&apos;ll write freely without structure
            </div>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="text-sm text-base-content/40 hover:text-base-content/80 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={() =>
            onContinue({
              userName: name.trim(),
              journalingIntention: intentions,
              writingStyle: style || undefined,
            })
          }
          disabled={!canContinue}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium rounded-xl transition-colors"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
