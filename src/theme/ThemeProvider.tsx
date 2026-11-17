import { createContext, useContext, useLayoutEffect, useMemo, type ReactNode } from 'react';
import { baseStrings, type StringKey } from './strings';
import { getTheme } from './themes';
import type { Theme, ThemeColors } from './types';

type Params = Record<string, string | number>;

export interface ThemeApi {
  theme: Theme;
  /** Look up a UI string (theme override → default) and fill {placeholders}. */
  t: (key: StringKey, params?: Params) => string;
  /** Rank title for a level, from the theme's `ranks`. */
  rank: (tier: number) => string;
  /** Achievement display name (theme override → name stored in the profile). */
  achievementName: (id: string, fallback: string) => string;
}

const ThemeContext = createContext<ThemeApi | null>(null);

/** camelCase color key → CSS variable name: cardHover → --c-card-hover */
const cssVar = (key: string) => `--c-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;

export function applyTheme(theme: Theme) {
  const root = document.documentElement.style;
  (Object.keys(theme.colors) as (keyof ThemeColors)[]).forEach((k) => root.setProperty(cssVar(k), theme.colors[k]));
  root.setProperty('--app-background', theme.background);
  root.setProperty('--f-display', theme.fonts.display);
  root.setProperty('--f-mono', theme.fonts.mono);
  root.setProperty('--f-body', theme.fonts.body);
  root.setProperty('--radius', theme.radius);
  document.documentElement.dataset.theme = theme.id;
}

export function ThemeProvider({ themeId, children }: { themeId: string | undefined; children: ReactNode }) {
  const theme = getTheme(themeId);

  useLayoutEffect(() => {
    applyTheme(theme);
    document.title = `${theme.terms.appTitle ?? baseStrings.appTitle} // ${theme.terms.appSubtitle ?? baseStrings.appSubtitle}`;
  }, [theme]);

  const api = useMemo<ThemeApi>(() => {
    const strings = { ...baseStrings, ...theme.terms };
    const fill = (s: string, params: Params) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
    return {
      theme,
      t: (key, params = {}) => fill(strings[key] ?? key, { currencyName: strings.currencyName, ...params }),
      rank: (tier) => theme.ranks[Math.max(0, Math.min(theme.ranks.length - 1, tier))],
      achievementName: (id, fallback) => theme.achievementNames?.[id] ?? fallback,
    };
  }, [theme]);

  return <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeApi {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
