import type { Strings } from './strings';

/**
 * A theme = colors + fonts + wording. Colors become CSS variables on :root
 * (see ThemeProvider), which the Tailwind utilities in src/index.css map to
 * (`bg-panel`, `text-accent`, `border-line` …). So a theme never needs to touch
 * component code. Full guide: docs/THEMING.md
 */
export interface ThemeColors {
  /** Page background (solid fallback; see `background` for gradients) */
  bg: string;
  /** Large panels (slightly transparent works well over the background) */
  panel: string;
  /** Subtle inset areas inside panels */
  panel2: string;
  /** Cards, inputs, list items */
  card: string;
  cardHover: string;
  /** Selected card */
  cardActive: string;
  /** Subtle borders / dividers */
  line: string;
  /** Primary accent: selection, progress, primary buttons, "main" tag */
  accent: string;
  /** Text color used ON the accent color (primary button label) */
  accentInk: string;
  /** Secondary accent: "side" tag, streak */
  warn: string;
  /** Tertiary accent: "daily" tag, info */
  info: string;
  danger: string;
  /** Currency color */
  gold: string;
  /** Headings / strongest text */
  ink: string;
  /** Body text */
  text: string;
  muted: string;
  dim: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  /** CSS `background` for the page — gradients, patterns, url(...) */
  background: string;
  fonts: {
    /** Headings, buttons, tabs */
    display: string;
    /** Numbers, counters */
    mono: string;
    /** Body text */
    body: string;
  };
  /** Corner radius for cards/buttons, e.g. '2px' (sharp HUD) or '10px' (soft) */
  radius: string;
  /** Rank title for each tier — tiers start at levels 1, 6, 16, 31, 51 */
  ranks: [string, string, string, string, string];
  /** Optional rename of the built-in achievements, keyed by achievement id */
  achievementNames?: Record<string, string>;
  /** Override any UI string (see strings.ts for all keys) */
  terms: Partial<Strings>;
}
