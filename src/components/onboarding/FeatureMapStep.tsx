"use client";

interface Props {
  userName?: string;
  aiEnabled: boolean;
  introMode?: boolean;
  onContinue: () => void;
  onBack?: () => void;
}

const FEATURES = [
  {
    icon: "📖",
    name: "Journal",
    description:
      "Write entries, set your mood, and categorise your thoughts. Every word is encrypted on your device.",
  },
  {
    icon: "📅",
    name: "Timeline",
    description:
      "Browse your entries chronologically. See the full arc of your journaling journey and revisit past moments with ease.",
  },
  {
    icon: "💬",
    name: "Chat",
    description:
      "Ask Whisper anything about your journal. Semantic search finds entries by meaning, not just keywords.",
    aiOnly: true,
  },
  {
    icon: "📊",
    name: "Analytics",
    description:
      "Track your streak, mood trends, and writing habits over time with visual charts and a heatmap.",
  },
  {
    icon: "⚙️",
    name: "Settings",
    description:
      "Change your password, configure AI models, manage templates, and import or export your data.",
  },
];

export default function FeatureMapStep({
  userName,
  aiEnabled,
  introMode = false,
  onContinue,
  onBack,
}: Props) {
  const heading = introMode
    ? "Welcome to Aura"
    : userName
      ? `You're all set, ${userName}!`
      : "You're all set!";

  const subtitle = introMode
    ? "Here's a quick look at what's inside."
    : "Here's a quick look at what's waiting for you.";

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">{introMode ? "📖" : "🎉"}</div>
        <h2 className="text-2xl font-semibold text-base-content mb-2">{heading}</h2>
        <p className="text-base-content/60 text-sm">{subtitle}</p>
      </div>

      <div className="space-y-3">
        {FEATURES.filter((f) => !f.aiOnly || aiEnabled).map((feature) => (
          <div
            key={feature.name}
            className="flex items-start gap-4 bg-base-200 rounded-xl p-4"
          >
            <div className="text-2xl shrink-0">{feature.icon}</div>
            <div>
              <div className="text-sm font-medium text-base-content flex items-center gap-2">
                {feature.name}
                {feature.aiOnly && (
                  <span className="text-xs bg-indigo-900 text-indigo-300 px-1.5 py-0.5 rounded-full">
                    AI
                  </span>
                )}
              </div>
              <div className="text-xs text-base-content/60 mt-0.5 leading-relaxed">
                {feature.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!aiEnabled && (
        <p className="text-xs text-base-content/40 mt-4 text-center">
          You can enable AI features anytime in Settings → AI settings.
        </p>
      )}

      <div className={`mt-8 flex items-center ${onBack ? "justify-between" : "justify-end"}`}>
        {onBack && (
          <button
            onClick={onBack}
            className="text-sm text-base-content/40 hover:text-base-content/80 transition-colors"
          >
            ← Back
          </button>
        )}
        <button
          onClick={onContinue}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
        >
          {introMode ? "Get started →" : "Start journaling →"}
        </button>
      </div>
    </div>
  );
}
