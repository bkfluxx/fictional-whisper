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
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
    name: "Journal",
    description: "Write entries, set your mood, and categorise your thoughts. Every word is encrypted on your device.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    name: "Timeline",
    description: "Browse your entries chronologically. See the full arc of your journaling journey and revisit past moments with ease.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    name: "Chat",
    description: "Ask Aura anything about your journal. Semantic search finds entries by meaning, not just keywords.",
    aiOnly: true,
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    name: "Analytics",
    description: "Track your streak, mood trends, and writing habits over time with visual charts and a heatmap.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    name: "Settings",
    description: "Change your password, configure AI models, manage templates, and import or export your data.",
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
        <div className="flex justify-center mb-4 text-foreground/60">
          {introMode ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
            </svg>
          )}
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">{heading}</h2>
        <p className="text-foreground/60 text-sm">{subtitle}</p>
      </div>

      <div className="space-y-3">
        {FEATURES.filter((f) => !f.aiOnly || aiEnabled).map((feature) => (
          <div
            key={feature.name}
            className="flex items-start gap-4 bg-card rounded-xl p-4"
          >
            <div className="shrink-0 text-foreground/50">{feature.icon}</div>
            <div>
              <div className="text-sm font-medium text-foreground flex items-center gap-2">
                {feature.name}
                {feature.aiOnly && (
                  <span className="text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                    AI
                  </span>
                )}
              </div>
              <div className="text-xs text-foreground/60 mt-0.5 leading-relaxed">
                {feature.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!aiEnabled && (
        <p className="text-xs text-foreground/40 mt-4 text-center">
          You can enable AI features anytime in Settings → AI settings.
        </p>
      )}

      <div className={`mt-8 flex items-center ${onBack ? "justify-between" : "justify-end"}`}>
        {onBack && (
          <button
            onClick={onBack}
            className="text-sm text-foreground/40 hover:text-foreground/80 transition-colors"
          >
            ← Back
          </button>
        )}
        <button
          onClick={onContinue}
          className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors"
        >
          {introMode ? "Get started →" : "Start journaling →"}
        </button>
      </div>
    </div>
  );
}
