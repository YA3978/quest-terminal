import { useEffect, useState } from 'react';
import { sfx } from './lib/audio';
import { getTaskById, resolveSelection, type TaskFilter } from './lib/tasks';
import { usePendingEventAnnouncer } from './state/actions';
import { useStore } from './state/store';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';
import { BackupModal } from './components/BackupModal';
import { Dossier } from './components/Dossier';
import { Hud, type Tab } from './components/Hud';
import { Icon } from './components/Icon';
import { ProfileView } from './components/ProfileView';
import { RewardModal } from './components/RewardModal';
import { ShopView } from './components/ShopView';
import { TaskList } from './components/TaskList';
import { TaskModal } from './components/TaskModal';
import { Toasts } from './components/Toasts';

type ModalState = { kind: 'task'; editId: string | null } | { kind: 'reward' } | { kind: 'backup' } | null;

function LoadErrorBanner() {
  const { loadError, reload, toast } = useStore();
  const { t } = useTheme();
  if (!loadError) return null;
  return (
    <div className="mx-auto mt-4 flex w-full max-w-[1600px] flex-wrap items-center gap-3 px-6">
      <div className="flex flex-1 flex-wrap items-center gap-3 rounded-theme border border-l-[3px] border-danger/40 border-l-danger bg-danger/10 px-4 py-3 text-sm text-text">
        <Icon name="alert" size="lg" className="text-danger" />
        <div className="flex min-w-0 flex-1 flex-col">
          <strong className="text-ink">{t('loadError', { error: loadError })}</strong>
          <span className="text-muted">{t('loadErrorHint')}</span>
        </div>
        <button
          className="btn btn-outline btn-sm"
          onClick={async () => (await reload()) ? toast('toastReloaded') : toast('toastReloadFailed', { error: '' }, 'error')}
        >
          <Icon name="sync" />
          {t('reload')}
        </button>
      </div>
    </div>
  );
}

function Shell() {
  const { data, reload, toast } = useStore();
  usePendingEventAnnouncer();
  const [tab, setTab] = useState<Tab>('missions');
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  // keep sound setting in sync with the profile
  const soundOn = data?.profile.sound !== false;
  useEffect(() => sfx.setEnabled(soundOn), [soundOn]);

  if (!data) return null;

  // Selection follows the data: if the selected task vanished or no longer matches the filter, pick another.
  const effectiveId = resolveSelection(data.tasks, filter, selectedId);
  const selected = getTaskById(data.tasks, effectiveId);

  const go = (next: Tab) => {
    sfx.click();
    setTab(next);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Hud tab={tab} onTab={go} onBackup={() => (sfx.click(), setModal({ kind: 'backup' }))} />
      <LoadErrorBanner />

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-5">
        {tab === 'missions' && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(380px,490px)_1fr]">
            <TaskList
              filter={filter}
              onFilter={(f) => {
                sfx.click();
                setFilter(f);
              }}
              selectedId={effectiveId}
              onSelect={(id) => {
                sfx.click();
                setSelectedId(id);
              }}
              onNew={() => (sfx.click(), setModal({ kind: 'task', editId: null }))}
              onReload={async () => {
                sfx.click();
                if (await reload()) toast('toastReloaded');
                else toast('toastReloadFailed', { error: '' }, 'error');
              }}
            />
            <Dossier task={selected} onEdit={(id) => (sfx.click(), setModal({ kind: 'task', editId: id }))} />
          </div>
        )}
        {tab === 'shop' && <ShopView onAddReward={() => (sfx.click(), setModal({ kind: 'reward' }))} />}
        {tab === 'profile' && <ProfileView />}
      </main>

      {modal?.kind === 'task' && (
        <TaskModal
          task={modal.editId ? getTaskById(data.tasks, modal.editId) : null}
          onClose={() => setModal(null)}
          onSaved={(id, type) => {
            setModal(null);
            setSelectedId(id);
            // make sure the saved task is visible in the list
            if (filter !== 'all' && filter !== type) setFilter('all');
          }}
        />
      )}
      {modal?.kind === 'reward' && <RewardModal onClose={() => setModal(null)} />}
      {modal?.kind === 'backup' && <BackupModal onClose={() => setModal(null)} />}
      <Toasts />
    </div>
  );
}

export default function App() {
  const { data } = useStore();
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center font-mono text-muted">
        <span className="animate-pulse-dot mr-3 h-2 w-2 rounded-full bg-accent" />
        LOADING…
      </div>
    );
  }
  return (
    <ThemeProvider themeId={data.profile.theme}>
      <Shell />
    </ThemeProvider>
  );
}
