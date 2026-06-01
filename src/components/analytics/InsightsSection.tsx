"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Insight {
  content: string;
  entryCount: number;
  rangeFrom: string;
  rangeTo: string;
  generatedAt: string;
}

interface InsightsSectionProps {
  initial: Insight | null;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgoStr() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function DatePicker({
  label,
  value,
  onChange,
  maxDate,
  minDate,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  maxDate?: string;
  minDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;

  return (
    <div className="flex-1">
      <label className="block text-xs text-foreground/50 mb-1.5">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "w-full h-10 flex items-center gap-2 px-3 text-sm text-left font-normal rounded-xl border border-border bg-background hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !selected && "text-foreground/40",
          )}
        >
          <CalendarIcon className="h-4 w-4 text-foreground/40 shrink-0" />
          {selected ? format(selected, "MMM d, yyyy") : "Pick a date"}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (date) {
                onChange(format(date, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
            disabled={(date) => {
              const iso = format(date, "yyyy-MM-dd");
              if (maxDate && iso > maxDate) return true;
              if (minDate && iso < minDate) return true;
              return false;
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function InsightsSection({ initial }: InsightsSectionProps) {
  const [insight, setInsight] = useState<Insight | null>(initial);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includePrivate, setIncludePrivate] = useState(false);

  const [from, setFrom] = useState(
    initial ? initial.rangeFrom.slice(0, 10) : thirtyDaysAgoStr(),
  );
  const [to, setTo] = useState(
    initial ? initial.rangeTo.slice(0, 10) : todayStr(),
  );

  async function generate() {
    if (!from || !to) return;
    if (from > to) {
      setError("Start date must be before end date.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, includePrivate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate insights");
        return;
      }
      if (data.skipped) {
        setError("No entries found in this date range — try a wider range.");
        return;
      }
      setInsight({
        content: data.content,
        entryCount: data.entryCount,
        rangeFrom: data.rangeFrom,
        rangeTo: data.rangeTo,
        generatedAt: data.generatedAt,
      });
    } catch {
      setError("Something went wrong — is Ollama running?");
    } finally {
      setGenerating(false);
    }
  }

  const hasResult = insight !== null;

  return (
    <section>
      {/* Date range + generate */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-6">
        <DatePicker
          label="From"
          value={from}
          onChange={setFrom}
          maxDate={to || todayStr()}
        />
        <span className="text-foreground/30 text-sm hidden sm:block pb-2.5">→</span>
        <DatePicker
          label="To"
          value={to}
          onChange={setTo}
          minDate={from}
          maxDate={todayStr()}
        />
        <div className="sm:pb-0">
          <div className="hidden sm:block h-5" />{/* label spacer */}
          <button
            onClick={generate}
            disabled={generating || !from || !to}
            className="w-full sm:w-auto h-10 px-5 bg-primary hover:bg-primary/85 disabled:opacity-40 text-primary-foreground text-sm font-medium rounded-xl transition-colors whitespace-nowrap"
          >
            {generating
              ? "Generating…"
              : hasResult
                ? "Regenerate"
                : "Generate insights"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2.5 mb-5">
        <button
          onClick={() => setIncludePrivate((v) => !v)}
          className={`relative inline-flex shrink-0 h-6 w-11 items-center rounded-full transition-colors ${
            includePrivate ? "bg-primary" : "bg-muted"
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            includePrivate ? "translate-x-6" : "translate-x-1"
          }`} />
        </button>
        <span className="text-xs text-foreground/50">Include private entries</span>
      </div>

      {error && (
        <p className="text-sm text-destructive mb-4">{error}</p>
      )}

      {generating && (
        <div className="bg-muted rounded-2xl px-4 py-6 text-center">
          <p className="text-sm text-foreground/40">
            Analysing your entries — this may take a minute…
          </p>
        </div>
      )}

      {!generating && hasResult && (
        <div className="bg-muted rounded-2xl px-5 py-4">
          <p className="text-xs text-foreground/40 mb-3">
            {formatDate(insight.rangeFrom)} → {formatDate(insight.rangeTo)}{" "}
            · {insight.entryCount}{" "}
            {insight.entryCount === 1 ? "entry" : "entries"} analysed
          </p>
          <pre className="whitespace-pre-wrap text-sm text-foreground/80 font-sans leading-relaxed">
            {insight.content}
          </pre>
        </div>
      )}

      {!generating && !hasResult && (
        <p className="text-sm text-foreground/30">
          Select a date range and click &ldquo;Generate insights&rdquo; to discover patterns in your journaling.
        </p>
      )}
    </section>
  );
}
