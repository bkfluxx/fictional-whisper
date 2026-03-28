"use client";

import { useState } from "react";
import PasswordChangeForm from "./PasswordChangeForm";
import ExportSection from "./ExportSection";
import ImportSection from "./ImportSection";
import AiModelsSettings from "./AiModelsSettings";
import TemplatesSettings from "./TemplatesSettings";

type Tab = "security" | "import-export" | "ai" | "templates";

const TABS: { id: Tab; label: string }[] = [
  { id: "security", label: "Security" },
  { id: "import-export", label: "Import / Export" },
  { id: "ai", label: "AI settings" },
  { id: "templates", label: "Templates" },
];

export default function SettingsTabs() {
  const [active, setActive] = useState<Tab>("security");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-neutral-800 mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              active === tab.id
                ? "border-indigo-500 text-white"
                : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {active === "security" && (
        <section className="space-y-4">
          <div className="mb-5">
            <h2 className="text-base font-medium text-white">Security</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Changing your password re-wraps your encryption key. Your entries
              stay decryptable and your session stays active.
            </p>
          </div>
          <PasswordChangeForm />
        </section>
      )}

      {active === "import-export" && (
        <section className="space-y-10">
          <div>
            <div className="mb-5">
              <h2 className="text-base font-medium text-white">Export</h2>
              <p className="text-sm text-neutral-500 mt-0.5">
                Download all your entries. JSON includes full metadata and
                re-imports here. Markdown exports one file per entry with YAML
                frontmatter.
              </p>
            </div>
            <ExportSection />
          </div>

          <div className="border-t border-neutral-800" />

          <div>
            <div className="mb-5">
              <h2 className="text-base font-medium text-white">Import</h2>
              <p className="text-sm text-neutral-500 mt-0.5">
                Import from a Fictional Whisper JSON export, a Day One JSON
                export, a single Markdown file, or a zip of Markdown files
                (Obsidian vault).
              </p>
            </div>
            <ImportSection />
          </div>
        </section>
      )}

      {active === "ai" && (
        <section>
          <div className="mb-5">
            <h2 className="text-base font-medium text-white">AI models</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Select which Ollama models to use for text generation and
              embeddings. Only models already pulled in your Ollama instance are
              shown.
            </p>
          </div>
          <AiModelsSettings />
        </section>
      )}

      {active === "templates" && (
        <section>
          <div className="mb-5">
            <h2 className="text-base font-medium text-white">Templates</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Built-in templates are always available. Create your own to save
              custom prompt structures for any journaling practice.
            </p>
          </div>
          <TemplatesSettings />
        </section>
      )}
    </div>
  );
}
