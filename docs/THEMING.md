# Theming guide / 主題客製化指南

Make Quest Terminal look and *talk* like your favorite game. A theme controls three things:

1. **Colors and atmosphere**: panels, accents, and the page background (gradients and images allowed).
2. **Fonts**: heading, number, and body fonts.
3. **Wording**: every label in the UI. Missions can become *quests*, credits can become *gold*,
   the shop can become a *tavern*, and the rank titles and achievement names are yours to rename.

Themes are plain TypeScript objects. You don't touch any component code.

Built-in themes, in `src/theme/themes/`:

| id | Style |
|---|---|
| `tactical` | Military spec-ops HUD: steel teal and neon green. This is the default. |
| `fantasy` | Adventurer's guild RPG: quests, gold, a tavern. |
| `cyberpunk` | Netrunner gigs: neon magenta and cyan, eddies. |

Users switch themes in **Profile → Settings → Theme**. The choice is saved in `profile.json`
(the `"theme"` field).

---

## 1. Create your theme (5 minutes)

```bash
cp src/theme/themes/tactical.ts src/theme/themes/mytheme.ts
```

Edit `mytheme.ts`:

```ts
import type { Theme } from '../types';

export const mytheme: Theme = {
  id: 'mytheme',                    // unique, stored in profile.json
  name: '我的主題 My Theme',          // shown in the theme picker
  description: '一句話描述風格',
  colors: {
    bg: '#0f1020',                  // page background (solid fallback)
    panel: 'rgba(25, 26, 50, 0.92)',// large panels
    panel2: '#1a1b36',              // inset areas, header bar
    card: '#24254a',                // cards, inputs, list items
    cardHover: '#2e2f5c',
    cardActive: '#33346a',          // selected card
    line: 'rgba(180, 180, 255, 0.15)', // borders / dividers
    accent: '#7c9cff',              // primary accent: selection, progress, main buttons
    accentInk: '#0b0d1f',           // text drawn ON the accent color
    warn: '#ffb454',                // "side" tag, streak
    info: '#5ce1e6',                // "daily" tag
    danger: '#ff5c7a',
    gold: '#ffd166',                // currency
    ink: '#ffffff',                 // headings
    text: '#d6d8ff',                // body text
    muted: '#8f92c9',               // secondary text
    dim: '#5f6299',                 // disabled / hints
  },
  background: 'radial-gradient(ellipse at 50% 20%, #23244a 0%, #0f1020 70%)',
  fonts: {
    display: "'Press Start 2P', 'Noto Sans TC', sans-serif",
    mono: "'VT323', monospace",
    body: "'Noto Sans TC', system-ui, sans-serif",
  },
  radius: '6px',                    // '0px' = sharp HUD, '12px' = soft and friendly
  ranks: ['Lv.1-5 稱號', 'Lv.6-15 稱號', 'Lv.16-30 稱號', 'Lv.31-50 稱號', 'Lv.51+ 稱號'],
  achievementNames: {               // optional: rename the built-in achievements
    ach_first_blood: '新手村畢業',
  },
  terms: {                          // optional: override any UI string (see below)
    tabMissions: '任務',
    tabShop: '道具屋',
    currencyName: '金幣',
    currencyUnit: 'G',
  },
};
```

Register it in `src/theme/themes/index.ts`:

```ts
import { mytheme } from './mytheme';
export const themes: Theme[] = [tactical, fantasy, cyberpunk, mytheme];
```

To make it the default for new users, set `"theme": "mytheme"` in `public/seed/profile.json`.

### Fonts
Themes reference fonts by CSS name. To use a Google Font, add it to the `<link>` in the root
`index.html`. To work fully offline, put `.woff2` files in `public/fonts/` and add `@font-face`
rules to `src/index.css`. The desktop app's CSP allows `fonts.googleapis.com` and `fonts.gstatic.com`.

### Background images
`background` is any CSS `background` value. You can put an image in `public/`:
```ts
background: "linear-gradient(rgba(0,0,0,.6), rgba(0,0,0,.6)), url('./bg/castle.jpg') center / cover",
```

