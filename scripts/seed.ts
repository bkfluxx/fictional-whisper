#!/usr/bin/env npx tsx
/**
 * Seed script — generates ~3 months of realistic journal entries.
 * Run inside the container:
 *   docker compose exec app npx tsx scripts/seed.ts
 *
 * Uses BACKUP_SECRET + the backupDek stored in KeyStore to encrypt entries
 * without requiring an interactive login session.
 */

import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Inline crypto (avoids tsconfig path-alias headaches in scripts/) ─────────

function aesDecrypt(blob: Buffer, key: Buffer): Buffer {
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const ct = blob.subarray(28);
  const d = crypto.createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]);
}

function aesEncrypt(plain: Buffer, key: Buffer): Buffer {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]);
}

function enc(text: string, dek: Buffer): string {
  return aesEncrypt(Buffer.from(text, "utf8"), dek).toString("base64");
}

// ─── Search token helpers ─────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "the","and","for","are","but","not","you","all","any","can","had","her","was",
  "one","our","out","day","get","has","him","his","how","its","let","may","nor",
  "now","own","say","she","too","use","was","way","who","did","each","from","just",
  "know","like","long","make","many","more","most","much","must","name","only",
  "other","over","part","same","see","such","take","than","that","them","then",
  "there","they","this","time","two","very","well","were","what","when","which",
  "will","with","would","your",
]);

function tokenize(text: string): string[] {
  return [...new Set(
    text.toLowerCase().split(/\W+/).filter((w) => w.length >= 3 && !STOP_WORDS.has(w)),
  )];
}

function hmacToken(word: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(word).digest("hex");
}

// ─── DEK resolution ───────────────────────────────────────────────────────────

async function getDEK(): Promise<Buffer> {
  const BACKUP_SECRET = process.env.BACKUP_SECRET;
  if (!BACKUP_SECRET) throw new Error("BACKUP_SECRET not set in environment");
  const ks = await prisma.keyStore.findUnique({ where: { id: "singleton" } });
  if (!ks?.backupDek) throw new Error("No backupDek found — is the app set up and has a user logged in at least once?");
  const backupKey = crypto.createHash("sha256").update(BACKUP_SECRET).digest();
  return aesDecrypt(Buffer.from(ks.backupDek, "base64"), backupKey);
}

// ─── Seed data ────────────────────────────────────────────────────────────────

type SeedEntry = {
  daysFromStart: number; // 0 = March 1 2026
  title: string | null;
  body: string;
  mood: string;
  categories: string[];
  tags: string[];
};

