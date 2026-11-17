import type { AppData } from '../types';

/**
 * Persistence backend. The app picks one at startup (see ./index.ts):
 *  - BrowserStorage: localStorage (web dev server, static web deploys)
 *  - TauriFileStorage: JSON files in the OS app-data folder (desktop app)
 *
 * Contract:
 *  - `load()` returns null when nothing has been saved yet (the app then loads the seed data).
 *    It throws if saved data exists but can't be read/parsed — the app must NOT overwrite it then.
 *  - `save()` must refuse to overwrite data that changed outside this window since the last
 *    load/save (hand edit, agent edit, another tab) and report `conflict` instead.
 */
export type SaveResult = { ok: true } | { ok: false; conflict: true } | { ok: false; conflict: false; error: string };

export interface StorageAdapter {
  readonly kind: 'browser' | 'desktop';
  load(): Promise<AppData | null>;
  save(data: AppData): Promise<SaveResult>;
  /** True if the stored data changed outside this window since our last load/save. */
  hasExternalChange(): Promise<boolean>;
  /**
   * Treat whatever is stored right now as "seen", so the next save overwrites it.
   * Only used for an explicit user import, which is meant to replace everything.
   */
  acceptExternal(): Promise<void>;
  /** Human-readable location of the data, shown in the backup dialog. */
  location(): Promise<string>;
  /** Desktop only: reveal the data folder in the OS file manager. */
  openDataFolder?(): Promise<void>;
}
