export interface BuiltInTemplate {
  id: string; // stable slug, never changes
  title: string;
  description: string;
  emoji: string;
  group: string; // for grouping in the picker
  body: string; // HTML prefilled in the editor
  categories: string[]; // suggested category IDs
  isBuiltIn: true;
}

export interface UserTemplate {
  id: string;
  title: string;
  description: string | null;
  emoji: string;
  group: "My templates";
  body: string;
  categories: string[];
  isBuiltIn: false;
}

export type AnyTemplate = BuiltInTemplate | UserTemplate;

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  // ── General ────────────────────────────────────────────────────────────────
  {
    id: "builtin-morning-pages",
    title: "Morning Pages",
    description: "Unfiltered stream of consciousness to clear your mind",
    emoji: "☀️",
    group: "General",
    categories: ["brain-dump"],
    isBuiltIn: true,
    body: `<h2>Stream of consciousness</h2><p></p><h2>What's on my mind</h2><p></p><h2>Today's intention</h2><p></p>`,
  },
  {
    id: "builtin-evening-reflection",
    title: "Evening Reflection",
    description: "Wind down by reviewing your day with gentle curiosity",
    emoji: "🌙",
    group: "General",
    categories: [],
    isBuiltIn: true,
    body: `<h2>Highlight of the day</h2><p></p><h2>A challenge I faced</h2><p></p><h2>What it taught me</h2><p></p><h2>One thing I'd do differently</h2><p></p><h2>Tomorrow's priority</h2><p></p>`,
  },
  {
    id: "builtin-mood-checkin",
    title: "Mood Check-in",
    description: "Name what you're feeling and explore what's driving it",
    emoji: "💭",
    group: "General",
    categories: ["mood"],
    isBuiltIn: true,
    body: `<h2>How I'm feeling right now</h2><p></p><h2>What's driving this mood</h2><p></p><h2>What would help me right now</h2><p></p><h2>One kind thing I can do for myself today</h2><p></p>`,
  },

  // ── Wellness ───────────────────────────────────────────────────────────────
  {
    id: "builtin-gratitude",
    title: "Gratitude Journal",
    description: "Shift perspective by anchoring to what's already good",
    emoji: "🙏",
    group: "Wellness",
    categories: ["gratitude"],
    isBuiltIn: true,
    body: `<h2>Three things I'm grateful for today</h2><ol><li><p></p></li><li><p></p></li><li><p></p></li></ol><h2>Why one of these matters to me</h2><p></p><h2>Someone worth appreciating</h2><p></p><h2>One good thing about myself today</h2><p></p><h2>My intention for tomorrow</h2><p></p>`,
  },
  {
    id: "builtin-sleep-dream",
    title: "Sleep & Dream",
    description: "Track your sleep quality and explore dream symbolism",
    emoji: "💤",
    group: "Wellness",
    categories: ["sleep"],
    isBuiltIn: true,
    body: `<h2>Sleep quality</h2><p></p><h2>Dream recall</h2><p></p><h2>Waking feeling</h2><p></p><h2>One thing I want to carry into today</h2><p></p>`,
  },

  // ── Personal Growth ────────────────────────────────────────────────────────
  {
    id: "builtin-cbt-thought-record",
    title: "CBT Thought Record",
    description: "Challenge unhelpful thoughts using cognitive reframing",
    emoji: "🧠",
    group: "Personal Growth",
    categories: ["mindset"],
    isBuiltIn: true,
    body: `<h2>The situation</h2><p></p><h2>My automatic thoughts</h2><p></p><h2>Emotions and intensity</h2><p></p><h2>Evidence that supports the thought</h2><p></p><h2>Evidence that challenges the thought</h2><p></p><h2>A more balanced perspective</h2><p></p><h2>How I feel now</h2><p></p>`,
  },
  {
    id: "builtin-weekly-review",
    title: "Weekly Review",
    description: "Step back and see the bigger picture of your week",
    emoji: "📋",
    group: "Personal Growth",
    categories: ["productivity"],
    isBuiltIn: true,
    body: `<h2>Wins this week</h2><ol><li><p></p></li><li><p></p></li><li><p></p></li></ol><h2>Challenges and how I handled them</h2><p></p><h2>What I learned</h2><p></p><h2>What I want to do differently next week</h2><p></p><h2>Next week's top priority</h2><p></p>`,
  },
  {
    id: "builtin-goal-setting",
    title: "Goal Setting",
    description: "Define a goal clearly and plan your first steps",
    emoji: "🎯",
    group: "Personal Growth",
    categories: ["goals"],
    isBuiltIn: true,
    body: `<h2>The goal</h2><p></p><h2>Why it matters to me</h2><p></p><h2>My first concrete step</h2><p></p><h2>Potential obstacles</h2><p></p><h2>How I'll handle them</h2><p></p><h2>How I'll know I've succeeded</h2><p></p>`,
  },
];

export const BUILT_IN_TEMPLATE_GROUPS = [
  ...new Set(BUILT_IN_TEMPLATES.map((t) => t.group)),
];

export function findBuiltIn(id: string): BuiltInTemplate | undefined {
  return BUILT_IN_TEMPLATES.find((t) => t.id === id);
}
