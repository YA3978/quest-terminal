import type { StorageAdapter } from './StorageAdapter';
import { BrowserStorage } from './browserStorage';

export type { StorageAdapter, SaveResult } from './StorageAdapter';

/** True when running inside the Tauri desktop shell. */
export const isTauri = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/** Desktop → JSON files on disk. Browser → localStorage. The Tauri module is only loaded on desktop. */
export async function createStorage(): Promise<StorageAdapter> {
  if (isTauri()) {
    const { TauriFileStorage } = await import('./tauriFileStorage');
    return new TauriFileStorage();
  }
  return new BrowserStorage();
}
