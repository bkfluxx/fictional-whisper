"use client";

import { useState } from "react";
import PasswordChangeForm from "./PasswordChangeForm";
import ExportSection from "./ExportSection";
import ImportSection from "./ImportSection";
import AiModelsSettings from "./AiModelsSettings";
import TemplatesSettings from "./TemplatesSettings";
import ThemeSettings from "./ThemeSettings";

type Tab = "appearance" | "security" | "import-export" | "ai" | "templates";

const TABS: { id: Tab; label: string }[] = [
  { id: "appearance", label: "Appearance" },
  { id: "security", label: "Security" },
  { id: "import-export", label: "Import / Export" },
  { id: "ai", label: "AI settings" },
  { id: "templates", label: "Templates" },
];

export default function SettingsTabs() {
  const [active, setActive] = useState<Tab>("appearance");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-base-200 mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              active === tab.id
                ? "border-indigo-500 text-base-content"
                : "border-transparent text-base-content/40 hover:text-base-content/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {active === "appearance" && (
        <section>
          <div className="mb-6">
            <h2 className="text-base font-medium text-base-content">Theme</h2>
            <p className="text-sm text-base-content/40 mt-0.5">
              Choose a color theme. "System" follows your OS light / dark preference.
            </p>
          </div>
          <ThemeSettings />
        </section>
      )}

      {active === "security" && (
        <section className="space-y-4">
          <div className="mb-5">
            <h2 className="text-base font-medium text-base-content">Security</h2>
            <p className="text-sm text-base-content/40 mt-0.5">
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
              <h2 className="text-base font-medium text-base-content">Export</h2>
              <p className="text-sm text-base-content/40 mt-0.5">
                Download all your entries. JSON includes full metadata and
                re-imports here. Markdown exports one file per entry with YAML
                frontmatter.
              </p>
            </div>
            <ExportSection />
          </div>

          <div className="border-t border-base-200" />

          <div>
            <div className="mb-5">
              <h2 className="text-base font-medium text-base-content">Import</h2>
              <p className="text-sm text-base-content/40 mt-0.5">
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
            <h2 className="text-base font-medium text-base-content">AI models</h2>
            <p className="text-sm text-base-content/40 mt-0.5">
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
            <h2 className="text-base font-medium text-base-content">Templates</h2>
            <p className="text-sm text-base-content/40 mt-0.5">
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
