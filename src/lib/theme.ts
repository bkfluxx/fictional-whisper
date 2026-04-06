/**
 * Aura color palette system.
 *
 * Presets (olive, ocean, rose, amber, teal, violet) are defined by four
 * parameters each. A shared buildVars() function turns those into full
 * Shadcn CSS variable sets for both light and dark mode.
 *
 * For the Custom palette, the user picks three hex colors (base, theme,
 * chart). Each is converted to OKLCH to extract hue/chroma/lightness and
 * the same buildVars() path is used.
 *
 * applyColorPalette() injects an override <style> tag and persists the
 * serialised CSS so the beforeInteractive anti-flash script can restore
 * it on the next page load.
 */

export type PaletteId =
  | "olive"
  | "ocean"
  | "rose"
  | "amber"
  | "teal"
  | "violet"
  | "custom";

export type DensityId = "compact" | "balanced" | "spacious";

export interface ColorThemeState {
  preset: PaletteId;
  // Only used when preset === 'custom'
  customBase?: string;  // hex
  customTheme?: string; // hex
  customChart?: string; // hex
}

export const COLOR_THEME_KEY = "aura-color-theme";
export const COLOR_CSS_KEY = "aura-palette-css";
export const DENSITY_KEY = "aura-density";

// ─── Number helpers ───────────────────────────────────────────────────────────

function f(n: number, d = 3) {
  return +n.toFixed(d);
}

// ─── CSS variable builder ─────────────────────────────────────────────────────

type CssVars = Record<string, string>;

