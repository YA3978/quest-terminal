import type { AppData } from '../types';
import { normalizeData } from '../lib/normalize';
import type { SaveResult, StorageAdapter } from './StorageAdapter';

const DATA_KEY = 'quest_terminal_data';
/** Incremented on every save — lets a tab notice that another tab wrote in the meantime. */
const REV_KEY = 'quest_terminal_rev';

export class BrowserStorage implements StorageAdapter {
  readonly kind = 'browser' as const;
  private rev: string | null = null;

  async load(): Promise<AppData | null> {
    const raw = localStorage.getItem(DATA_KEY);
    this.rev = localStorage.getItem(REV_KEY);
    if (!raw) return null;
    return normalizeData(JSON.parse(raw));
  }

  async save(data: AppData): Promise<SaveResult> {
    if (await this.hasExternalChange()) return { ok: false, conflict: true };
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(data));
      const next = String((Number(this.rev) || 0) + 1);
      localStorage.setItem(REV_KEY, next);
      this.rev = next;
      return { ok: true };
    } catch (e) {
      // QuotaExceededError, private-mode restrictions, …
      return { ok: false, conflict: false, error: (e as Error).message };
    }
  }

  async hasExternalChange(): Promise<boolean> {
    return localStorage.getItem(REV_KEY) !== this.rev;
  }

  async acceptExternal(): Promise<void> {
    this.rev = localStorage.getItem(REV_KEY);
  }

  async location(): Promise<string> {
    return `localStorage @ ${window.location.origin}`;
  }
}