// Approx 68 entries over 90 days (March 1 – May 29 2026)
const ENTRIES: SeedEntry[] = [
  // ── March ─────────────────────────────────────────────────────────────────
  {
    daysFromStart: 0,
    title: "Fresh start",
    body: "<p>New month, clean slate. I've been meaning to journal more consistently and I figure March is as good a time as any to start. Nothing profound to report — just that the morning was quiet and I made a decent cup of coffee. Sometimes that's enough.</p>",
    mood: "content",
    categories: ["brain-dump"],
    tags: ["morning-routine"],
  },
  {
    daysFromStart: 1,
    title: null,
    body: "<p>Work was a slog today. Sat through three meetings that could have been emails and came away with nothing except a mild headache. I keep telling myself this pace isn't sustainable but I don't know what to do about it yet.</p><p>Ordered Thai for dinner. Small victories.</p>",
    mood: "frustrated",
    categories: ["mood"],
    tags: ["work", "stress"],
  },
  {
    daysFromStart: 3,
    title: "Gratitude check",
    body: "<p>Three things I'm grateful for today:</p><p>1. A text from my sister just to say hi. Nothing important, just thinking of you. Those are the best.</p><p>2. The light at 6pm — it's noticeably staying longer now. Spring is on its way.</p><p>3. My body feels healthy. Not something I think about until it isn't true.</p>",
    mood: "content",
    categories: ["gratitude"],
    tags: ["family", "gratitude", "spring"],
  },
  {
    daysFromStart: 5,
    title: null,
    body: "<p>Had a long walk this evening, about an hour. Didn't listen to anything — just walked. I noticed how rarely I'm in my own head without a podcast or music filling the space. It felt uncomfortable at first and then kind of good. Will try to do this more.</p>",
    mood: "reflective",
    categories: ["mindset"],
    tags: ["walking", "solitude", "mental-health"],
  },
  {
    daysFromStart: 6,
    title: "Sleep has been rough",
    body: "<p>Third night in a row waking up around 3am and lying there for an hour before falling back. I know it's stress-related but naming the cause doesn't make it easier to sleep through. Going to cut caffeine after noon and see if that helps.</p>",
    mood: "anxious",
    categories: ["sleep"],
    tags: ["sleep", "health", "anxiety"],
  },
  {
    daysFromStart: 8,
    title: null,
    body: "<p>Coffee after noon ban: day two. It's fine. I'm fine. Everything is fine.</p><p>Genuinely though — fell asleep before 11pm last night, woke up feeling more rested than I have in weeks. Correlation isn't causation but I'll take the win.</p>",
    mood: "content",
    categories: ["sleep", "habits"],
    tags: ["sleep", "health", "coffee"],
  },
  {
    daysFromStart: 10,
    title: "Goal check-in",
    body: "<p>I set three goals for the year back in January. Let me see where I am.</p><p><strong>1. Read 20 books.</strong> I'm on book 5. On track.</p><p><strong>2. Exercise 3x per week.</strong> More like 1.5x. Need to improve.</p><p><strong>3. Spend less time doom-scrolling.</strong> Ha.</p><p>Two out of three isn't bad. The scrolling thing is a real problem though. Going to try putting my phone in a drawer after 9pm.</p>",
    mood: "reflective",
    categories: ["goals", "habits"],
    tags: ["goals", "reading", "fitness", "habits"],
  },
  {
    daysFromStart: 12,
    title: null,
    body: "<p>Had lunch with an old friend I hadn't seen in almost a year. We picked up like no time had passed. That's a rare quality in a friendship and I don't appreciate it enough. Made plans to meet again next month — actually put it in the calendar this time so it happens.</p>",
    mood: "joyful",
    categories: ["gratitude"],
    tags: ["friends", "connection"],
  },
  {
    daysFromStart: 14,
    title: "Rainy Saturday",
    body: "<p>Stayed in most of the day. Made soup from scratch — nothing fancy, just a lentil situation with whatever was in the fridge. Listened to an album I used to love in college and felt very nostalgic. There's something nice about rainy days that give you permission to do nothing productive.</p>",
    mood: "content",
    categories: ["brain-dump"],
    tags: ["cooking", "music", "weekend"],
  },
  {
    daysFromStart: 15,
    title: null,
    body: "<p>I've been thinking about a conversation I had last week where I said something I immediately regretted. The other person probably forgot about it instantly but I keep replaying it. Why does the brain do this? The gap between how I want to show up and how I actually do sometimes feels wide.</p>",
    mood: "reflective",
    categories: ["inner-child", "mindset"],
    tags: ["self-awareness", "regret", "growth"],
  },
  {
    daysFromStart: 17,
    title: "First run in weeks",
    body: "<p>Dragged myself out for a 20-minute jog. Everything hurt and I was slow but I went. The hardest part really is just putting the shoes on. Felt genuinely good afterward — that endorphin thing is real. Going to try to make Tuesday/Thursday mornings a consistent thing.</p>",
    mood: "content",
    categories: ["fitness"],
    tags: ["running", "fitness", "health"],
  },
  {
    daysFromStart: 19,
    title: null,
    body: "<p>Anxious today for no specific reason. Or maybe lots of small reasons stacking up — work deadline next week, haven't called my parents in too long, the apartment is a mess. That background hum of things left undone. Going to do a quick triage tonight: what actually needs doing vs what can wait.</p>",
    mood: "anxious",
    categories: ["brain-dump", "mood"],
    tags: ["anxiety", "work", "mental-health"],
  },
  {
    daysFromStart: 20,
    title: "Brain dump",
    body: "<p>Things on my mind, in no particular order:</p><p>— Need to renew car insurance before the end of the month<br>— Been meaning to read that book about habits for six months now<br>— Want to rearrange my desk setup, it doesn't feel right<br>— Should reach out to Jamie about the project we talked about<br>— I miss cooking more elaborate meals</p><p>Okay. Writing them down helps. Some of these are 2-minute tasks I've been treating as 2-hour ones.</p>",
    mood: "neutral",
    categories: ["bullet", "brain-dump"],
    tags: ["productivity", "to-do"],
  },
  {
    daysFromStart: 22,
    title: null,
    body: "<p>Finished a book I'd been struggling to get through. The last 50 pages were the best — it just needed to get going. Reminded me to push through slow starts more often. In books and probably other things too.</p>",
    mood: "content",
    categories: ["reading"],
    tags: ["reading", "books"],
  },
  {
    daysFromStart: 24,
    title: "Spring finally arrived",
    body: "<p>It was genuinely warm today. Like, coat-off, sit-outside warm. Had my coffee on the steps this morning and just sat there for fifteen minutes doing nothing. The birds are back. There's something deeply hopeful about the first warm day of the year.</p>",
    mood: "joyful",
    categories: ["gratitude"],
    tags: ["spring", "nature", "morning-routine"],
  },
  {
    daysFromStart: 26,
    title: null,
    body: "<p>Work presentation went well. Better than expected, actually. I always over-prepare and then wonder why I was anxious. The over-preparation probably IS why it goes well — that's a pattern I should acknowledge rather than dismiss.</p>",
    mood: "content",
    categories: ["productivity"],
    tags: ["work", "confidence", "presentation"],
  },
  {
    daysFromStart: 27,
    title: "Thinking about creativity",
    body: "<p>I haven't made anything in a while. I used to draw, back in school. Nothing serious but I enjoyed it. At some point I stopped and told myself I wasn't talented enough to justify the time. That's a terrible reason. I think I'll buy a sketchbook this week and just see what happens with no expectation of output.</p>",
    mood: "reflective",
    categories: ["creativity", "inner-child"],
    tags: ["creativity", "drawing", "self-expression"],
  },
  {
    daysFromStart: 29,
    title: null,
    body: "<p>Bought the sketchbook. Drew a terrible picture of my plant. Then a slightly less terrible one. Then I sat there for another 20 minutes just doodling. Time disappeared in a way that almost never happens at work. That's worth something.</p>",
    mood: "joyful",
    categories: ["creativity"],
    tags: ["drawing", "creativity", "flow"],
  },
  // ── April ─────────────────────────────────────────────────────────────────
  {
    daysFromStart: 31,
    title: "April",
    body: "<p>New month. Reflecting on March — it was pretty good, all things considered. Sleep improved. Ran twice a week most weeks. Reconnected with a friend. The sketchbook thing has stuck. Not a bad haul.</p><p>What do I want from April? More of the same, plus I'd like to actually finish the project I've been deferring at work. And call my parents more than twice a month.</p>",
    mood: "content",
    categories: ["goals", "mindset"],
    tags: ["reflection", "goals", "monthly-review"],
  },
  {
    daysFromStart: 33,
    title: null,
    body: "<p>Hard day. Everything that could go sideways at work did. The kind of day where you sit down to do one thing and three other things explode simultaneously. Left the office late and felt fried. Made tea, put on something quiet, went to bed early.</p><p>Tomorrow will be better. It has to be.</p>",
    mood: "frustrated",
    categories: ["mood"],
    tags: ["work", "stress", "exhaustion"],
  },
  {
    daysFromStart: 35,
    title: null,
    body: "<p>It was better. Work was fine, actually managed to tick off a few things I'd been avoiding. Left on time and went for a walk by the river. Sat on a bench and watched the water for a while. Cities are pretty good when you find the right spot.</p>",
    mood: "content",
    categories: ["mindset"],
    tags: ["walking", "nature", "work"],
  },
  {
    daysFromStart: 37,
    title: "Reading: finished #6",
    body: "<p>Finished book six of the year — a short essay collection on attention and digital distraction. Parts of it felt uncomfortably specific to my own habits. The author made the point that we don't lose attention to distractions, we actively choose them because they offer predictable, low-cost rewards. That framing changes things.</p><p>Now reading: a novel a friend recommended. Much lighter fare. Needed.</p>",
    mood: "reflective",
    categories: ["reading", "mindset"],
    tags: ["reading", "books", "focus", "technology"],
  },
  {
    daysFromStart: 38,
    title: null,
    body: "<p>Gratitude, quick version: my health, the spring light, good headphones, the fact that I can make myself a meal whenever I'm hungry. The ordinary stuff that becomes extraordinary when you actually notice it.</p>",
    mood: "content",
    categories: ["gratitude"],
    tags: ["gratitude"],
  },
  {
    daysFromStart: 40,
    title: "Easter weekend",
    body: "<p>Took four days off. Went to see family — first time since Christmas. It was loud and chaotic in the best way. My nephew is at the age where everything is the most hilarious thing he's ever seen, which is genuinely contagious. I laughed more in two days than I have in the last month.</p>",
    mood: "joyful",
    categories: ["gratitude"],
    tags: ["family", "holidays", "laughter"],
  },
  {
    daysFromStart: 43,
    title: null,
    body: "<p>Back to work after the long weekend. Predictably hard to get back into it. Spent the first hour just clearing email and pretending that counted as work. By afternoon I found some focus. That re-entry phase seems to take a day — need to not be hard on myself when it does.</p>",
    mood: "neutral",
    categories: ["productivity"],
    tags: ["work", "focus", "routine"],
  },
  {
    daysFromStart: 45,
    title: "The project is finally done",
    body: "<p>Finished the work project that's been hanging over me since February. Sent the final deliverable this afternoon. That feeling of something being <em>done</em> is underrated. Not perfect — there are definitely things I'd do differently — but done and out in the world.</p><p>Celebrated with a glass of wine and absolutely nothing productive for the rest of the evening.</p>",
    mood: "joyful",
    categories: ["productivity"],
    tags: ["work", "accomplishment", "celebration"],
  },
  {
    daysFromStart: 47,
    title: null,
    body: "<p>Woke up feeling low today. No particular reason. Just one of those mornings where getting out of bed feels like wading through mud. Made myself shower, made myself eat breakfast, went for a short walk. Felt marginally better by midday.</p><p>I've learned to just do the mechanical things on these days. Movement helps even when nothing else does.</p>",
    mood: "sad",
    categories: ["mood", "habits"],
    tags: ["mental-health", "low-mood", "self-care"],
  },
  {
    daysFromStart: 49,
    title: "Morning pages experiment",
    body: "<p>Tried writing three pages by hand first thing in the morning, no phone, no coffee yet. It felt stupid for the first page and then I hit something on the second page that surprised me. I don't know where it came from. Going to try this for a week and see what emerges.</p>",
    mood: "reflective",
    categories: ["creativity", "mindset"],
    tags: ["writing", "morning-routine", "creativity"],
  },
  {
    daysFromStart: 51,
    title: null,
    body: "<p>Morning pages day three. Still weird, still oddly useful. Today I wrote about a decision I've been circling for months without landing on. By the end of the page I had basically made the decision. Writing is thinking, I keep forgetting that.</p>",
    mood: "reflective",
    categories: ["mindset", "creativity"],
    tags: ["writing", "decision-making", "clarity"],
  },
  {
    daysFromStart: 53,
    title: "Fitness check",
    body: "<p>Ran three times this week — Tuesday, Thursday, Saturday. First time I've hit the goal consistently. Nothing fast, nothing impressive, but consistent. That's the part I always skip past too quickly: the showing-up matters more than the performance.</p><p>Added a short strength circuit at the end of the runs. Everything hurts now but it's a good hurt.</p>",
    mood: "content",
    categories: ["fitness", "habits"],
    tags: ["running", "fitness", "consistency"],
  },
  {
    daysFromStart: 55,
    title: null,
    body: "<p>Sat with some people at work I don't usually talk to — ended up in a genuinely interesting conversation about what we all actually wanted to be doing in five years. Turns out most people have a pretty different picture in their heads than their current trajectory. That's both reassuring and slightly unsettling.</p>",
    mood: "reflective",
    categories: ["mindset"],
    tags: ["work", "ambition", "future"],
  },
  {
    daysFromStart: 57,
    title: "Sketchbook update",
    body: "<p>Still drawing. One thing I've noticed: on days I'm anxious, the drawings are more detailed and careful — I think I'm trying to control something. On relaxed days they're looser and more interesting. Anxiety optimizes for precision; ease optimizes for expression. That's probably true in more than just drawing.</p>",
    mood: "content",
    categories: ["creativity"],
    tags: ["drawing", "creativity", "self-awareness", "anxiety"],
  },
  {
    daysFromStart: 59,
    title: null,
    body: "<p>Had a frustrating interaction with a service person today where I caught myself being short with them in a way I immediately regretted. They were just doing their job and I was stressed about something unrelated. Apologized and they were gracious about it, which somehow made me feel worse.</p><p>Note to self: other people are not absorbers for your bad days.</p>",
    mood: "frustrated",
    categories: ["inner-child"],
    tags: ["self-awareness", "empathy", "regret"],
  },
  {
    daysFromStart: 61,
    title: "Weekly review",
    body: "<p><strong>What went well:</strong> hit fitness goal, morning pages 4/7 days, finished a difficult task at work.</p><p><strong>What didn't:</strong> ate poorly for three days, didn't reach out to anyone socially, spent too much time on my phone after 9pm.</p><p><strong>One thing I want to carry forward:</strong> the morning pages felt valuable. Keep doing that.</p>",
    mood: "neutral",
    categories: ["goals", "bullet"],
    tags: ["weekly-review", "reflection", "habits"],
  },
  {
    daysFromStart: 63,
    title: null,
    body: "<p>The tree outside my window has fully leafed out overnight. That sentence would sound ridiculous to anyone else but I've been watching it happen over the past few weeks and today it just suddenly looked like summer. Nature is dramatic when you pay attention.</p>",
    mood: "joyful",
    categories: ["gratitude"],
    tags: ["nature", "spring", "seasons"],
  },
  // ── May ───────────────────────────────────────────────────────────────────
  {
    daysFromStart: 61,
    title: null,
    body: "<p>Weird restless energy today. Couldn't focus on anything for more than ten minutes. Eventually gave up trying to be productive and reorganized my bookshelves by color, which is useless but somehow satisfying. Maybe the restlessness was just a signal that I needed to do something tactile and immediate.</p>",
    mood: "neutral",
    categories: ["brain-dump"],
    tags: ["productivity", "creativity", "restlessness"],
  },
  {
    daysFromStart: 62,
    title: "May",
    body: "<p>Already May. The year is moving faster than I can track. Two months of journaling more consistently than I ever have before. It does something — I can't always articulate what, but it's like having a record of myself that I can trust.</p><p>May intention: less future-worrying, more present-noticing.</p>",
    mood: "reflective",
    categories: ["mindset", "goals"],
    tags: ["reflection", "presence", "intentions"],
  },
  {
    daysFromStart: 64,
    title: null,
    body: "<p>Nailed a difficult conversation at work that I'd been avoiding. Said the thing clearly, the other person took it well, situation resolved. I spent two weeks dreading ten minutes. This keeps happening and I keep forgetting the lesson: the dread is longer than the event.</p>",
    mood: "content",
    categories: ["productivity", "mindset"],
    tags: ["work", "communication", "anxiety"],
  },
  {
    daysFromStart: 66,
    title: null,
    body: "<p>Slept 9 hours. Woke up at 7, went back to sleep until 9. Body clearly needed it. Felt human again by midday. Sometimes rest is the productivity.</p>",
    mood: "content",
    categories: ["sleep"],
    tags: ["sleep", "rest", "recovery"],
  },
  {
    daysFromStart: 67,
    title: "Good weekend",
    body: "<p>Farmer's market in the morning. Bought too many vegetables and a bunch of tulips because I wanted them. Spent the afternoon cooking — really cooking, not just assembling. Made a proper ragu and let it go for two hours. The apartment smelled incredible. Ate it with the windows open while it was still warm enough.</p><p>This is what weekends are for.</p>",
    mood: "joyful",
    categories: ["gratitude", "habits"],
    tags: ["cooking", "weekend", "home", "food"],
  },
  {
    daysFromStart: 69,
    title: null,
    body: "<p>Feeling the pull of a new creative project but I can't quite see its shape yet. It's that pre-beginning feeling — something wanting to be made, no form yet. I've learned not to force it. Just hold the space open and keep noticing.</p>",
    mood: "reflective",
    categories: ["creativity"],
    tags: ["creativity", "ideas", "process"],
  },
  {
    daysFromStart: 71,
    title: "Called my parents",
    body: "<p>Had a proper call with my parents today — not a quick check-in, an actual conversation. An hour and fifteen minutes. My dad told me a story about his first job that I'd never heard before. I'm 30-something and learning things about my parents I didn't know. There's more story there than I've thought to ask about.</p>",
    mood: "reflective",
    categories: ["gratitude"],
    tags: ["family", "connection", "history"],
  },
  {
    daysFromStart: 73,
    title: null,
    body: "<p>Rain for three days straight. Not complaining — the city needs it and everything is intensely green. But my mood has followed the weather more than usual. Noticed I'm more withdrawn, less motivated. Light therapy next winter for sure.</p>",
    mood: "neutral",
    categories: ["mood", "sleep"],
    tags: ["weather", "mood", "seasonal"],
  },
  {
    daysFromStart: 74,
    title: "Reading: almost at 10",
    body: "<p>Book nine done. One more to hit my midpoint check — 10 books by the end of May, on track for 20 by December. The novel my friend recommended turned out to be one of my favorites of the year. Reading it felt like visiting a place I'd been before but couldn't name.</p>",
    mood: "content",
    categories: ["reading"],
    tags: ["reading", "books", "goals"],
  },
  {
    daysFromStart: 76,
    title: null,
    body: "<p>Bad sleep again. Not as bad as March but 2am brain decided it wanted to go over every professional failure since 2018. Very helpful, brain. Thanks for the audit. Going to write a worry list before bed and see if externalizing the anxiety gives it less room to fester overnight.</p>",
    mood: "anxious",
    categories: ["sleep", "mindset"],
    tags: ["sleep", "anxiety", "tools"],
  },
  {
    daysFromStart: 77,
    title: "Worry list experiment",
    body: "<p>Wrote the worry list. Six things. Reading them back they split into two categories: things I can actually do something about (three of them) and things that are just fear without a target (three of them). The first group got action items. The second group got written on a separate piece of paper and then I put the paper in a drawer. We'll see.</p>",
    mood: "reflective",
    categories: ["mindset", "habits"],
    tags: ["anxiety", "tools", "mental-health", "problem-solving"],
  },
  {
    daysFromStart: 79,
    title: null,
    body: "<p>Two good nights of sleep in a row. The worry list thing might actually work, or maybe I was just tired enough. Going to keep doing it regardless. It takes four minutes and even if it's placebo, four minutes is worth a good night's sleep.</p>",
    mood: "content",
    categories: ["sleep", "habits"],
    tags: ["sleep", "health", "habits"],
  },
  {
    daysFromStart: 81,
    title: "Habits that have stuck",
    body: "<p>Taking stock of what has actually become habitual over these three months:</p><p>✓ No caffeine after noon<br>✓ Running twice a week (sometimes three)<br>✓ Drawing most evenings<br>✓ Journaling 5-6 days a week<br>✓ No phone after 9pm (mostly)</p><p>Habits that haven't stuck: morning pages fell off after three weeks, meal planning still intermittent, reading before bed instead of scrolling — needs work.</p><p>The ones that stuck share a characteristic: they're either attached to an existing routine or have an immediate payoff. Worth remembering.</p>",
    mood: "content",
    categories: ["habits", "goals"],
    tags: ["habits", "reflection", "growth", "consistency"],
  },
  {
    daysFromStart: 83,
    title: null,
    body: "<p>Spent the afternoon in a gallery. Went alone, which I used to find awkward and now find ideal. Took my time. Found one piece I kept coming back to — a large abstract that looked chaotic close up and resolved into something almost architectural from further back. Distance changes what you see. True about art, true about most things.</p>",
    mood: "reflective",
    categories: ["creativity", "mindset"],
    tags: ["art", "solitude", "perspective"],
  },
  {
    daysFromStart: 85,
    title: "Midyear reflection (early)",
    body: "<p>Not officially midyear but close enough to check in against January intentions.</p><p>Reading goal: ✓ On track (9 books). Exercise: ✓ Better than expected. Phone habits: ✗ Still a problem. Learning something new: Actually yes — drawing, which I didn't plan but counts.</p><p>The most valuable thing that happened this year so far wasn't on any list. It was just the habit of writing. It's made me more honest with myself than I've managed in a long time.</p>",
    mood: "reflective",
    categories: ["goals", "mindset"],
    tags: ["goals", "reflection", "growth", "writing"],
  },
  {
    daysFromStart: 86,
    title: null,
    body: "<p>Long bike ride this morning. The city is different at 7am — quieter, more human-scale. Stopped at a bakery that wasn't open yet and waited ten minutes for it to open. The croissant was worth the wait. Sometimes the wait is part of the thing.</p>",
    mood: "joyful",
    categories: ["fitness", "gratitude"],
    tags: ["cycling", "morning", "city", "food"],
  },
  {
    daysFromStart: 87,
    title: null,
    body: "<p>Noticed today that I default to agreeing in conversations even when I don't, actually, agree. It's a conflict-avoidance thing I've known about for years but still haven't fixed. Not sure if this is something to fix or manage. But naming it clearly seems like a first step.</p>",
    mood: "reflective",
    categories: ["inner-child", "mindset"],
    tags: ["self-awareness", "communication", "growth"],
  },
  {
    daysFromStart: 88,
    title: "Feeling good",
    body: "<p>No particular reason. Just woke up in a good mood, had a productive morning, had a nice lunch, took a walk. The day didn't do anything exceptional — I think I was just more present in it than usual. That's the whole game, maybe. Just being in the actual day instead of somewhere else in your head.</p>",
    mood: "joyful",
    categories: ["gratitude", "mindset"],
    tags: ["presence", "gratitude", "good-day"],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Starting seed…");

  const dek = await getDEK();
  const HMAC_SECRET = process.env.SEARCH_HMAC_SECRET;
  if (!HMAC_SECRET) throw new Error("SEARCH_HMAC_SECRET not set");

  const START = new Date("2026-03-01T09:00:00.000Z");

  // Ensure all referenced tags exist
  const allTagNames = [...new Set(ENTRIES.flatMap((e) => e.tags))];
  for (const name of allTagNames) {
    await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`  ✓ Upserted ${allTagNames.length} tags`);

  let created = 0;
  for (const entry of ENTRIES) {
    const entryDate = new Date(START);
    entryDate.setDate(entryDate.getDate() + entry.daysFromStart);
    // Jitter the time so entries on the same day look natural
    entryDate.setHours(8 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60));

    const plainBody = entry.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    const created_entry = await prisma.entry.create({
      data: {
        entryDate,
        title: entry.title ? enc(entry.title, dek) : null,
        body: enc(entry.body, dek),
        mood: entry.mood,
        categories: entry.categories,
        tags: {
          connect: entry.tags.map((name) => ({ name })),
        },
      },
    });

    // Index search tokens
    const searchText = [entry.title ?? "", plainBody, ...entry.tags].join(" ");
    const words = tokenize(searchText);
    if (words.length > 0) {
      await prisma.searchToken.createMany({
        data: words.map((w) => ({
          entryId: created_entry.id,
          token: hmacToken(w, HMAC_SECRET),
        })),
        skipDuplicates: true,
      });
    }

    created++;
    process.stdout.write(`\r  ✓ ${created}/${ENTRIES.length} entries`);
  }

  console.log(`\n\n✅  Done! Created ${created} entries spanning ~3 months.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
