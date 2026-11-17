import type { Theme } from '../types';

/** Default theme: military spec-ops HUD, steel teal + neon green. */
export const tactical: Theme = {
  id: 'tactical',
  name: '戰術特勤 Tactical',
  description: '軍事特勤 HUD 風格：鋼青色面板、霓虹綠強調色',
  colors: {
    bg: '#101921',
    panel: 'rgba(23, 36, 47, 0.92)',
    panel2: '#192733',
    card: '#203242',
    cardHover: '#294054',
    cardActive: '#234358',
    line: 'rgba(140, 185, 220, 0.14)',
    accent: '#00e599',
    accentInk: '#04100c',
    warn: '#f59e0b',
    info: '#38bdf8',
    danger: '#ef4444',
    gold: '#fbbf24',
    ink: '#ffffff',
    text: '#d1dde8',
    muted: '#8298ad',
    dim: '#5c7285',
  },
  background:
    'radial-gradient(circle at 75% 35%, rgba(0, 229, 153, 0.04) 0%, transparent 50%), radial-gradient(ellipse at 50% 20%, #253948 0%, #182632 45%, #0e161e 100%)',
  fonts: {
    display: "'Chakra Petch', 'Rajdhani', 'Noto Sans TC', sans-serif",
    mono: "'Rajdhani', 'Chakra Petch', monospace",
    body: "'Noto Sans TC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  radius: '2px',
  ranks: ['戰術新兵', '特勤專員', '戰區菁英', '行動特派長', '傳奇指揮官'],
  terms: {},
};
