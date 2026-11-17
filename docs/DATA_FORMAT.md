# Data format / 資料格式

All data lives in three JSON files: `tasks.json`, `profile.json`, and `rewards.json`.
- **Desktop**: they are real files in the app-data folder. See the README for the path.
- **Web**: they are stored together in localStorage. The backup dialog exports and imports them
  as one object, `{ "tasks": [...], "profile": {...}, "rewards": [...] }`.

Files are UTF-8, pretty-printed with 2-space indentation, and keep non-ASCII text unescaped.
You can edit them by hand or with an AI agent:
1. Back up first.
2. Keep the JSON valid.
3. Keep ids unique.

The app reloads the files when its window regains focus. If a file is invalid, the app shows an
error and **stops saving** until you fix it, so it never overwrites your file.

Backups exported from the original *戰術特勤任務終端* (TACTICAL OPS TERMINAL) use the same format
and import directly.

---

## tasks.json

An array that mixes two kinds of entries: **tasks** and **groups**.

### Task

```json
{
  "id": "task_read_book",
  "type": "side",
  "tagLabel": "支線任務",
  "title": "讀完《原子習慣》",
  "env": "睡前閱讀時間",
  "goal": "讀完整本書並寫下 3 個可以馬上實行的習慣",
  "intensity": "中強度，每天 20 分鐘",
  "briefing": "任務簡報：多行文字也可以。",
  "exp": 300,
  "credits": 80,
  "statBoost": { "knowledge": 2, "discipline": 1 },
  "completed": false,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "completedAt": null,
  "objectives": [
    { "id": "obj_read_1", "text": "讀完第 1–5 章", "done": false },
    { "id": "obj_read_2", "text": "讀完第 6–10 章", "done": false },
    { "id": "obj_read_3", "text": "寫下 3 個要實行的習慣", "done": false }
  ]
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | ✅ | Unique across all tasks, including group children. |
| `type` | ✅ | `main` (main storyline), `side` (side quest), `daily` (resets every day), or `bounty` (quick errand). |
| `title` | ✅ | |
| `objectives` | ✅ | **Must not be empty.** The reward can only be claimed when every objective is `done: true`. Objective `id`s only need to be unique within the task. |
| `exp`, `credits` | – | Payout. Defaults are 200 and 50. |
| `statBoost` | – | Any of `execution`, `discipline`, `knowledge`, `vitality`. Missing keys count as 0. Stats are capped at 100. |
| `tagLabel` | – | Free text for the dossier tag. If you leave it out, the theme's label for the type is used. |
| `env`, `goal`, `intensity`, `briefing` | – | Flavor text shown in the dossier. Display only. |
| `completed`, `completedAt` | – | Managed by the app. A new task should have `false` / `null`. `completedAt` is an ISO UTC timestamp. |
| `createdAt` | – | ISO timestamp. |

**Daily tasks**: once per local day, every `daily` task that was completed before today is
re-opened, and its objectives are unchecked. Half-finished progress from a previous day is
cleared too.

### Group (main storyline with stages)

```json
{
  "id": "group_marathon",
  "isGroup": true,
  "type": "main",
  "title": "主線：完成第一場半程馬拉松",
  "open": true,
  "children": [
    { "id": "task_run_5k", "type": "main", "title": "階段一：能連續跑 5 公里", "exp": 300, "credits": 80, "completed": false, "completedAt": null, "objectives": [ { "id": "o1", "text": "每週跑 3 次", "done": false } ] },
    { "id": "task_run_10k", "type": "main", "title": "階段二：能連續跑 10 公里", "exp": 400, "credits": 100, "completed": false, "completedAt": null, "objectives": [ { "id": "o1", "text": "完成一次 10K", "done": false } ] }
  ]
}
```

- A group has no rewards of its own. Its `children` are normal tasks, usually `type: "main"`.
- `open` sets whether the group starts expanded or collapsed in the list.

---

## rewards.json

```json
[
  { "id": "rew_bubble_tea", "name": "一杯手搖飲", "desc": "完成任務後的小確幸", "cost": 150, "icon": "drink" }
]
```

`icon` is one of the icon names in `src/components/Icon.tsx`. The usual choices are
`game`, `drink`, `film`, `feast`, `gem`, `book`, `moon`, and `crown`. Any other name in that
file works too.

---

## profile.json

```json
{
  "callsign": "OPERATOR",
  "level": 1,
  "currentExp": 0,
  "maxExp": 1000,
  "credits": 0,
  "streakDays": 0,
  "lastActiveDate": null,
  "lastDailyReset": null,
  "totalCompletedTasks": 0,
  "stats": { "execution": 50, "discipline": 50, "knowledge": 50, "vitality": 50 },
  "achievements": [],
  "history": [],
  "theme": "tactical",
  "sound": true
}
```

| Field | Notes |
|---|---|
| `level`, `currentExp` | `maxExp` is recalculated from `level` on load: `floor(1000 × 1.15^(level−1))`. |
| `lastActiveDate`, `lastDailyReset` | Local-time `YYYY-MM-DD`. The streak breaks when `lastActiveDate` is older than yesterday. |
| `achievements` | `{ id, name, desc, icon, unlocked, unlockedAt }`. Built-in achievements that are missing get added automatically. An achievement only unlocks if its `id` has a condition in `src/lib/gamification.ts`. |
| `history` | Newest first. Each entry is `{ timestamp, type: "task_complete" \| "shop_redeem", title, cost? }`. The newest 200 are kept. |
| `theme` | A theme id from `src/theme/themes/`. |
| `sound` | `false` mutes sound effects. |

---

## Example: ask an AI agent to add tasks

> Read AGENTS.md and docs/DATA_FORMAT.md. Add a daily task "每天伸展 10 分鐘" (vitality +1,
> 40 EXP, 15 credits, 2 objectives) and a side quest "整理衣櫃" to my Quest Terminal data.
> Back up the files first.
