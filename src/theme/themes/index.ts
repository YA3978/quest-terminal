import type { Theme } from '../types';
import { cyberpunk } from './cyberpunk';
import { fantasy } from './fantasy';
import { tactical } from './tactical';

/**
 * Registered themes, in picker order. To add your own: copy tactical.ts,
 * edit it, import it here and add it to this array. See docs/THEMING.md.
 */
export const themes: Theme[] = [tactical, fantasy, cyberpunk];

export const DEFAULT_THEME_ID = tactical.id;

export function getTheme(id: string | undefined | null): Theme {
  return themes.find((t) => t.id === id) ?? tactical;
}
