/**
 * App state + persistence.
 *
 * - `update(fn)` is the ONLY way to change data: it clones the current data, lets
 *   `fn` mutate the draft, commits it, and schedules a debounced save.
 * - Only one save runs at a time; changes made meanwhile are saved right after,
 *   so an older snapshot can never overwrite a newer one.
 * - If the stored data changed outside this window (hand/agent edit of the JSON
 *   files, another browser tab), the save is refused: we reload from storage —
 *   storage wins — and tell the user to redo their last step. If that reload
 *   fails (e.g. a hand-edited file is now invalid JSON) saving stays blocked
 *   until a reload succeeds, so a broken file is never overwritten blindly.
 * - When the window regains focus and nothing is unsaved, newer external data is
 *   pulled in quietly.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppData } from '../types';
import { runDailyMaintenance, type GameEvent } from '../lib/gamification';
import { normalizeData } from '../lib/normalize';
import { createStorage, isTauri, type StorageAdapter } from '../storage';
import type { StringKey } from '../theme/strings';

export type SyncStatus = 'loading' | 'online' | 'saving' | 'offline' | 'conflict';

export interface ToastMsg {
  id: number;
  key: StringKey;
  params?: Record<string, string | number>;
  tone: 'ok' | 'error';
}

interface StoreApi {
  data: AppData | null;
  status: SyncStatus;
  storage: StorageAdapter | null;
  /** Set when stored data exists but couldn't be read; saving is blocked meanwhile. */
  loadError: string | null;
  /** Mutate a draft of the data; returns whatever `fn` returns. */
  update: <T>(fn: (draft: AppData) => T) => T;
  /** Replace all data (import). */
  replaceData: (data: AppData) => void;
  /** Discard in-memory state and re-read storage. */
  reload: () => Promise<boolean>;
  toast: (key: StringKey, params?: ToastMsg['params'], tone?: ToastMsg['tone']) => void;
  toasts: ToastMsg[];
  dismissToast: (id: number) => void;
  /** Game events produced outside an action (daily maintenance, reload) for the UI to announce. */
  pendingEvents: GameEvent[];
  consumeEvents: () => void;
}

const StoreContext = createContext<StoreApi | null>(null);

const SAVE_DEBOUNCE_MS = 300;
const RETRY_MS = 10_000;

