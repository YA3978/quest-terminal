# CLAUDE.md

Read **[AGENTS.md](./AGENTS.md)** first. It is the single source of truth for commands,
architecture, invariants, and common tasks in this repo, and is shared with other AI agents.

Claude-specific notes:

- Before saying a change is done, run `npm run build`. It type-checks and bundles.
- For UI changes, run `npm run dev`, open http://localhost:5173 and exercise the change.
  For browser testing, use a separate origin or clear its localStorage afterwards, so test
  data never mixes with the user's real data.
- Do not open, read, or edit the user's real data folder (`%APPDATA%\io.github.quest-terminal\`
  and the equivalents on other OSes) unless they ask you to. When they ask you to add missions
  or rewards there, follow the "Add a mission / reward for the user" procedure in AGENTS.md:
  back up, read fresh, write, validate.
- Keep the JSON data format backward compatible (AGENTS.md, invariant 7).
