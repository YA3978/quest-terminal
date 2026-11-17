/**
 * Game rules: EXP / levels, streaks, stats, achievements, daily reset, shop.
 *
 * Every function here operates on an `AppData` *draft* — the store hands in a
 * structuredClone of the current state, the function mutates it, and the store
 * commits the draft. Functions never touch the DOM, storage, audio or toasts;
 * they report what happened through the returned `GameEvent[]`, and the UI layer
 * turns those into sounds and (theme-worded) messages.
 */
import type { Achievement, AppData, Profile, Stats, Task } from '../types';
import { STAT_KEYS } from '../types';
import { localDateStr, yesterdayStr } from './date';
import { getAllFlatTasks, getTaskById, objectiveProgress } from './tasks';

export const STAT_CAP = 100;
export const HISTORY_LIMIT = 200;

export type GameEvent =
  | { type: 'levelUp'; level: number }
  | { type: 'achievement'; id: string; name: string }
  | { type: 'dailyReset'; count: number }
  | { type: 'streakBroken' };

/** EXP needed to go from `level` to `level + 1`. */
export function calculateMaxExp(level: number): number {
  return Math.floor(1000 * Math.pow(1.15, level - 1));
}

/** Level thresholds for the 5 rank tiers. Rank names come from the active theme. */
export const RANK_THRESHOLDS = [1, 6, 16, 31, 51];

export function rankIndex(level: number): number {
  let idx = 0;
  RANK_THRESHOLDS.forEach((min, i) => {
    if (level >= min) idx = i;
  });
  return idx;
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

/**
 * Unlock conditions, keyed by achievement id. An achievement in profile.json
 * without an entry here can never unlock — add both together.
 */
export const ACHIEVEMENT_CONDITIONS: Record<string, (data: AppData) => boolean> = {
  ach_first_blood: (d) => d.profile.totalCompletedTasks >= 1,
  ach_tasks_25: (d) => d.profile.totalCompletedTasks >= 25,
  ach_streak_3: (d) => d.profile.streakDays >= 3,
  ach_streak_7: (d) => d.profile.streakDays >= 7,
  // Main-storyline tasks live inside groups' children — search the flattened list.
  ach_main_conqueror: (d) => getAllFlatTasks(d.tasks).some((t) => t.type === 'main' && t.completed),
  ach_level_10: (d) => d.profile.level >= 10,
  ach_black_market_vip: (d) => d.profile.history.filter((h) => h.type === 'shop_redeem').length >= 5,
};

/** Default achievement list for new profiles (names are overridable per theme). */
export const DEFAULT_ACHIEVEMENTS: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
  { id: 'ach_first_blood', name: '初入戰場', desc: '完成第 1 個任務', icon: 'medal' },
  { id: 'ach_tasks_25', name: '身經百戰', desc: '累計完成 25 個任務', icon: 'shield' },
  { id: 'ach_streak_3', name: '連勝 3 天', desc: '連續 3 天每天至少完成 1 項任務', icon: 'flame' },
  { id: 'ach_streak_7', name: '鋼鐵意志', desc: '連續 7 天每天至少完成 1 項任務', icon: 'flame' },
  { id: 'ach_main_conqueror', name: '主線攻克者', desc: '完成任一主線任務', icon: 'crown' },
  { id: 'ach_level_10', name: '老練特工', desc: '等級達到 Lv.10', icon: 'crest' },
  { id: 'ach_black_market_vip', name: '黑市大亨', desc: '在商店累積兌換 5 次獎勵', icon: 'gem' },
];

export function checkAchievements(data: AppData, now: Date = new Date()): GameEvent[] {
  const events: GameEvent[] = [];
  for (const ach of data.profile.achievements) {
    const cond = ACHIEVEMENT_CONDITIONS[ach.id];
    if (ach.unlocked || !cond || !cond(data)) continue;
    ach.unlocked = true;
    ach.unlockedAt = now.toISOString();
    events.push({ type: 'achievement', id: ach.id, name: ach.name });
  }
  return events;
}

// ---------------------------------------------------------------------------
// Streak & daily maintenance
// ---------------------------------------------------------------------------

/** Called on a reward claim: today counts as an active day. */
export function updateStreak(profile: Profile, now: Date = new Date()): void {
  const today = localDateStr(now);
  if (profile.lastActiveDate === today && profile.streakDays > 0) return;
  profile.streakDays = profile.lastActiveDate === yesterdayStr(now) ? (profile.streakDays || 0) + 1 : 1;
  profile.lastActiveDate = today;
}

/** A streak whose last active day is older than yesterday is broken, even with no new claim. */
export function refreshStreak(profile: Profile, now: Date = new Date()): boolean {
  const last = profile.lastActiveDate;
  if (!last || last === localDateStr(now) || last === yesterdayStr(now)) return false;
  if (profile.streakDays === 0) return false;
  profile.streakDays = 0;
  return true;
}

/**
 * Once per local day: re-open every daily task completed before today, and clear
 * half-checked objectives left over from a previous day. Returns how many were reset.
 */
