export type JournalTypeId =
  | "brain-dump"
  | "creativity"
  | "productivity"
  | "bullet"
  | "goals"
  | "reading"
  | "mindset"
  | "inner-child"
  | "gratitude"
  | "mood"
  | "sleep"
  | "habits"
  | "fitness"
  | "spiritual";

export interface JournalType {
  id: JournalTypeId;
  name: string;
  category: string;
  description: string;
  emoji: string;
}

export const JOURNAL_TYPES: JournalType[] = [
  // General
  {
    id: "brain-dump",
    name: "Brain Dump",
    category: "General",
    description: "Free-write without structure or judgment",
    emoji: "🧠",
  },
  {
    id: "creativity",
    name: "Creativity",
    category: "General",
    description: "Capture ideas, sketches, and creative sparks",
    emoji: "🎨",
  },
  {
    id: "productivity",
    name: "Productivity",
    category: "General",
    description: "Plan your day, track focus, and reflect on output",
    emoji: "⚡",
  },
  {
    id: "bullet",
    name: "Bullet",
    category: "General",
    description: "A flexible system of logs, tasks, and trackers",
    emoji: "📋",
  },
  // Personal Growth
  {
    id: "goals",
    name: "Goal Tracker",
    category: "Personal Growth",
    description: "Set intentions, break down milestones, measure progress",
    emoji: "🎯",
  },
  {
    id: "reading",
    name: "Reading",
    category: "Personal Growth",
    description: "Capture highlights, summaries, and reflections",
    emoji: "📚",
  },
  {
    id: "mindset",
    name: "Mindset & Beliefs",
    category: "Personal Growth",
    description: "Affirmations, manifestation, and limiting belief work",
    emoji: "✨",
  },
  {
    id: "inner-child",
    name: "Inner Child Work",
    category: "Personal Growth",
    description: "Healing, reparenting, and emotional integration",
    emoji: "🫂",
  },
  // Wellness
  {
    id: "gratitude",
    name: "Gratitude",
    category: "Wellness",
    description: "Daily appreciation to shift your perspective",
    emoji: "🙏",
  },
  {
    id: "mood",
    name: "Mood Tracker",
    category: "Wellness",
    description: "Track emotional patterns over time",
    emoji: "🌊",
  },
  {
    id: "sleep",
    name: "Sleep & Dream",
    category: "Wellness",
    description: "Log sleep quality and explore dream symbolism",
    emoji: "🌙",
  },
  {
    id: "habits",
    name: "Habits",
    category: "Wellness",
    description: "Build streaks, track consistency, celebrate wins",
    emoji: "🔥",
  },
  {
    id: "fitness",
    name: "Health & Fitness",
    category: "Wellness",
    description: "Log workouts, nutrition, and body metrics",
    emoji: "💪",
  },
  // Spiritual
  {
    id: "spiritual",
    name: "Spiritual",
    category: "Spiritual",
    description: "Meditations, synchronicities, and inner guidance",
    emoji: "🔮",
  },
];

export const JOURNAL_TYPES_BY_CATEGORY = JOURNAL_TYPES.reduce<
  Record<string, JournalType[]>
>((acc, type) => {
  if (!acc[type.category]) acc[type.category] = [];
  acc[type.category].push(type);
  return acc;
}, {});

export function getJournalType(id: string): JournalType | undefined {
  return JOURNAL_TYPES.find((t) => t.id === id);
}

export const VALID_JOURNAL_TYPE_IDS = new Set<string>(
  JOURNAL_TYPES.map((t) => t.id),
);
