export interface BuiltInTemplate {
  id: string; // stable slug, never changes
  title: string;
  description: string;
  emoji: string;
  group: string; // for grouping in the picker
  body: string; // full markdown prefilled in the editor
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
    body: `## Stream of consciousness

<!-- Write without stopping or editing for a few minutes. Let it all out. -->



## What's on my mind

<!-- Any worries, hopes, or unresolved things surfacing? -->



## Today's intention

<!-- One thing I want to feel or accomplish today -->
`,
  },
  {
    id: "builtin-evening-reflection",
    title: "Evening Reflection",
    description: "Wind down by reviewing your day with gentle curiosity",
    emoji: "🌙",
    group: "General",
    categories: [],
    isBuiltIn: true,
    body: `## Highlight of the day

<!-- The best moment, however small -->



## A challenge I faced

<!-- What made today hard? -->



## What it taught me



## One thing I'd do differently



## Tomorrow's priority
`,
  },
  {
    id: "builtin-mood-checkin",
    title: "Mood Check-in",
    description: "Name what you're feeling and explore what's driving it",
    emoji: "💭",
    group: "General",
    categories: ["mood"],
    isBuiltIn: true,
    body: `## How I'm feeling right now

<!-- Name 1–3 emotions and their intensity (0–10), e.g. Anxious 7, Curious 5 -->



## What's driving this mood

<!-- Situation, thoughts, physical state, recent events -->



## What would help me right now



## One kind thing I can do for myself today
`,
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
    body: `## Three things I'm grateful for today

1.
2.
3.

## Why one of these matters to me

<!-- Go deeper on one — why does it feel meaningful right now? -->



## Someone worth appreciating

<!-- Is there a person who made a positive difference recently? -->



## One good thing about myself today



## My intention for tomorrow
`,
  },
  {
    id: "builtin-sleep-dream",
    title: "Sleep & Dream",
    description: "Track your sleep quality and explore dream symbolism",
    emoji: "💤",
    group: "Wellness",
    categories: ["sleep"],
    isBuiltIn: true,
    body: `## Sleep quality

<!-- Hours slept: ___  Rested feeling (1–10): ___ -->
<!-- Any disturbances, waking up, difficulty falling asleep? -->



## Dream recall

<!-- What do I remember? Any recurring symbols, emotions, or themes? -->



## Waking feeling

<!-- How did my body and mind feel when I woke up? -->



## One thing I want to carry into today
`,
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
    body: `## The situation

<!-- What happened? Where, when, with whom? Be specific and factual. -->



## My automatic thoughts

<!-- What went through my mind? What does this say about me / others / the future? -->



## Emotions and intensity

<!-- e.g. Anxious 70%, Sad 40% — list each emotion with a rough intensity -->



## Evidence that supports the thought



## Evidence that challenges the thought



## A more balanced perspective

<!-- What would I tell a friend in this situation? -->



## How I feel now

<!-- Emotions and intensity after reframing -->
`,
  },
  {
    id: "builtin-weekly-review",
    title: "Weekly Review",
    description: "Step back and see the bigger picture of your week",
    emoji: "📋",
    group: "Personal Growth",
    categories: ["productivity"],
    isBuiltIn: true,
    body: `## Wins this week

1.
2.
3.

## Challenges and how I handled them



## What I learned



## What I want to do differently next week



## Next week's top priority
`,
  },
  {
    id: "builtin-goal-setting",
    title: "Goal Setting",
    description: "Define a goal clearly and plan your first steps",
    emoji: "🎯",
    group: "Personal Growth",
    categories: ["goals"],
    isBuiltIn: true,
    body: `## The goal

<!-- State it clearly and specifically -->



## Why it matters to me

<!-- What deeper value or need does this serve? -->



## My first concrete step

<!-- What's one small action I can take in the next 48 hours? -->



## Potential obstacles



## How I'll handle them



## How I'll know I've succeeded
`,
  },
];

export const BUILT_IN_TEMPLATE_GROUPS = [
  ...new Set(BUILT_IN_TEMPLATES.map((t) => t.group)),
];

export function findBuiltIn(id: string): BuiltInTemplate | undefined {
  return BUILT_IN_TEMPLATES.find((t) => t.id === id);
}