async function loadSeed(): Promise<AppData> {
  const get = async (name: string) => {
    const res = await fetch(`${import.meta.env.BASE_URL}seed/${name}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`seed/${name}.json: HTTP ${res.status}`);
    return res.json();
  };
  const [tasks, profile, rewards] = await Promise.all([get('tasks'), get('profile'), get('rewards')]);
  const data = normalizeData({ tasks, profile, rewards });
  const now = new Date().toISOString();
  for (const n of data.tasks) {
    const list = n.isGroup ? n.children : [n];
    list.forEach((t) => (t.createdAt ??= now));
  }
  return data;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [status, setStatus] = useState<SyncStatus>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [storage, setStorage] = useState<StorageAdapter | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [pendingEvents, setPendingEvents] = useState<GameEvent[]>([]);

  const dataRef = useRef<AppData | null>(null);
  const storageRef = useRef<StorageAdapter | null>(null);
  const dirty = useRef(false); // in-memory changes not yet written
  const saving = useRef(false); // a save is in flight
  const blocked = useRef(false); // conflict/load error: never write
  const timer = useRef<number | undefined>(undefined);
  const toastSeq = useRef(0);

  const commit = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  const toast = useCallback<StoreApi['toast']>((key, params, tone = 'ok') => {
    const msg = { id: ++toastSeq.current, key, params, tone };
    setToasts((list) => [...list.slice(-2), msg]); // keep at most 3 on screen
  }, []);

  /** Load from storage (or seed on first run) + daily maintenance. Throws on unreadable data. */
  const loadFromStorage = useCallback(async (adapter: StorageAdapter) => {
    let loaded = await adapter.load();
    let isNew = false;
    if (!loaded) {
      loaded = await loadSeed();
      isNew = true;
    }
    const { changed, events } = runDailyMaintenance(loaded);
    return { data: loaded, needsSave: isNew || changed, events };
  }, []);

  // ---- saving -------------------------------------------------------------
  const flush = useCallback(async (): Promise<void> => {
    const adapter = storageRef.current;
    if (!adapter || saving.current || blocked.current || !dirty.current || !dataRef.current) return;
    saving.current = true;
    dirty.current = false;
    setStatus('saving');
    const result = await adapter.save(dataRef.current);
    saving.current = false;

    if (result.ok) {
      if (dirty.current) return void flush(); // changes arrived while saving
      setStatus('online');
      return;
    }
    if (result.conflict) {
      blocked.current = true;
      setStatus('conflict');
      try {
        const fresh = await loadFromStorage(adapter);
        blocked.current = false;
        dirty.current = fresh.needsSave;
        commit(fresh.data);
        setPendingEvents(fresh.events);
        setLoadError(null);
        setStatus('online');
        toast('toastConflict', {}, 'error');
        if (dirty.current) void flush();
      } catch (e) {
        const msg = (e as Error).message;
        setLoadError(msg);
        toast('toastConflictBroken', { error: msg }, 'error');
      }
      return;
    }
    // write error: keep the change, retry later
    dirty.current = true;
    setStatus('offline');
    toast('toastSaveFailed', { error: result.error }, 'error');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), RETRY_MS);
  }, [commit, loadFromStorage, toast]);

  const scheduleSave = useCallback(() => {
    dirty.current = true;
    if (blocked.current) return;
    setStatus('saving');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
  }, [flush]);

  // ---- public mutations ---------------------------------------------------
  const update = useCallback<StoreApi['update']>(
    (fn) => {
      if (!dataRef.current) throw new Error('data not loaded');
      const draft = structuredClone(dataRef.current);
      const result = fn(draft);
      commit(draft);
      scheduleSave();
      return result;
    },
    [commit, scheduleSave],
  );

  const replaceData = useCallback(
    (next: AppData) => {
      const { events } = runDailyMaintenance(next);
      commit(next);
      setPendingEvents(events);
      // An explicit import is the user's decision: it may overwrite external changes.
      blocked.current = false;
      setLoadError(null);
      void (async () => {
        await storageRef.current?.acceptExternal();
        scheduleSave();
      })();
    },
    [commit, scheduleSave],
  );

  const reload = useCallback(async (): Promise<boolean> => {
    const adapter = storageRef.current;
    if (!adapter) return false;
    window.clearTimeout(timer.current);
    try {
      const fresh = await loadFromStorage(adapter);
      blocked.current = false;
      dirty.current = false;
      commit(fresh.data);
      setPendingEvents(fresh.events);
      setLoadError(null);
      setStatus('online');
      if (fresh.needsSave) scheduleSave();
      return true;
    } catch (e) {
      blocked.current = true;
      setLoadError((e as Error).message);
      setStatus('conflict');
      return false;
    }
  }, [commit, loadFromStorage, scheduleSave]);

  // ---- startup ------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const adapter = await createStorage();
      if (cancelled) return;
      storageRef.current = adapter;
      setStorage(adapter);
      try {
        const fresh = await loadFromStorage(adapter);
        if (cancelled) return;
        commit(fresh.data);
        setPendingEvents(fresh.events);
        setStatus('online');
        if (fresh.needsSave) scheduleSave();
      } catch (e) {
        if (cancelled) return;
        // Saved data exists but is unreadable: show the error, never overwrite it.
        blocked.current = true;
        setLoadError((e as Error).message);
        setStatus('conflict');
        try {
          commit(await loadSeed()); // let the UI render something read-only-ish
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [commit, loadFromStorage, scheduleSave]);

  // ---- window focus: pick up external edits / new day -------------------------
  useEffect(() => {
    let busy = false;
    const onReturn = async () => {
      const adapter = storageRef.current;
      if (document.visibilityState !== 'visible' || busy || !adapter || !dataRef.current) return;
      busy = true;
      try {
        if (!dirty.current && !saving.current && (blocked.current || (await adapter.hasExternalChange()))) {
          const wasBlocked = blocked.current;
          if (await reload()) toast(wasBlocked ? 'toastReloaded' : 'toastExternalChange');
          return;
        }
        if (blocked.current) return;
        const draft = structuredClone(dataRef.current);
        const { changed, events } = runDailyMaintenance(draft);
        if (changed) {
          commit(draft);
          setPendingEvents(events);
          scheduleSave();
        }
      } finally {
        busy = false;
      }
    };
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('focus', onReturn);
    return () => {
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('focus', onReturn);
    };
  }, [commit, reload, scheduleSave, toast]);

  // ---- don't lose the last change on exit -----------------------------------
  useEffect(() => {
    const flushNow = () => {
      window.clearTimeout(timer.current);
      void flush();
    };
    window.addEventListener('pagehide', flushNow);
    let unlisten: (() => void) | undefined;
    if (isTauri()) {
      // Desktop: hold the window open until the pending write has finished.
      void import('@tauri-apps/api/window').then(async ({ getCurrentWindow }) => {
        unlisten = await getCurrentWindow().onCloseRequested(async () => {
          window.clearTimeout(timer.current);
          for (let i = 0; i < 50 && (saving.current || (dirty.current && !blocked.current)); i++) {
            await flush();
            if (saving.current) await new Promise((r) => setTimeout(r, 50));
          }
        });
      });
    }
    return () => {
      window.removeEventListener('pagehide', flushNow);
      unlisten?.();
    };
  }, [flush]);

  const api = useMemo<StoreApi>(
    () => ({
      data,
      status,
      storage,
      loadError,
      update,
      replaceData,
      reload,
      toast,
      toasts,
      dismissToast: (id: number) => setToasts((list) => list.filter((m) => m.id !== id)),
      pendingEvents,
      consumeEvents: () => setPendingEvents([]),
    }),
    [data, status, storage, loadError, update, replaceData, reload, toast, toasts, pendingEvents],
  );

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

/** Data is guaranteed loaded below <App>'s loading gate. */
export function useData(): AppData {
  const { data } = useStore();
  if (!data) throw new Error('data not loaded yet');
  return data;
}
