/**
 * Data model. These shapes are the on-disk JSON format (tasks.json / profile.json /
 * rewards.json) — keep them backward compatible. See docs/DATA_FORMAT.md.
 */

export type TaskType = 'main' | 'side' | 'daily' | 'bounty';

export type StatKey = 'execution' | 'discipline' | 'knowledge' | 'vitality';
export type Stats = Record<StatKey, number>;

export interface Objective {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  isGroup?: false;
  type: TaskType;
  /** Free-text label shown on the dossier tag. Optional: the theme's tag label is used if missing. */
  tagLabel?: string;
  title: string;
  env?: string;
  goal?: string;
  intensity?: string;
  briefing?: string;
  exp: number;
  credits: number;
  statBoost?: Partial<Stats>;
  completed: boolean;
  createdAt?: string;
  /** ISO/UTC timestamp. Convert with localDateStr(new Date(ts)) before comparing days. */
  completedAt: string | null;
  objectives: Objective[];
}

/** A main storyline: a collapsible group whose children are the reward-bearing tasks. */
export interface TaskGroup {
  id: string;
  isGroup: true;
  type?: TaskType;
  title: string;
  open?: boolean;
  children: Task[];
}

export type TaskNode = Task | TaskGroup;

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface HistoryEntry {
  timestamp: string;
  type: 'shop_redeem' | 'task_complete' | string;
  title: string;
  cost?: number;
}

export interface Profile {
  callsign: string;
  uid?: string;
  level: number;
  rankTitle?: string;
  currentExp: number;
  maxExp: number;
  credits: number;
  streakDays: number;
  /** Local-time YYYY-MM-DD */
  lastActiveDate: string | null;
  /** Local-time YYYY-MM-DD */
  lastDailyReset?: string | null;
  totalCompletedTasks: number;
  stats: Stats;
  achievements: Achievement[];
  history: HistoryEntry[];
  /** Selected UI theme id (see src/theme/themes). */
  theme?: string;
  /** Sound effects on/off. */
  sound?: boolean;
}

export interface Reward {
  id: string;
  name: string;
  desc: string;
  cost: number;
  icon: string;
}

export interface AppData {
  tasks: TaskNode[];
  profile: Profile;
  rewards: Reward[];
}

export const STAT_KEYS: StatKey[] = ['execution', 'discipline', 'knowledge', 'vitality'];
export const TASK_TYPES: TaskType[] = ['main', 'side', 'daily', 'bounty'];
