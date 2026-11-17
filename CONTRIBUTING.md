# Contributing

Thanks for helping make procrastination a little more fun to beat! 歡迎任何形式的貢獻。

## Ways to help

- **Themes**: new game styles, or an English / other-language theme. See [docs/THEMING.md](./docs/THEMING.md).
- **Bug reports**: include your OS, whether you use the desktop or web version, and steps to reproduce.
- **Features**: open an issue first to discuss bigger changes.
- **Docs and translations**.

## Development

```bash
npm install
npm run dev          # web version at http://localhost:5173
npm run tauri dev    # desktop app (needs Rust)
npm run build        # type-check + production build: must pass before a PR
```

Please read [AGENTS.md](./AGENTS.md). Its "Invariants" section lists the rules that keep user
data safe:
- local-time dates
- group-aware task lookups
- backward-compatible JSON
- the save-conflict protection

## Pull requests

- Keep PRs focused. Describe what changed and how you tested it.
- Put UI text in `src/theme/strings.ts`, never hard-code it in components.
- Use theme color tokens in Tailwind (`bg-card`, `text-accent` …), never hard-coded colors.
- If you change the data format, add the migration in `src/lib/normalize.ts` and update
  `docs/DATA_FORMAT.md`.
- Never commit personal data (your own `tasks.json` / `profile.json`).

By contributing you agree your work is released under the [MIT License](./LICENSE).
