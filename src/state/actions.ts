/**
 * User actions = store.update(draft mutation from lib/) + sound + themed toast.
 * Components call these; they never mutate data themselves.
 */
import { useCallback, useEffect, useMemo } from 'react';
import type { Reward, Stats, Task, TaskType } from '../types';
import { sfx } from '../lib/audio';
import { buyReward, claimTask, rankIndex, reactivateTask, type GameEvent } from '../lib/gamification';
import { makeId } from '../lib/ids';
import { getTaskById, isGroup, removeTask } from '../lib/tasks';
import { useTheme } from '../theme/ThemeProvider';
import { useStore } from './store';

export interface TaskForm {
  type: TaskType;
  title: string;
  briefing: string;
  objectives: string[];
  exp: number;
  credits: number;
  statBoost: Partial<Stats>;
}

export interface RewardForm {
  name: string;
  desc: string;
  cost: number;
  icon: string;
}

/** Turns game events into sounds + themed toasts. */
function useAnnounce() {
  const { toast } = useStore();
  const { rank, achievementName } = useTheme();
  return useCallback(
    (events: GameEvent[]) => {
      for (const ev of events) {
        switch (ev.type) {
          case 'levelUp':
            sfx.levelUp();
            toast('toastLevelUp', { level: ev.level, rank: rank(rankIndex(ev.level)) });
            break;
          case 'achievement':
            sfx.success();
            toast('toastAchievement', { name: achievementName(ev.id, ev.name) });
            break;
          case 'dailyReset':
            toast('toastDailyReset', { count: ev.count });
            break;
          case 'streakBroken':
            toast('toastStreakBroken');
            break;
        }
      }
    },
    [toast, rank, achievementName],
  );
}

/** Mount ONCE (in App): announces events produced inside the store (daily maintenance, reloads). */
export function usePendingEventAnnouncer() {
  const { pendingEvents, consumeEvents } = useStore();
  const announce = useAnnounce();
  useEffect(() => {
    if (pendingEvents.length === 0) return;
    announce(pendingEvents);
    consumeEvents();
  }, [pendingEvents, consumeEvents, announce]);
}

export function useActions() {
  const { update, toast } = useStore();
  const { t } = useTheme();
  const announce = useAnnounce();

  return useMemo(
    () => ({
      toggleObjective(taskId: string, index: number) {
        update((d) => {
          const task = getTaskById(d.tasks, taskId);
          if (!task || task.completed || !task.objectives[index]) return;
          task.objectives[index].done = !task.objectives[index].done;
        });
        sfx.check();
      },

      toggleGroup(groupId: string) {
        sfx.click();
        update((d) => {
          const g = d.tasks.find((n) => n.id === groupId);
          if (g && isGroup(g)) g.open = !(g.open ?? true);
        });
      },

      claim(taskId: string): boolean {
        const res = update((d) => claimTask(d, taskId));
        if (!res.ok) {
          sfx.error();
          toast(res.reason === 'alreadyClaimed' ? 'toastAlreadyClaimed' : 'toastNotAllDone', {}, 'error');
          return false;
        }
        sfx.reward();
        toast('toastClaim', { exp: res.exp, credits: res.credits });
        announce(res.events); // level-up / achievements stack on top
        return true;
      },

      reactivate(taskId: string) {
        sfx.click();
        const title = update((d) => (reactivateTask(d, taskId) ? getTaskById(d.tasks, taskId)?.title : undefined));
        if (title) toast('toastTaskReactivated', { title });
      },

      deleteTask(taskId: string) {
        sfx.click();
        if (update((d) => removeTask(d, taskId))) toast('toastTaskDeleted');
      },

      /** Creates a task (editingId null) or updates one. Returns the task id. */
      saveTask(form: TaskForm, editingId: string | null): string | null {
        const title = form.title.trim();
        if (!title) {
          sfx.error();
          toast('toastTitleRequired', {}, 'error');
          return null;
        }
        const lines = form.objectives.map((l) => l.trim()).filter(Boolean);
        const texts = lines.length > 0 ? lines : [t('defaultObjective')];
        const tagKey = { main: 'tagMain', side: 'tagSide', daily: 'tagDaily', bounty: 'tagBounty' } as const;
        const statBoost = Object.fromEntries(Object.entries(form.statBoost).filter(([, v]) => v && v > 0));

        const id = update((d) => {
          if (editingId) {
            const task = getTaskById(d.tasks, editingId);
            if (!task) return null;
            const old = task.objectives;
            Object.assign(task, {
              title,
              type: form.type,
              tagLabel: t(tagKey[form.type]),
              briefing: form.briefing.trim(),
              exp: form.exp,
              credits: form.credits,
              statBoost,
              // keep the checked state of objectives whose text didn't change
              objectives: texts.map((text) => old.find((o) => o.text === text) ?? { id: makeId('obj'), text, done: false }),
            });
            return task.id;
          }
          const task: Task = {
            id: makeId('task'),
            isGroup: false,
            type: form.type,
            tagLabel: t(tagKey[form.type]),
            title,
            goal: title,
            briefing: form.briefing.trim(),
            exp: form.exp,
            credits: form.credits,
            statBoost,
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null,
            objectives: texts.map((text) => ({ id: makeId('obj'), text, done: false })),
          };
          d.tasks.push(task);
          return task.id;
        });
        if (id) {
          sfx.success();
          toast(editingId ? 'toastTaskUpdated' : 'toastTaskCreated', { title });
        }
        return id;
      },

      buy(rewardId: string) {
        const res = update((d) => {
          const r = buyReward(d, rewardId);
          return { ...r, name: d.rewards.find((x) => x.id === rewardId)?.name ?? '' };
        });
        if (!res.ok) {
          sfx.error();
          if (res.reason === 'insufficient') toast('toastInsufficient', { cost: res.cost ?? 0, credits: res.credits ?? 0 }, 'error');
          return;
        }
        sfx.success();
        toast('toastRedeemed', { name: res.name });
        if (res.events.length > 0) announce(res.events);
      },

      addReward(form: RewardForm): boolean {
        const name = form.name.trim();
        if (!name) {
          sfx.error();
          toast('toastTitleRequired', {}, 'error');
          return false;
        }
        const reward: Reward = { id: makeId('rew'), name, desc: form.desc.trim(), cost: Math.max(0, form.cost || 0), icon: form.icon };
        update((d) => void d.rewards.push(reward));
        sfx.success();
        toast('toastRewardAdded', { name });
        return true;
      },

      deleteReward(rewardId: string) {
        sfx.click();
        update((d) => {
          d.rewards = d.rewards.filter((r) => r.id !== rewardId);
        });
        toast('toastRewardDeleted');
      },

      setTheme(themeId: string) {
        sfx.click();
        update((d) => void (d.profile.theme = themeId));
      },

      setSound(on: boolean) {
        sfx.setEnabled(on);
        update((d) => void (d.profile.sound = on));
        sfx.click();
      },

      setCallsign(name: string) {
        update((d) => void (d.profile.callsign = name.slice(0, 32)));
      },
    }),
    [update, toast, t, announce],
  );
}
