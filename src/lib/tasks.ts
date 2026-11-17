import type { AppData, Task, TaskGroup, TaskNode } from '../types';

export function isGroup(node: TaskNode): node is TaskGroup {
  return node.isGroup === true;
}

/**
 * Every reward-bearing task, including main-storyline tasks nested in groups.
 * Tasks live at two nesting depths — ALWAYS use this (or getTaskById) instead of
 * filtering `data.tasks` directly, or you will silently miss every group child.
 */
export function getAllFlatTasks(tasks: TaskNode[]): Task[] {
  const list: Task[] = [];
  for (const node of tasks) {
    if (isGroup(node)) list.push(...(node.children ?? []));
    else list.push(node);
  }
  return list;
}

export function getTaskById(tasks: TaskNode[], id: string | null): Task | null {
  if (!id) return null;
  return getAllFlatTasks(tasks).find((t) => t.id === id) ?? null;
}

export function objectiveProgress(task: Task): { done: number; total: number; allDone: boolean } {
  const total = task.objectives?.length ?? 0;
  const done = (task.objectives ?? []).filter((o) => o.done).length;
  return { done, total, allDone: total > 0 && done === total };
}

/** Removes a task wherever it lives (top level or inside a group). Mutates `data`. */
export function removeTask(data: AppData, taskId: string): boolean {
  const idx = data.tasks.findIndex((t) => t.id === taskId);
  if (idx !== -1) {
    data.tasks.splice(idx, 1);
    return true;
  }
  for (const node of data.tasks) {
    if (!isGroup(node)) continue;
    const cIdx = node.children.findIndex((c) => c.id === taskId);
    if (cIdx !== -1) {
      node.children.splice(cIdx, 1);
      return true;
    }
  }
  return false;
}

export type TaskFilter = 'all' | Task['type'] | 'completed';

export function matchesFilter(task: Task, filter: TaskFilter): boolean {
  if (filter === 'completed') return task.completed;
  if (task.completed) return false;
  return filter === 'all' || task.type === filter;
}

/** Keep the current selection if it is still visible under `filter`, else pick the first visible task. */
export function resolveSelection(tasks: TaskNode[], filter: TaskFilter, selectedId: string | null): string | null {
  const flat = getAllFlatTasks(tasks);
  const visible = flat.filter((t) => matchesFilter(t, filter));
  if (visible.some((t) => t.id === selectedId)) return selectedId;
  if (visible.length > 0) return visible[0].id;
  if (filter !== 'completed') return flat.find((t) => !t.completed)?.id ?? null;
  return null;
}