function buildVars(
  baseH: number,
  baseC: number,
  themeL: number,
  themeC: number,
  themeH: number,
  chartH: number,
): { light: CssVars; dark: CssVars } {
  const bc = baseC;
  const darkPL = f(Math.min(themeL + 0.06, 0.75));
  // Light foreground on primary unless primary is very light (amber/yellow)
  const pfg = themeL > 0.65 ? "oklch(0.10 0 0)" : "oklch(0.98 0 0)";

  // Chart hue ring
  const ch = (o: number) => Math.round((chartH + o + 720) % 360);

  const light: CssVars = {
    "--background":              `oklch(0.99 ${f(bc * 0.4)} ${baseH})`,
    "--foreground":              `oklch(0.13 ${f(bc * 0.6)} ${baseH})`,
    "--card":                    `oklch(1 0 0)`,
    "--card-foreground":         `oklch(0.13 ${f(bc * 0.6)} ${baseH})`,
    "--popover":                 `oklch(1 0 0)`,
    "--popover-foreground":      `oklch(0.13 ${f(bc * 0.6)} ${baseH})`,
    "--primary":                 `oklch(${f(themeL)} ${f(themeC)} ${themeH})`,
    "--primary-foreground":      pfg,
    "--secondary":               `oklch(0.95 ${f(bc * 0.5)} ${baseH})`,
    "--secondary-foreground":    `oklch(0.20 ${f(bc * 0.5)} ${baseH})`,
    "--muted":                   `oklch(0.94 ${f(bc * 0.4)} ${baseH})`,
    "--muted-foreground":        `oklch(0.48 ${f(bc * 0.3)} ${baseH})`,
    "--accent":                  `oklch(0.94 ${f(bc * 0.4)} ${baseH})`,
    "--accent-foreground":       `oklch(0.20 ${f(bc * 0.5)} ${baseH})`,
    "--destructive":             "oklch(0.577 0.245 27.325)",
    "--border":                  `oklch(0.91 ${f(bc * 0.3)} ${baseH})`,
    "--input":                   `oklch(0.91 ${f(bc * 0.3)} ${baseH})`,
    "--ring":                    `oklch(${f(themeL)} ${f(themeC)} ${themeH})`,
    "--chart-1":                 `oklch(0.62 ${f(themeC * 0.85)} ${ch(0)})`,
    "--chart-2":                 `oklch(0.70 ${f(themeC * 0.70)} ${ch(40)})`,
    "--chart-3":                 `oklch(0.55 ${f(themeC * 0.80)} ${ch(-30)})`,
    "--chart-4":                 `oklch(0.78 ${f(themeC * 0.60)} ${ch(80)})`,
    "--chart-5":                 `oklch(0.50 ${f(themeC * 0.90)} ${ch(150)})`,
    "--sidebar":                 `oklch(0.97 ${f(bc * 0.35)} ${baseH})`,
    "--sidebar-foreground":      `oklch(0.13 ${f(bc * 0.6)} ${baseH})`,
    "--sidebar-primary":         `oklch(${f(themeL)} ${f(themeC)} ${themeH})`,
    "--sidebar-primary-foreground": pfg,
    "--sidebar-accent":          `oklch(0.94 ${f(bc * 0.4)} ${baseH})`,
    "--sidebar-accent-foreground": `oklch(0.13 ${f(bc * 0.6)} ${baseH})`,
    "--sidebar-border":          `oklch(0.91 ${f(bc * 0.3)} ${baseH})`,
    "--sidebar-ring":            `oklch(${f(themeL)} ${f(themeC)} ${themeH})`,
  };

  const dark: CssVars = {
    "--background":              `oklch(0.14 ${f(bc * 0.5)} ${baseH})`,
    "--foreground":              `oklch(0.95 ${f(bc * 0.1)} ${baseH})`,
    "--card":                    `oklch(0.19 ${f(bc * 0.5)} ${baseH})`,
    "--card-foreground":         `oklch(0.95 ${f(bc * 0.1)} ${baseH})`,
    "--popover":                 `oklch(0.19 ${f(bc * 0.5)} ${baseH})`,
    "--popover-foreground":      `oklch(0.95 ${f(bc * 0.1)} ${baseH})`,
    "--primary":                 `oklch(${darkPL} ${f(themeC)} ${themeH})`,
    "--primary-foreground":      "oklch(0.98 0 0)",
    "--secondary":               `oklch(0.26 ${f(bc * 0.5)} ${baseH})`,
    "--secondary-foreground":    `oklch(0.85 ${f(bc * 0.1)} ${baseH})`,
    "--muted":                   `oklch(0.26 ${f(bc * 0.5)} ${baseH})`,
    "--muted-foreground":        `oklch(0.62 ${f(bc * 0.1)} ${baseH})`,
    "--accent":                  `oklch(0.26 ${f(bc * 0.5)} ${baseH})`,
    "--accent-foreground":       `oklch(0.95 ${f(bc * 0.1)} ${baseH})`,
    "--destructive":             "oklch(0.704 0.191 22.216)",
    "--border":                  "oklch(1 0 0 / 10%)",
    "--input":                   "oklch(1 0 0 / 12%)",
    "--ring":                    `oklch(${darkPL} ${f(themeC)} ${themeH})`,
    "--chart-1":                 `oklch(0.68 ${f(themeC * 0.80)} ${ch(0)})`,
    "--chart-2":                 `oklch(0.74 ${f(themeC * 0.65)} ${ch(40)})`,
    "--chart-3":                 `oklch(0.60 ${f(themeC * 0.75)} ${ch(-30)})`,
    "--chart-4":                 `oklch(0.80 ${f(themeC * 0.55)} ${ch(80)})`,
    "--chart-5":                 `oklch(0.55 ${f(themeC * 0.85)} ${ch(150)})`,
    "--sidebar":                 `oklch(0.19 ${f(bc * 0.5)} ${baseH})`,
    "--sidebar-foreground":      `oklch(0.95 ${f(bc * 0.1)} ${baseH})`,
    "--sidebar-primary":         `oklch(${darkPL} ${f(themeC)} ${themeH})`,
    "--sidebar-primary-foreground": "oklch(0.98 0 0)",
    "--sidebar-accent":          `oklch(0.26 ${f(bc * 0.5)} ${baseH})`,
    "--sidebar-accent-foreground": `oklch(0.95 ${f(bc * 0.1)} ${baseH})`,
    "--sidebar-border":          "oklch(1 0 0 / 10%)",
    "--sidebar-ring":            `oklch(${darkPL} ${f(themeC)} ${themeH})`,
  };

  return { light, dark };
}

// ─── Preset definitions ───────────────────────────────────────────────────────

interface PresetDef {
  baseH: number;
  baseC: number;
  themeL: number;
  themeC: number;
  themeH: number;
  chartH: number;
}

const PRESET_DEFS: Record<Exclude<PaletteId, "custom">, PresetDef> = {
  olive:  { baseH: 120, baseC: 0.04, themeL: 0.50, themeC: 0.14, themeH: 142, chartH: 152 },
  ocean:  { baseH: 260, baseC: 0.02, themeL: 0.54, themeC: 0.22, themeH: 264, chartH: 220 },
  rose:   { baseH: 10,  baseC: 0.04, themeL: 0.60, themeC: 0.22, themeH: 350, chartH: 27  },
  amber:  { baseH: 85,  baseC: 0.05, themeL: 0.68, themeC: 0.18, themeH: 60,  chartH: 95  },
  teal:   { baseH: 185, baseC: 0.04, themeL: 0.62, themeC: 0.16, themeH: 200, chartH: 155 },
  violet: { baseH: 295, baseC: 0.03, themeL: 0.54, themeC: 0.24, themeH: 303, chartH: 285 },
};

export interface PalettePreset {
  id: PaletteId;
  label: string;
  description: string;
  swatches: [string, string, string]; // bg, primary, chart-1
}

