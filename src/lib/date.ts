/**
 * "Which day is it" helpers. Always LOCAL time.
 *
 * Never use `new Date().toISOString().slice(0, 10)` for day logic — that is UTC,
 * which is still "yesterday" for the first hours of the day east of Greenwich
 * (e.g. before 08:00 in UTC+8). Timestamps such as `completedAt` are stored as
 * ISO/UTC; convert them with `localDateStr(new Date(ts))` before comparing days.
 */
export function localDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function yesterdayStr(now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return localDateStr(d);
}
