export type ExpressionType =
  | "joy"
  | "pleasant"
  | "gentle"
  | "neutral"
  | "uncertain"
  | "tired"
  | "down"
  | "distressed";

export type GroupIconType = "sun" | "wave" | "drop" | "bolt" | "dashes";

export interface Emotion {
  value: string;         // stored in entry.mood
  label: string;         // display label
  expression: ExpressionType;
}

export interface MoodGroup {
  id: string;
  label: string;
  iconType: GroupIconType;
  // Tailwind classes for bg tint + text — work in light and dark
  colorClass: string;    // tile / pill background
  textClass: string;     // icon + label foreground
  barClass: string;      // solid bar for analytics charts
  emotions: Emotion[];
}

export const MOOD_GROUPS: MoodGroup[] = [
  {
    id: "bright",
    label: "Bright",
    iconType: "sun",
    colorClass: "bg-amber-500/10",
    textClass: "text-amber-600 dark:text-amber-400",
    barClass: "bg-amber-400",
    emotions: [
      { value: "joyful",    label: "Joyful",    expression: "joy"      },
      { value: "excited",   label: "Excited",   expression: "joy"      },
      { value: "proud",     label: "Proud",     expression: "pleasant" },
      { value: "hopeful",   label: "Hopeful",   expression: "pleasant" },
      { value: "inspired",  label: "Inspired",  expression: "pleasant" },
      { value: "grateful",  label: "Grateful",  expression: "gentle"   },
    ],
  },
  {
    id: "calm",
    label: "Calm",
    iconType: "wave",
    colorClass: "bg-emerald-500/10",
    textClass: "text-emerald-600 dark:text-emerald-400",
    barClass: "bg-emerald-400",
    emotions: [
      { value: "content",    label: "Content",    expression: "gentle"  },
      { value: "peaceful",   label: "Peaceful",   expression: "gentle"  },
      { value: "serene",     label: "Serene",     expression: "gentle"  },
      { value: "nostalgic",  label: "Nostalgic",  expression: "neutral" },
      { value: "reflective", label: "Reflective", expression: "neutral" },
      { value: "relaxed",    label: "Relaxed",    expression: "gentle"  },
    ],
  },
  {
    id: "low",
    label: "Low",
    iconType: "drop",
    colorClass: "bg-sky-500/10",
    textClass: "text-sky-600 dark:text-sky-400",
    barClass: "bg-sky-400",
    emotions: [
      { value: "sad",          label: "Sad",          expression: "down"   },
      { value: "lonely",       label: "Lonely",       expression: "down"   },
      { value: "tired",        label: "Tired",        expression: "tired"  },
      { value: "bored",        label: "Bored",        expression: "tired"  },
      { value: "disappointed", label: "Disappointed", expression: "down"   },
      { value: "empty",        label: "Empty",        expression: "neutral" },
    ],
  },
  {
    id: "tense",
    label: "Tense",
    iconType: "bolt",
    colorClass: "bg-rose-500/10",
    textClass: "text-rose-600 dark:text-rose-400",
    barClass: "bg-rose-400",
    emotions: [
      { value: "anxious",     label: "Anxious",     expression: "uncertain"  },
      { value: "overwhelmed", label: "Overwhelmed", expression: "distressed" },
      { value: "stressed",    label: "Stressed",    expression: "distressed" },
      { value: "frustrated",  label: "Frustrated",  expression: "distressed" },
      { value: "angry",       label: "Angry",       expression: "distressed" },
      { value: "fearful",     label: "Fearful",     expression: "uncertain"  },
    ],
  },
  {
    id: "mixed",
    label: "Mixed",
    iconType: "dashes",
    colorClass: "bg-foreground/5",
    textClass: "text-foreground/60",
    barClass: "bg-neutral-400",
    emotions: [
      { value: "neutral",    label: "Neutral",    expression: "neutral"   },
      { value: "okay",       label: "Okay",       expression: "neutral"   },
      { value: "uncertain",  label: "Uncertain",  expression: "uncertain" },
      { value: "conflicted", label: "Conflicted", expression: "uncertain" },
      { value: "numb",       label: "Numb",       expression: "neutral"   },
      { value: "distracted", label: "Distracted", expression: "tired"     },
    ],
  },
];

// Flat list of all built-in emotions
export const ALL_EMOTIONS: Emotion[] = MOOD_GROUPS.flatMap((g) => g.emotions);

export function getMoodGroup(value: string): MoodGroup | undefined {
  return MOOD_GROUPS.find((g) => g.emotions.some((e) => e.value === value));
}

export function getMoodByValue(value: string): Emotion | undefined {
  return ALL_EMOTIONS.find((e) => e.value === value);
}

export function getMoodLabel(value: string): string {
  return getMoodByValue(value)?.label ?? value;
}

export function getMoodExpression(value: string): ExpressionType {
  return getMoodByValue(value)?.expression ?? "neutral";
}

export function getMoodColor(value: string): string {
  return getMoodGroup(value)?.barClass ?? "bg-neutral-400";
}

export function getMoodTextClass(value: string): string {
  return getMoodGroup(value)?.textClass ?? "text-foreground/60";
}

export function getMoodBgClass(value: string): string {
  return getMoodGroup(value)?.colorClass ?? "bg-foreground/5";
}

// Valence score: Bright=5 (most positive) → Tense=1 (most negative)
const GROUP_SCORES: Record<string, number> = {
  bright: 5,
  calm: 4,
  mixed: 3,
  low: 2,
  tense: 1,
};

export function getMoodScore(value: string): number {
  const group = getMoodGroup(value);
  return group ? (GROUP_SCORES[group.id] ?? 3) : 3;
}
