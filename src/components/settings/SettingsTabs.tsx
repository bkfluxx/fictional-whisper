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
import MoodSettings from "./MoodSettings";
import ErrorLogSection from "./ErrorLogSection";
import ContextWindowSettings from "./ContextWindowSettings";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Tab = "appearance" | "security" | "import-export" | "ai" | "personas" | "templates" | "categories" | "moods" | "advanced";

const TABS: { id: Tab; label: string }[] = [
  { id: "ai", label: "AI settings" },
  { id: "personas", label: "Personas" },
  { id: "appearance", label: "Appearance" },
  { id: "security", label: "Security" },
  { id: "templates", label: "Templates" },
  { id: "categories", label: "Categories" },
  { id: "moods", label: "Moods" },
  { id: "import-export", label: "Import / Export" },
  { id: "advanced", label: "Advanced" },
];

export default function SettingsTabs() {
  const [active, setActive] = useState<Tab>("ai");

  return (
    <Tabs
      value={active}
      onValueChange={(v) => setActive(v as Tab)}
      className="flex flex-col md:flex-row gap-8 items-start"
    >
      {/* Vertical nav — desktop only (plain nav; TabsContent is driven by Tabs root value) */}
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

      {/* Content column (mobile tabs sit above content on small screens) */}
      <div className="flex-1 min-w-0 w-full">
        {/* Mobile: horizontal scrollable tab bar */}
        <div className="md:hidden relative mb-6">
          <TabsList
            variant="line"
            className="flex w-full justify-start h-auto rounded-none bg-transparent p-0 border-b border-border gap-0 overflow-x-auto touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="shrink-0 px-4 py-2.5 rounded-none h-auto flex-none text-foreground/40 hover:text-foreground/80 data-active:text-foreground [&[data-active]]:after:bg-primary after:bottom-0"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {/* Right-edge fade to hint at horizontal scroll */}
          <div className="absolute right-0 top-0 bottom-[1px] w-6 bg-gradient-to-l from-background to-transparent pointer-events-none" />
        </div>

        {/* Tab panels */}
        <div key={active} className="animate-in fade-in slide-in-from-right-4 duration-250">
          <TabsContent value="appearance">
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
          </TabsContent>

          <TabsContent value="security">
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
          </TabsContent>

          <TabsContent value="import-export">
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
          </TabsContent>

          <TabsContent value="ai">
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
          </TabsContent>

          <TabsContent value="personas">
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
          </TabsContent>

          <TabsContent value="templates">
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
          </TabsContent>

          <TabsContent value="categories">
            <section>
              <div className="mb-5">
                <h2 className="text-base font-medium text-foreground">Categories</h2>
                <p className="text-sm text-foreground/40 mt-0.5">
                  Manage your personal categories. These appear alongside built-in categories when tagging journal entries.
                </p>
              </div>
              <CategoriesSettings />
            </section>
          </TabsContent>

          <TabsContent value="moods">
            <section>
              <div className="mb-5">
                <h2 className="text-base font-medium text-foreground">Moods</h2>
                <p className="text-sm text-foreground/40 mt-0.5">
                  Extend the built-in emotion library with your own labels.
                </p>
              </div>
              <MoodSettings />
            </section>
          </TabsContent>

          <TabsContent value="advanced">
            <section className="space-y-10">
              <div>
                <div className="mb-5">
                  <h2 className="text-base font-medium text-foreground">Context window</h2>
                  <p className="text-sm text-foreground/40 mt-0.5">
                    Number of tokens Ollama allocates per request. Covers the system prompt, retrieved journal context, conversation history, and the current message. Increase if the model loses context in long conversations; decrease to reduce memory usage.
                  </p>
                </div>
                <ContextWindowSettings />
              </div>

              <div className="border-t border-border pt-8">
                <div className="mb-5">
                  <h2 className="text-base font-medium text-foreground">Error log</h2>
                  <p className="text-sm text-foreground/40 mt-0.5">
                    Application errors logged since the last container start. Download
                    as a text file to share with support or inspect yourself.
                  </p>
                </div>
                <ErrorLogSection />
              </div>
            </section>
          </TabsContent>
        </div>
      </div>
    </Tabs>
  );
}