export function resetDailyTasks(data: AppData, now: Date = new Date()): number {
  const today = localDateStr(now);
  const lastReset = data.profile.lastDailyReset;
  if (lastReset === today) return 0;

  let count = 0;
  for (const task of getAllFlatTasks(data.tasks)) {
    if (task.type !== 'daily') continue;
    const completedBeforeToday =
      task.completed && !!task.completedAt && localDateStr(new Date(task.completedAt)) < today;
    const staleProgress = !task.completed && !!lastReset && lastReset < today && task.objectives.some((o) => o.done);
    if (completedBeforeToday || staleProgress) {
      task.completed = false;
      task.completedAt = null;
      task.objectives.forEach((o) => (o.done = false));
      count++;
    }
  }
  data.profile.lastDailyReset = today;
  return count;
}

/**
 * Run on startup, when the window regains focus, and after reloading data from disk.
 * Safe to call repeatedly. `changed` tells the caller whether to save.
 */
export function runDailyMaintenance(data: AppData, now: Date = new Date()): { changed: boolean; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const hadResetToday = data.profile.lastDailyReset === localDateStr(now);
  const streakBroken = refreshStreak(data.profile, now);
  if (streakBroken) events.push({ type: 'streakBroken' });
  const resetCount = resetDailyTasks(data, now);
  if (resetCount > 0) events.push({ type: 'dailyReset', count: resetCount });
  const achEvents = checkAchievements(data, now);
  events.push(...achEvents);
  return { changed: streakBroken || !hadResetToday || achEvents.length > 0, events };
}

// ---------------------------------------------------------------------------
// Claiming tasks
// ---------------------------------------------------------------------------

function applyStatBoost(stats: Stats, boost: Task['statBoost'] = {}): void {
  for (const key of STAT_KEYS) {
    const add = boost[key];
    if (add) stats[key] = Math.min(STAT_CAP, (stats[key] || 0) + add);
  }
}

export function addExpAndCredits(data: AppData, exp: number, credits: number, boost: Task['statBoost'], now = new Date()): GameEvent[] {
  const p = data.profile;
  const events: GameEvent[] = [];
  p.credits = (p.credits || 0) + credits;
  p.currentExp = (p.currentExp || 0) + exp;
  p.totalCompletedTasks = (p.totalCompletedTasks || 0) + 1;

  let leveled = false;
  while (p.currentExp >= p.maxExp) {
    p.currentExp -= p.maxExp;
    p.level += 1;
    p.maxExp = calculateMaxExp(p.level);
    leveled = true;
  }
  if (leveled) events.push({ type: 'levelUp', level: p.level });

  applyStatBoost(p.stats, boost);
  updateStreak(p, now);
  return events;
}

export type ClaimResult =
  | { ok: true; exp: number; credits: number; events: GameEvent[] }
  | { ok: false; reason: 'notFound' | 'alreadyClaimed' | 'incomplete' };

/** Gate: every objective must be done. Marks the task completed and pays out. */
export function claimTask(data: AppData, taskId: string, now: Date = new Date()): ClaimResult {
  const task = getTaskById(data.tasks, taskId);
  if (!task) return { ok: false, reason: 'notFound' };
  if (task.completed) return { ok: false, reason: 'alreadyClaimed' };
  if (!objectiveProgress(task).allDone) return { ok: false, reason: 'incomplete' };

  task.completed = true;
  task.completedAt = now.toISOString();
  const exp = task.exp ?? 200;
  const credits = task.credits ?? 50;
  const events = addExpAndCredits(data, exp, credits, task.statBoost, now);
  pushHistory(data.profile, { timestamp: now.toISOString(), type: 'task_complete', title: task.title });
  events.push(...checkAchievements(data, now));
  return { ok: true, exp, credits, events };
}

/** Moves a completed task back to the active list and clears its objectives. Rewards are not taken back. */
export function reactivateTask(data: AppData, taskId: string): boolean {
  const task = getTaskById(data.tasks, taskId);
  if (!task) return false;
  task.completed = false;
  task.completedAt = null;
  task.objectives.forEach((o) => (o.done = false));
  return true;
}

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------

export type BuyResult =
  | { ok: true; events: GameEvent[] }
  | { ok: false; reason: 'notFound' | 'insufficient'; cost?: number; credits?: number };

export function buyReward(data: AppData, rewardId: string, now: Date = new Date()): BuyResult {
  const reward = data.rewards.find((r) => r.id === rewardId);
  if (!reward) return { ok: false, reason: 'notFound' };
  if (data.profile.credits < reward.cost) {
    return { ok: false, reason: 'insufficient', cost: reward.cost, credits: data.profile.credits };
  }
  data.profile.credits -= reward.cost;
  pushHistory(data.profile, { timestamp: now.toISOString(), type: 'shop_redeem', title: reward.name, cost: reward.cost });
  return { ok: true, events: checkAchievements(data, now) };
}

function pushHistory(profile: Profile, entry: Profile['history'][number]): void {
  profile.history.unshift(entry);
  if (profile.history.length > HISTORY_LIMIT) profile.history.length = HISTORY_LIMIT;
}