### Readability checklist
- `text` and `muted` need enough contrast on both `panel` and `card`. Aim for WCAG AA:
  4.5:1 for `text`, at least 3:1 for `muted`.
- `accentInk` must be readable on `accent`, because it's the primary button label.
- Use the opacity in `panel` to let the background show through slightly. Keep it at or above 0.85.

---

## 2. Wording: every string is overridable

`src/theme/strings.ts` lists every UI string, about 150 keys, with the default text in
Traditional Chinese. Put any key in your theme's `terms` to replace it. Placeholders in
`{braces}` are filled at runtime. Keep them in your text:

| Key | Default | Placeholders |
|---|---|---|
| `toastClaim` | 行動結算成功！獲得 +{exp} EXP 與 +{credits} {currencyName} | exp, credits, currencyName |
| `toastLevelUp` | 升級！晉升至 Lv.{level}【{rank}】！ | level, rank |
| `groupCount` | {n} 個子行動 | n |
| `claimInProgress` | 任務進行中 ({done}/{total}) | done, total |

**Translating the UI** works the same way. An English theme is a theme whose `terms` override
every key. Share yours, and it can ship as a built-in!

What themes can't rename is the **data** itself. Task titles, objectives, and reward names are
the user's own data, in `tasks.json` and `rewards.json`.

---

## 3. Let an AI build a theme for you

Paste this into Claude Code, Codex, Cursor or any coding agent, opened in this repo:

> Read AGENTS.md and docs/THEMING.md. Create a new theme in `src/theme/themes/` inspired by
> **〈your game / mood here, e.g. "a cozy farming sim", "a space-station sci-fi console",
> "a Japanese-style RPG menu"〉**.
> Use an original color palette with good contrast (WCAG AA for body text), pick free Google
> Fonts that fit the mood (add them to index.html), write rank titles for the 5 tiers, rename the
> achievements, and override the `terms` so all labels fit the setting (in Traditional Chinese).
> Register it in `themes/index.ts`, run `npm run build`, and tell me how to switch to it.

Tip: describe a *mood or genre* rather than copying a specific commercial game's logo, art or
exact UI. Original themes are safer to share publicly.

---

## 4. Going further

If you want to change layout or structure, not just style, edit the components in
`src/components/`. They use Tailwind utilities wired to the theme variables:

| Utility | Theme value |
|---|---|
| `bg-panel`, `bg-panel2`, `bg-card`, `bg-card-hover`, `bg-card-active` | panels and cards |
| `text-ink`, `text-text`, `text-muted`, `text-dim` | text levels |
| `text-accent`, `bg-accent/15`, `border-accent` | accent (opacity modifiers work) |
| `text-warn`, `text-info`, `text-danger`, `text-gold` | secondary colors |
| `border-line` | dividers |
| `font-display`, `font-mono`, `font-body` | theme fonts |
| `rounded-theme` | theme corner radius |

Each theme's id is also set as `<html data-theme="…">`. You can write theme-specific CSS in
`src/index.css`, for example `[data-theme='fantasy'] .panel { … }`, for effects like borders,
textures or scanlines.

---

## 中文快速說明

1. 複製 `src/theme/themes/tactical.ts` 成新檔，修改 `id`、`name`、`colors`（顏色）、
   `fonts`（字型）、`ranks`（五階稱號）、`achievementNames`（成就名稱）、`terms`（介面用詞）。
2. 在 `src/theme/themes/index.ts` 的 `themes` 陣列加入你的主題。
3. 用到新的 Google 字型，就加到根目錄 `index.html` 的 `<link>`。
4. `npm run dev` 後到「個人檔案 → 設定 → 介面主題」切換。

所有介面文字都在 `src/theme/strings.ts`，任何一個 key 都能在主題的 `terms` 裡覆寫。
`{exp}` 這類大括號是執行時才會填入的變數，請保留在你的文字裡。也可以直接把上方第 3 節的提示詞貼給 AI agent，讓它幫你做一個主題。
