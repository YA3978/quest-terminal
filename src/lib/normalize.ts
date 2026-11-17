/**
 * Validation + defaults for data coming from outside the app (seed files, disk,
 * localStorage, imported backups, hand edits). Throws `DataError` on anything that
 * would break the app; fills in harmless missing fields.
 */
import type { AppData, Objective, Profile, Reward, Task, TaskGroup, TaskNode } from '../types';
import { STAT_KEYS, TASK_TYPES } from '../types';
import { DEFAULT_ACHIEVEMENTS, calculateMaxExp } from './gamification';

export class DataError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function normTask(raw: unknown, where: string): Task {
  if (!isObj(raw)) throw new DataError(`${where}: task must be an object`);
  if (typeof raw.id !== 'string' || !raw.id) throw new DataError(`${where}: task is missing "id"`);
  if (typeof raw.title !== 'string') throw new DataError(`${where} (${raw.id}): task is missing "title"`);
  const type = TASK_TYPES.includes(raw.type as Task['type']) ? (raw.type as Task['type']) : 'side';
  const objectives: Objective[] = Array.isArray(raw.objectives)
    ? raw.objectives.map((o, i) => {
        if (!isObj(o) || typeof o.text !== 'string') throw new DataError(`${where} (${raw.id}): objective #${i + 1} is invalid`);
        return { id: typeof o.id === 'string' && o.id ? o.id : `${raw.id}_obj_${i}`, text: o.text, done: o.done === true };
      })
    : [];
  if (objectives.length === 0) throw new DataError(`${where} (${raw.id}): "objectives" must be a non-empty array`);
  return {
    ...(raw as object),
    id: raw.id,
    isGroup: false,
    type,
    title: raw.title,
    exp: Number.isFinite(raw.exp) ? (raw.exp as number) : 200,
    credits: Number.isFinite(raw.credits) ? (raw.credits as number) : 50,
    statBoost: isObj(raw.statBoost) ? (raw.statBoost as Task['statBoost']) : {},
    completed: raw.completed === true,
    completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : null,
    objectives,
  } as Task;
}

function normNode(raw: unknown, i: number): TaskNode {
  const where = `tasks[${i}]`;
  if (isObj(raw) && raw.isGroup === true) {
    if (typeof raw.id !== 'string' || typeof raw.title !== 'string') throw new DataError(`${where}: group needs "id" and "title"`);
    const children = Array.isArray(raw.children) ? raw.children.map((c, j) => normTask(c, `${where}.children[${j}]`)) : [];
    return { ...(raw as object), id: raw.id, isGroup: true, title: raw.title, open: raw.open !== false, children } as TaskGroup;
  }
  return normTask(raw, where);
}

function normProfile(raw: unknown): Profile {
  if (!isObj(raw)) throw new DataError('profile must be an object');
  const level = Number.isFinite(raw.level) && (raw.level as number) >= 1 ? Math.floor(raw.level as number) : 1;
  const rawStats = isObj(raw.stats) ? raw.stats : {};
  const stats = Object.fromEntries(
    STAT_KEYS.map((k) => [k, Number.isFinite(rawStats[k]) ? Math.max(0, Math.min(100, rawStats[k] as number)) : 50]),
  ) as Profile['stats'];

  const achievements = Array.isArray(raw.achievements) ? (raw.achievements as Profile['achievements']).filter(isObj) : [];
  // Append any built-in achievement the profile doesn't have yet (older data / new releases).
  for (const def of DEFAULT_ACHIEVEMENTS) {
    if (!achievements.some((a) => a.id === def.id)) achievements.push({ ...def, unlocked: false, unlockedAt: null });
  }

  return {
    ...(raw as object),
    callsign: typeof raw.callsign === 'string' && raw.callsign ? raw.callsign : 'OPERATOR',
    level,
    currentExp: Number.isFinite(raw.currentExp) ? (raw.currentExp as number) : 0,
    maxExp: calculateMaxExp(level),
    credits: Number.isFinite(raw.credits) ? (raw.credits as number) : 0,
    streakDays: Number.isFinite(raw.streakDays) ? (raw.streakDays as number) : 0,
    lastActiveDate: typeof raw.lastActiveDate === 'string' ? raw.lastActiveDate : null,
    lastDailyReset: typeof raw.lastDailyReset === 'string' ? raw.lastDailyReset : null,
    totalCompletedTasks: Number.isFinite(raw.totalCompletedTasks) ? (raw.totalCompletedTasks as number) : 0,
    stats,
    achievements,
    history: Array.isArray(raw.history) ? (raw.history as Profile['history']).filter(isObj) : [],
  } as Profile;
}

function normReward(raw: unknown, i: number): Reward {
  if (!isObj(raw) || typeof raw.id !== 'string' || typeof raw.name !== 'string')
    throw new DataError(`rewards[${i}]: needs "id" and "name"`);
  return {
    ...(raw as object),
    id: raw.id,
    name: raw.name,
    desc: typeof raw.desc === 'string' ? raw.desc : '',
    cost: Number.isFinite(raw.cost) ? (raw.cost as number) : 100,
    icon: typeof raw.icon === 'string' && raw.icon ? raw.icon : 'game',
  };
}

export function normalizeData(raw: { tasks: unknown; profile: unknown; rewards: unknown }): AppData {
  if (!Array.isArray(raw.tasks)) throw new DataError('tasks must be an array');
  if (!Array.isArray(raw.rewards)) throw new DataError('rewards must be an array');
  const data: AppData = {
    tasks: raw.tasks.map(normNode),
    profile: normProfile(raw.profile),
    rewards: raw.rewards.map(normReward),
  };
  const ids = new Set<string>();
  const check = (id: string) => {
    if (ids.has(id)) throw new DataError(`duplicate id "${id}"`);
    ids.add(id);
  };
  for (const n of data.tasks) {
    check(n.id);
    if (n.isGroup) n.children.forEach((c) => check(c.id));
  }
  return data;
}

/** Parses a backup JSON string ({tasks, profile, rewards}). Throws DataError with a readable message. */
export function parseBackup(text: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new DataError(`invalid JSON: ${(e as Error).message}`);
  }
  if (!isObj(parsed)) throw new DataError('backup must be an object with tasks / profile / rewards');
  return normalizeData(parsed as { tasks: unknown; profile: unknown; rewards: unknown });
}
