import Link from "next/link";
import type { AnyTemplate, BuiltInTemplate } from "@/lib/templates";
import { BUILT_IN_TEMPLATES, BUILT_IN_TEMPLATE_GROUPS } from "@/lib/templates";
import type { JournalTemplate } from "@prisma/client";
import TemplateIcon from "@/components/icons/TemplateIcon";

// Maps journaling intentions to built-in template IDs
const INTENTION_TEMPLATE_MAP: Record<string, string[]> = {
  "self-reflection": ["builtin-evening-reflection", "builtin-cbt-thought-record", "builtin-morning-pages"],
  "stress-relief":   ["builtin-mood-checkin", "builtin-cbt-thought-record"],
  "creative-writing":["builtin-morning-pages"],
  "gratitude":       ["builtin-gratitude"],
  "habit-tracking":  ["builtin-weekly-review", "builtin-goal-setting"],
};

function getRecommended(
  intentions: string[],
  overrides: Record<string, JournalTemplate>,
): BuiltInTemplate[] {
  if (intentions.length === 0) return [];
  const seen = new Set<string>();
  const results: BuiltInTemplate[] = [];
  for (const intention of intentions) {
    for (const id of INTENTION_TEMPLATE_MAP[intention] ?? []) {
      if (seen.has(id)) continue;
      seen.add(id);
      if (overrides[id]?.hidden) continue;
      const t = BUILT_IN_TEMPLATES.find((bt) => bt.id === id);
      if (t) results.push(applyOverride(t, overrides[id]));
    }
  }
  return results;
}

function applyOverride(t: BuiltInTemplate, override?: JournalTemplate): BuiltInTemplate {
  if (!override) return t;
  return {
    ...t,
    title: override.title ?? t.title,
    description: override.description ?? t.description,
    emoji: override.emoji ?? t.emoji,
  };
}

interface TemplatePickerProps {
  userTemplates: JournalTemplate[];
  overrides: Record<string, JournalTemplate>;
  journalingIntentions: string[];
}

function TemplateCard({ template }: { template: AnyTemplate }) {
  return (
    <Link
      href={`/journal/new?from=${template.id}`}
      className="group flex flex-col gap-2 p-4 bg-card border border-border rounded-xl hover:border-foreground/30 hover:bg-foreground/8 transition-all"
    >
      <div className="flex items-center gap-2">
        <TemplateIcon id={template.id} className="w-4 h-4 shrink-0 text-foreground/40" />
        <span className="text-sm font-medium text-foreground group-hover:text-primary/80 transition-colors">
          {template.title}
        </span>
        {!template.isBuiltIn && (
          <span className="ml-auto text-[10px] text-foreground/30 border border-foreground/20 rounded px-1">
            custom
          </span>
        )}
      </div>
      {template.description && (
        <p className="text-xs text-foreground/40 leading-relaxed">{template.description}</p>
      )}
    </Link>
  );
}

export default function TemplatePicker({
  userTemplates,
  overrides,
  journalingIntentions,
}: TemplatePickerProps) {
  const userMapped: AnyTemplate[] = userTemplates.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    emoji: t.emoji,
    group: "My templates" as const,
    body: t.body,
    categories: t.categories,
    isBuiltIn: false as const,
  }));

  const recommended = getRecommended(journalingIntentions, overrides);
  const recommendedIds = new Set(recommended.map((t) => t.id));

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-foreground">New entry</h1>
          <p className="text-sm text-foreground/40 mt-0.5">
            Start from a template or jump straight to a blank page
          </p>
        </div>
      </div>

      {/* Quick-start row */}
      <div className="flex gap-3 mb-8">
        <Link
          href="/journal/new?from=blank"
          className="group flex items-center gap-2 flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Blank entry
        </Link>
        <Link
          href="/journal/guided"
          className="group flex items-center gap-2 flex-1 px-4 py-3 bg-card hover:bg-foreground/10 border border-foreground/10 hover:border-primary/40 text-foreground font-medium rounded-xl transition-colors"
        >
          <svg className="w-4 h-4 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
          </svg>
          <span>Guided session</span>
        </Link>
      </div>

      {/* Recommended templates (only shown when intentions were captured) */}
      {recommended.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-3 flex items-center gap-2">
            ✦ Recommended for you
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recommended.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        </section>
      )}

      {/* User templates */}
      {userMapped.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-3">
            My templates
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {userMapped.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        </section>
      )}

      {/* Built-in templates grouped — skip hidden and ones already in recommended */}
      {BUILT_IN_TEMPLATE_GROUPS.map((group) => {
        const groupTemplates = BUILT_IN_TEMPLATES
          .filter((t) => t.group === group && !recommendedIds.has(t.id) && !overrides[t.id]?.hidden)
          .map((t) => applyOverride(t, overrides[t.id]));
        if (groupTemplates.length === 0) return null;
        return (
          <section key={group} className="mb-8">
            <h2 className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-3">
              {group}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groupTemplates.map((t) => (
                <TemplateCard key={t.id} template={t} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
