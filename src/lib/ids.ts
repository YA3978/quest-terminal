/** Short unique id with a readable prefix, e.g. `task_lx3k9a_4f2c`. */
export function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}
