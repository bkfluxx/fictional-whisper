import Link from "next/link";
import type { AnyTemplate, BuiltInTemplate } from "@/lib/templates";
import { BUILT_IN_TEMPLATES, BUILT_IN_TEMPLATE_GROUPS } from "@/lib/templates";
import type { JournalTemplate } from "@prisma/client";

interface TemplatePickerProps {
  userTemplates: JournalTemplate[];
}

function TemplateCard({ template }: { template: AnyTemplate }) {
  return (
    <Link
      href={`/journal/new?from=${template.id}`}
      className="group flex flex-col gap-2 p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-600 hover:bg-neutral-800/60 transition-all"
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{template.emoji}</span>
        <span className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">
          {template.title}
        </span>
        {!template.isBuiltIn && (
          <span className="ml-auto text-[10px] text-neutral-600 border border-neutral-700 rounded px-1">
            custom
          </span>
        )}
      </div>
      {template.description && (
        <p className="text-xs text-neutral-500 leading-relaxed">{template.description}</p>
      )}
    </Link>
  );
}

export default function TemplatePicker({ userTemplates }: TemplatePickerProps) {
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

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">New entry</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Start from a template or jump straight to a blank page
          </p>
        </div>
      </div>

      {/* Blank entry — always first */}
      <Link
        href="/journal/new?from=blank"
        className="group flex items-center gap-3 w-full px-4 py-3 mb-8 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Blank entry
      </Link>

      {/* User templates */}
      {userMapped.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-3">
            My templates
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {userMapped.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        </section>
      )}

      {/* Built-in templates grouped */}
      {BUILT_IN_TEMPLATE_GROUPS.map((group) => {
        const groupTemplates = BUILT_IN_TEMPLATES.filter((t) => t.group === group);
        return (
          <section key={group} className="mb-8">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-3">
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
