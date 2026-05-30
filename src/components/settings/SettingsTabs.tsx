"use client";

import { useState } from "react";
import PasswordChangeForm from "./PasswordChangeForm";
import TwoFactorSettings from "./TwoFactorSettings";
import RecoveryCodeSettings from "./RecoveryCodeSettings";
import ExportSection from "./ExportSection";
import ImportSection from "./ImportSection";
import AiModelsSettings from "./AiModelsSettings";
import TemplatesSettings from "./TemplatesSettings";
import ThemeSettings from "./ThemeSettings";
import FontScaleSettings from "./FontScaleSettings";
import ColorThemeSettings from "./ColorThemeSettings";
import DensitySettings from "./DensitySettings";
import CategoriesSettings from "./CategoriesSettings";
import PersonasSettings from "./PersonasSettings";
import ErrorLogSection from "./ErrorLogSection";

type Tab = "appearance" | "security" | "import-export" | "ai" | "personas" | "templates" | "categories" | "advanced";

const TABS: { id: Tab; label: string }[] = [
  { id: "ai", label: "AI settings" },
  { id: "personas", label: "Personas" },
  { id: "appearance", label: "Appearance" },
  { id: "security", label: "Security" },
  { id: "templates", label: "Templates" },
  { id: "categories", label: "Categories" },
  { id: "import-export", label: "Import / Export" },
  { id: "advanced", label: "Advanced" },
];

export default function SettingsTabs() {
  const [active, setActive] = useState<Tab>("ai");

  return (
    <div className="flex gap-8 items-start">
      {/* Vertical nav */}
      <nav className="hidden md:flex flex-col w-44 shrink-0 gap-0.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              active === tab.id
                ? "bg-foreground/8 text-foreground font-medium"
                : "text-foreground/50 hover:text-foreground hover:bg-foreground/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Mobile: horizontal scrollable tab bar */}
      <div className="flex md:hidden border-b border-border mb-6 overflow-x-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              active === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-foreground/40 hover:text-foreground/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content panel */}
      <div className="flex-1 min-w-0">

      {/* Tab panels */}
      {active === "appearance" && (
        <section className="space-y-10">
          {/* Light / dark / system */}
          <div>
            <div className="mb-6">
              <h2 className="text-base font-medium text-foreground">Light / Dark mode</h2>
              <p className="text-sm text-foreground/40 mt-0.5">
                System follows your OS preference. Switch anytime.
              </p>
            </div>
            <ThemeSettings />
          </div>

          {/* Color palette */}
          <div className="border-t border-border pt-8">
            <div className="mb-6">
              <h2 className="text-base font-medium text-foreground">Color palette</h2>
              <p className="text-sm text-foreground/40 mt-0.5">
                Pick a preset or build a custom palette. Changes apply instantly.
              </p>
            </div>
            <ColorThemeSettings />
          </div>

          {/* Density */}
          <div className="border-t border-border pt-8">
            <div className="mb-6">
              <h2 className="text-base font-medium text-foreground">Density</h2>
              <p className="text-sm text-foreground/40 mt-0.5">
                Controls spacing and padding throughout the app.
              </p>
            </div>
            <DensitySettings />
          </div>

          {/* Font size */}
          <div className="border-t border-border pt-8">
            <div className="mb-6">
              <h2 className="text-base font-medium text-foreground">Text size</h2>
              <p className="text-sm text-foreground/40 mt-0.5">
                Adjust the base font size across the entire app.
              </p>
            </div>
            <FontScaleSettings />
          </div>
        </section>
      )}

      {active === "security" && (
        <section className="space-y-8">
          <div>
            <div className="mb-5">
              <h2 className="text-base font-medium text-foreground">Password</h2>
              <p className="text-sm text-foreground/40 mt-0.5">
                Changing your password re-wraps your encryption key. Your entries
                stay decryptable and your session stays active.
              </p>
            </div>
            <PasswordChangeForm />
          </div>

          <div className="border-t border-border pt-6">
            <div className="mb-5">
              <h2 className="text-base font-medium text-foreground">Two-factor authentication</h2>
              <p className="text-sm text-foreground/40 mt-0.5">
                Add a second factor to your login. You will need an authenticator
                app (Google Authenticator, Authy, 1Password, etc.).
              </p>
            </div>
            <TwoFactorSettings />
          </div>

          <div className="border-t border-border pt-6">
            <div className="mb-5">
              <h2 className="text-base font-medium text-foreground">Recovery code</h2>
              <p className="text-sm text-foreground/40 mt-0.5">
                If you forget your password, a recovery code lets you set a new one
                without losing your journal data.
              </p>
            </div>
            <RecoveryCodeSettings />
          </div>
        </section>
      )}

      {active === "import-export" && (
        <section className="space-y-10">
          <div>
            <div className="mb-5">
              <h2 className="text-base font-medium text-foreground">Export</h2>
              <p className="text-sm text-foreground/40 mt-0.5">
                Download all your entries. JSON includes full metadata and
                re-imports here. Markdown exports one file per entry with YAML
                frontmatter.
              </p>
            </div>
            <ExportSection />
          </div>

          <div className="border-t border-border" />

          <div>
            <div className="mb-5">
              <h2 className="text-base font-medium text-foreground">Import</h2>
              <p className="text-sm text-foreground/40 mt-0.5">
                Import from an Aura JSON export, a Day One JSON
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
            <h2 className="text-base font-medium text-foreground">AI models</h2>
            <p className="text-sm text-foreground/40 mt-0.5">
              Select which Ollama models to use for text generation and
              embeddings. Only models already pulled in your Ollama instance are
              shown.
            </p>
          </div>
          <AiModelsSettings />
        </section>
      )}

      {active === "personas" && (
        <section>
          <div className="mb-5">
            <h2 className="text-base font-medium text-foreground">Personas</h2>
            <p className="text-sm text-foreground/40 mt-0.5">
              Choose an AI persona to shape the tone of chat, mood analysis, and writing prompts.
              Pick from built-in personas or create your own with a custom system prompt.
            </p>
          </div>
          <PersonasSettings />
        </section>
      )}

      {active === "templates" && (
        <section>
          <div className="mb-5">
            <h2 className="text-base font-medium text-foreground">Templates</h2>
            <p className="text-sm text-foreground/40 mt-0.5">
              Built-in templates are always available. Create your own to save
              custom prompt structures for any journaling practice.
            </p>
          </div>
          <TemplatesSettings />
        </section>
      )}

      {active === "advanced" && (
        <section>
          <div className="mb-5">
            <h2 className="text-base font-medium text-foreground">Error log</h2>
            <p className="text-sm text-foreground/40 mt-0.5">
              Application errors logged since the last container start. Download
              as a text file to share with support or inspect yourself.
            </p>
          </div>
          <ErrorLogSection />
        </section>
      )}

      {active === "categories" && (
        <section>
          <div className="mb-5">
            <h2 className="text-base font-medium text-foreground">Categories</h2>
            <p className="text-sm text-foreground/40 mt-0.5">
              Manage your personal categories. These appear alongside built-in categories when tagging journal entries.
            </p>
          </div>
          <CategoriesSettings />
        </section>
      )}
      </div>
    </div>
  );
}