export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: "olive",
    label: "Olive",
    description: "Olive · Green · Emerald",
    swatches: ["oklch(0.97 0.014 120)", "oklch(0.50 0.14 142)", "oklch(0.62 0.119 152)"],
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Slate · Blue · Sky",
    swatches: ["oklch(0.97 0.007 260)", "oklch(0.54 0.22 264)", "oklch(0.62 0.187 220)"],
  },
  {
    id: "rose",
    label: "Rose",
    description: "Rose · Pink · Red",
    swatches: ["oklch(0.97 0.016 10)", "oklch(0.60 0.22 350)", "oklch(0.62 0.187 27)"],
  },
  {
    id: "amber",
    label: "Amber",
    description: "Amber · Orange · Yellow",
    swatches: ["oklch(0.97 0.020 85)", "oklch(0.68 0.18 60)", "oklch(0.62 0.153 95)"],
  },
  {
    id: "teal",
    label: "Teal",
    description: "Teal · Cyan · Emerald",
    swatches: ["oklch(0.97 0.016 185)", "oklch(0.62 0.16 200)", "oklch(0.62 0.136 155)"],
  },
  {
    id: "violet",
    label: "Violet",
    description: "Violet · Purple · Indigo",
    swatches: ["oklch(0.97 0.012 295)", "oklch(0.54 0.24 303)", "oklch(0.62 0.204 285)"],
  },
  {
    id: "custom",
    label: "Custom",
    description: "Pick your own colors",
    swatches: ["oklch(0.97 0 0)", "oklch(0.50 0.15 200)", "oklch(0.62 0.12 180)"],
  },
];

// ─── Hex → OKLCH conversion ───────────────────────────────────────────────────

export function hexToOklch(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // sRGB → linear
  const lin = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const lr = lin(r), lg = lin(g), lb = lin(b);

  // Linear RGB → OKLab
  const lc = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const mc = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const sc = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * lc + 0.7936177850 * mc - 0.0040720468 * sc;
  const a = 1.9779984951 * lc - 2.4285922050 * mc + 0.4505937099 * sc;
  const bv = 0.0259040371 * lc + 0.7827717662 * mc - 0.8086757660 * sc;

  const C = Math.sqrt(a * a + bv * bv);
  const H = Math.atan2(bv, a) * (180 / Math.PI);

  return [L, C, H < 0 ? H + 360 : H];
}

// ─── Apply palette ────────────────────────────────────────────────────────────

function buildCssString(vars: { light: CssVars; dark: CssVars }): string {
  const lr = Object.entries(vars.light).map(([k, v]) => `  ${k}: ${v};`).join("\n");
  const dr = Object.entries(vars.dark).map(([k, v]) => `  ${k}: ${v};`).join("\n");
  return `:root {\n${lr}\n}\n.dark {\n${dr}\n}`;
}

export function applyColorPalette(state: ColorThemeState) {
  let vars: { light: CssVars; dark: CssVars } | null = null;

  if (state.preset === "custom") {
    const base  = state.customBase  ?? "#4a7c59";
    const theme = state.customTheme ?? "#2d7a4f";
    const chart = state.customChart ?? "#3aa876";
    const [, , baseH] = hexToOklch(base);
    const [themeL, themeC, themeH] = hexToOklch(theme);
    const [, , chartH] = hexToOklch(chart);
    vars = buildVars(baseH, 0.04, Math.max(themeL, 0.35), Math.max(themeC, 0.08), themeH, chartH);
  } else {
    const d = PRESET_DEFS[state.preset];
    vars = buildVars(d.baseH, d.baseC, d.themeL, d.themeC, d.themeH, d.chartH);
  }

  const css = buildCssString(vars);

  // Inject or update override <style> tag
  const id = "aura-palette";
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = css;

  // Persist for anti-flash restore on next load
  try {
    localStorage.setItem(COLOR_THEME_KEY, JSON.stringify(state));
    localStorage.setItem(COLOR_CSS_KEY, css);
  } catch (_) { /* storage full */ }
}

// ─── Density ──────────────────────────────────────────────────────────────────

export function applyDensity(density: DensityId) {
  document.documentElement.setAttribute("data-density", density);
  try {
    localStorage.setItem(DENSITY_KEY, density);
  } catch (_) { /* */ }
}

export function loadSavedDensity(): DensityId {
  try {
    const saved = localStorage.getItem(DENSITY_KEY);
    if (saved === "compact" || saved === "balanced" || saved === "spacious") return saved;
  } catch (_) { /* */ }
  return "spacious"; // default
}

export function loadSavedColorTheme(): ColorThemeState {
  try {
    const saved = localStorage.getItem(COLOR_THEME_KEY);
    if (saved) return JSON.parse(saved) as ColorThemeState;
  } catch (_) { /* */ }
  return { preset: "olive" };
}
