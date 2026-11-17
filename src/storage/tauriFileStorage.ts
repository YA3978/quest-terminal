/**
 * Desktop persistence: three human-editable JSON files in the OS app-data folder
 *   Windows: %APPDATA%\<identifier>\   macOS: ~/Library/Application Support/<identifier>/
 *   Linux:   ~/.local/share/<identifier>/
 * plus daily snapshots in backup/YYYY-MM-DD/ (kept for BACKUP_KEEP_DAYS days).
 *
 * Files are written atomically (<name>.tmp + rename), pretty-printed with real
 * (non-escaped) CJK so they can be edited by hand or by an AI agent.
 */
import { appDataDir, join } from '@tauri-apps/api/path';
import {
  BaseDirectory,
  copyFile,
  exists,
  mkdir,
  readDir,
  readTextFile,
  remove,
  rename,
  stat,
  writeTextFile,
} from '@tauri-apps/plugin-fs';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import type { AppData } from '../types';
import { localDateStr } from '../lib/date';
import { normalizeData } from '../lib/normalize';
import type { SaveResult, StorageAdapter } from './StorageAdapter';

const FILES = ['tasks', 'profile', 'rewards'] as const;
const BACKUP_DIR = 'backup';
const BACKUP_KEEP_DAYS = 30;
const base = { baseDir: BaseDirectory.AppData };
const appData = BaseDirectory.AppData;

export class TauriFileStorage implements StorageAdapter {
  readonly kind = 'desktop' as const;
  /** Fingerprint (mtime+size of the 3 files) as of our last load/save. */
  private rev: string | null = null;
  private lastBackupDay: string | null = null;

  private async fingerprint(): Promise<string> {
    const parts: string[] = [];
    for (const name of FILES) {
      const file = `${name}.json`;
      if (!(await exists(file, base))) {
        parts.push(`${name}:-`);
        continue;
      }
      const s = await stat(file, base);
      parts.push(`${name}:${s.mtime?.getTime() ?? 0}:${s.size}`);
    }
    return parts.join('|');
  }

  private async ensureDir(): Promise<void> {
    const dir = await appDataDir();
    // mkdir with an absolute path: BaseDirectory + '' is not accepted on every platform.
    await mkdir(dir, { recursive: true });
  }

  async load(): Promise<AppData | null> {
    await this.ensureDir();
    const present = await Promise.all(FILES.map((n) => exists(`${n}.json`, base)));
    if (!present.some(Boolean)) {
      this.rev = await this.fingerprint();
      return null;
    }
    if (!present.every(Boolean)) {
      const missing = FILES.filter((_, i) => !present[i]).map((n) => `${n}.json`);
      throw new Error(`missing ${missing.join(', ')} in the data folder`);
    }
    const before = await this.fingerprint();
    const [tasks, profile, rewards] = await Promise.all(
      FILES.map(async (n) => {
        const text = await readTextFile(`${n}.json`, base);
        try {
          return JSON.parse(text.replace(/^﻿/, '')) as unknown;
        } catch (e) {
          throw new Error(`${n}.json is not valid JSON: ${(e as Error).message}`);
        }
      }),
    );
    const data = normalizeData({ tasks, profile, rewards });
    // If a file changed while we were reading, our fingerprint would describe a
    // different version than the data we hold — leave rev unset to force a conflict.
    this.rev = (await this.fingerprint()) === before ? before : null;
    return data;
  }

  async save(data: AppData): Promise<SaveResult> {
    try {
      if (await this.hasExternalChange()) return { ok: false, conflict: true };
      await this.ensureDir();
      await this.dailyBackup();
      for (const name of FILES) {
        const json = JSON.stringify(data[name], null, 2);
        await writeTextFile(`${name}.json.tmp`, json, base);
        await rename(`${name}.json.tmp`, `${name}.json`, { oldPathBaseDir: appData, newPathBaseDir: appData });
      }
      this.rev = await this.fingerprint();
      return { ok: true };
    } catch (e) {
      return { ok: false, conflict: false, error: String((e as Error)?.message ?? e) };
    }
  }

  async hasExternalChange(): Promise<boolean> {
    return (await this.fingerprint()) !== this.rev;
  }

  async acceptExternal(): Promise<void> {
    this.rev = await this.fingerprint();
  }

  async location(): Promise<string> {
    return appDataDir();
  }

  async openDataFolder(): Promise<void> {
    const dir = await appDataDir();
    const hasFile = await exists('tasks.json', base);
    await revealItemInDir(hasFile ? await join(dir, 'tasks.json') : dir);
  }

  /** Snapshot today's pre-change state once per day, then prune old snapshots. */
  private async dailyBackup(): Promise<void> {
    const today = localDateStr();
    if (this.lastBackupDay === today) return;
    const dir = `${BACKUP_DIR}/${today}`;
    if (!(await exists(dir, base)) && (await exists('tasks.json', base))) {
      await mkdir(dir, { ...base, recursive: true });
      for (const name of FILES) {
        if (await exists(`${name}.json`, base)) {
          await copyFile(`${name}.json`, `${dir}/${name}.json`, { fromPathBaseDir: appData, toPathBaseDir: appData });
        }
      }
    }
    this.lastBackupDay = today;
    await this.pruneBackups();
  }

  private async pruneBackups(): Promise<void> {
    if (!(await exists(BACKUP_DIR, base))) return;
    const entries = (await readDir(BACKUP_DIR, base)).filter((e) => e.isDirectory && /^\d{4}-\d{2}-\d{2}/.test(e.name));
    const dates = [...new Set(entries.map((e) => e.name.slice(0, 10)))].sort().reverse();
    const keep = new Set(dates.slice(0, BACKUP_KEEP_DAYS));
    for (const e of entries) {
      if (!keep.has(e.name.slice(0, 10))) await remove(`${BACKUP_DIR}/${e.name}`, { ...base, recursive: true });
    }
  }
}
