# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, Cursor, Copilot, …) working in this repository.
Humans may find it useful too. `CLAUDE.md` points here: this file is the single source of truth.

## What this is

Quest Terminal is a gamified anti-procrastination to-do app. Tasks ("missions") are split into
objectives. Claiming a finished mission pays EXP and credits:
- EXP raises the player's level.
- Credits buy user-defined real-life rewards in a shop.

The app runs as a **Tauri 2 desktop app**, where data is stored as JSON files on disk, and as a
**plain web app**, where data is stored in localStorage. Both modes use the same React frontend.

## Commands

| Task | Command |
|---|---|
| Install | `npm install` |
| Web dev server (http://localhost:5173) | `npm run dev` |
| Desktop dev (needs Rust) | `npm run tauri dev` |
| Type-check | `npm run typecheck` |
| Production web build → `dist/` | `npm run build` |
| Desktop installers | `npm run tauri build` |
| Rust-only check | `cd src-tauri && cargo check` |

There is no test suite yet. Before finishing a change:
1. Run `npm run build`. It type-checks and bundles.
2. Load the app (`npm run dev`) and exercise the UI you touched.

If you change anything under `src-tauri/` or `src/storage/tauriFileStorage.ts`, also run `npm run tauri dev`.

## Architecture

```
src/types.ts            data model: the on-disk JSON format; keep it backward compatible
src/lib/                pure logic, no React / DOM / storage
  gamification.ts       EXP curve, levels, streaks, stats, achievements, daily reset, shop
  tasks.ts              group-aware task lookup (getAllFlatTasks / getTaskById), filters
  normalize.ts          validate + fill defaults for external data (disk, imports, seed)
  date.ts               localDateStr / yesterdayStr; ALL day logic is local time
  audio.ts              Web Audio synthesized SFX
src/storage/            StorageAdapter interface + BrowserStorage + TauriFileStorage
src/state/store.tsx     load → daily maintenance → debounced save; conflict handling; focus re-check
src/state/actions.ts    user actions = store.update(draft mutation) + sound + themed toast
src/theme/              strings.ts (every UI string), themes/*.ts, ThemeProvider (CSS vars + t())
src/components/         React UI; Tailwind utilities mapped to theme CSS variables
public/seed/*.json      first-run sample data
src-tauri/              Rust shell; capabilities/default.json limits fs access to $APPDATA
```

### Data flow

- `store.update(fn)` is **the only way to change data**:
  1. It `structuredClone`s the current state.
  2. `fn` mutates the draft. Use functions from `src/lib/`.
  3. The draft is committed, and a debounced (300 ms) save is scheduled.

  Components never mutate data directly. Add a method to `useActions()` instead.
- Only one save is in flight at a time. Changes made during a save are written right after it.
- **Conflict protection.** Each adapter remembers a revision for its last load or save:
  - Desktop: the mtime+size fingerprint of the three files.
  - Browser: a counter stored in localStorage.

  If the stored data changed outside this window, `save()` returns `conflict`. The store then
  reloads from storage (storage wins) and shows a "redo your last step" toast. If that reload
  fails (for example invalid JSON), **saving stays blocked** until a reload succeeds. Never
  weaken this: it is what makes hand edits and agent edits of the JSON files safe.
- When the window regains focus, the store checks for external changes and then runs
  `runDailyMaintenance`.
- Desktop saves are atomic: write `<file>.tmp`, then rename it over the original. The first
  save of each local day snapshots the previous files into `backup/YYYY-MM-DD/`. Snapshots
  beyond the newest 30 dates are pruned.

### Invariants: don't break these

1. **Local dates.** For "which day is it" logic, use `localDateStr()` / `yesterdayStr()`.
   Never use `toISOString().slice(0, 10)`: that is UTC, and gives the wrong day for hours
   after midnight in UTC+ timezones. Timestamps (`completedAt`, history) are stored as ISO
   UTC strings. Convert them with `localDateStr(new Date(ts))` before comparing days.
2. **Tasks live at two depths.** Top-level tasks and `children` of `isGroup` nodes. Always use
   `getAllFlatTasks` / `getTaskById`. A plain `data.tasks.filter(...)` silently misses every
   main-storyline task.
3. **Objectives are non-empty.** A task can only be claimed when every objective is `done`.
   `normalize.ts` rejects tasks with no objectives.
4. **Stats are capped at 100** (`STAT_CAP`).
5. **`maxExp` is derived from the level:** `calculateMaxExp(level) = floor(1000 * 1.15^(level-1))`.
   `normalize.ts` recomputes it on load.
6. **Achievements need a condition.** An achievement in `profile.json` unlocks only if its `id`
   has an entry in `ACHIEVEMENT_CONDITIONS` (gamification.ts). To add one, append to both
   `DEFAULT_ACHIEVEMENTS` and `ACHIEVEMENT_CONDITIONS`. `normalize.ts` appends new defaults to
   existing profiles automatically.
7. **The JSON format is a public contract.** Users and agents edit these files, and old backups
   must keep importing. Add optional fields only. Never rename or remove fields without a
   migration in `normalize.ts`.
8. **No UI strings in components.** Add a key to `src/theme/strings.ts` and use `t('key')`.
   Themes override wording through `terms`.
9. **No icon libraries or emoji in the UI.** Icons are hand-written SVG paths in
   `src/components/Icon.tsx`.
10. **No `window.alert` / `window.confirm`.** They are unreliable inside Tauri webviews.
    Use `ConfirmDialog` / toasts instead.
11. **Tauri permissions stay minimal.** File access is scoped to `$APPDATA` in
    `src-tauri/capabilities/default.json`. Don't widen it without a clear reason.

## Common tasks

### Add a mission / reward for the user (editing data files)

If the user asks you to add missions or rewards to their **own** data:

1. **Find the data.**
   - Desktop: `%APPDATA%\io.github.quest-terminal\` on Windows,
     `~/Library/Application Support/io.github.quest-terminal/` on macOS,
     `~/.local/share/io.github.quest-terminal/` on Linux.
   - Web: the data is in the browser. Ask the user to export a backup JSON from the app,
     edit that file, and have them import it.
2. **Back up first.** Copy the three JSON files to a sibling folder such as
   `backup/<date>_manual/`, and tell the user where.
3. **Read the file fresh right before editing.** Append to the array, then write the whole file
   back as UTF-8 with 2-space indentation and unescaped non-ASCII characters (in Python:
   `json.dumps(..., ensure_ascii=False, indent=2)`).
4. **Validate.**
   - The file must parse.
   - `id`s must be unique across tasks, group children, and objectives within a task.
   - Every task must have non-empty `objectives`.
   - `type` must be one of `main | side | daily | bounty`.

   Shapes and examples are in [docs/DATA_FORMAT.md](./docs/DATA_FORMAT.md).
5. **Tell the user.** The running app picks the change up when they switch back to its window.

### Change the sample data for new users
Edit `public/seed/*.json`. Seed `profile.json` may leave `achievements` empty, because defaults
are filled in on load.

### Add a theme
See [docs/THEMING.md](./docs/THEMING.md). In short:
1. Copy `src/theme/themes/tactical.ts`.
2. Change the colors, fonts, ranks and `terms`.
3. Register it in `src/theme/themes/index.ts`.
4. If it uses a new web font, add the font to the Google Fonts `<link>` in `index.html`.

### Add a UI string
Add the key with its default zh-TW text to `baseStrings` in `src/theme/strings.ts`. Use it via
`const { t } = useTheme(); t('myKey', { n: 3 })`. Optionally override it in themes.

### Add a game rule
Put the logic in `src/lib/gamification.ts` as a function that takes an `AppData` draft. It
reports what happened as `GameEvent`s, and never touches UI or storage. Wire it up through
`useActions()`.

## Style

- TypeScript strict mode. Prefer small pure functions in `lib/`.
- Tailwind utilities in JSX, using theme tokens:
  `bg-panel bg-card text-ink text-text text-muted border-line text-accent bg-accent/15 font-display font-mono rounded-theme`.
  The few shared component classes (`btn`, `tag`, `form-control`, `panel`, `section-title`)
  live in `src/index.css`.
- Never hard-code colors in components. Add a theme color instead. Themes must keep text
  readable: aim for WCAG AA contrast for `text` and `muted` on `panel` and `card`.
