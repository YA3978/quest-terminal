import { rankIndex } from '../lib/gamification';
import { useData, useStore, type SyncStatus } from '../state/store';
import { useTheme } from '../theme/ThemeProvider';
import type { StringKey } from '../theme/strings';
import { Icon } from './Icon';

export type Tab = 'missions' | 'shop' | 'profile';

const TABS: { id: Tab; icon: string; label: StringKey }[] = [
  { id: 'missions', icon: 'target', label: 'tabMissions' },
  { id: 'shop', icon: 'shop', label: 'tabShop' },
  { id: 'profile', icon: 'profile', label: 'tabProfile' },
];

function SyncLight({ status }: { status: SyncStatus }) {
  const { t } = useTheme();
  const { storage, loadError } = useStore();
  const browser = storage?.kind === 'browser';

  const look: Record<SyncStatus, { dot: string; box: string; label: StringKey }> = {
    loading: { dot: 'bg-info animate-pulse-dot', box: 'text-muted border-line', label: 'loading' as StringKey },
    online: browser
      ? { dot: 'bg-warn', box: 'text-warn border-warn/40', label: 'syncLocalBrowser' }
      : { dot: 'bg-accent shadow-[0_0_6px_var(--c-accent)]', box: 'text-muted border-line', label: 'syncOnline' },
    saving: { dot: 'bg-info animate-pulse-dot', box: 'text-muted border-line', label: 'syncSaving' },
    offline: { dot: 'bg-danger animate-pulse-dot', box: 'text-danger border-danger/40', label: 'syncOffline' },
    conflict: { dot: 'bg-danger animate-pulse-dot', box: 'text-danger border-danger/40', label: 'syncConflict' },
  };
  const l = look[status];
  const tip =
    status === 'conflict'
      ? `${t('syncTipConflict')}${loadError ? `\n${loadError}` : ''}`
      : status === 'offline'
        ? t('syncTipOffline')
        : browser
          ? t('syncTipBrowser')
          : t('syncTipDesktop');

  return (
    <div className={`flex cursor-help items-center gap-1.5 rounded-theme border px-2.5 py-1 text-xs whitespace-nowrap ${l.box}`} title={tip}>
      <span className={`h-[7px] w-[7px] rounded-full ${l.dot}`} />
      <span>{t(l.label)}</span>
    </div>
  );
}

export function Hud({ tab, onTab, onBackup }: { tab: Tab; onTab: (t: Tab) => void; onBackup: () => void }) {
  const { profile } = useData();
  const { status } = useStore();
  const { t, rank } = useTheme();
  const pct = Math.min(100, Math.max(0, (profile.currentExp / profile.maxExp) * 100));

  return (
    <header className="sticky top-0 z-[100] flex flex-wrap items-center justify-between gap-3 border-b border-accent/30 bg-panel2/95 px-6 py-3 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2.5 font-display text-[1.05rem] font-bold tracking-[1.5px] text-ink">
          <span className="animate-pulse-dot h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_var(--c-accent)]" />
          <span className="max-w-48 truncate" title={t('appTitle')}>
            {profile.callsign}
          </span>
          <span className="rounded-theme border border-accent/35 bg-accent/10 px-1.5 py-0.5 text-[0.75rem] font-semibold text-accent">
            {t('operatorBadge')}
          </span>
        </div>

        <nav className="flex gap-1.5" aria-label="main">
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTab(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-1.5 rounded-theme border px-3.5 py-1.5 font-display text-[0.92rem] font-semibold tracking-wide transition ${
                  active
                    ? 'border-accent/40 bg-accent/10 text-accent shadow-[inset_0_-2px_0_var(--c-accent)]'
                    : 'border-transparent text-muted hover:bg-white/5 hover:text-ink'
                }`}
              >
                <Icon name={item.icon} />
                <span>{t(item.label)}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5 rounded-theme border border-gold/30 bg-card px-3 py-1 font-mono font-bold text-gold" title={t('currencyName')}>
          <Icon name="credit" />
          <span>{profile.credits.toLocaleString()}</span>
          <span className="text-sm">{t('currencyUnit')}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-theme border border-warn/30 bg-card px-3 py-1 font-mono font-bold text-warn">
          <Icon name="flame" />
          <span>{profile.streakDays}</span>
          <span className="text-sm">{t('streakUnit')}</span>
        </div>

        <div className="flex items-center gap-3 border-l border-line pl-4">
          <div className="flex items-center gap-1.5 rounded-theme border border-accent bg-accent/10 px-2 py-0.5 font-display text-[0.85rem] font-bold text-accent shadow-[0_0_10px_color-mix(in_srgb,var(--c-accent)_25%,transparent)]">
            <Icon name="crest" />
            <span>
              Lv.{profile.level} {rank(rankIndex(profile.level))}
            </span>
          </div>
          <div className="flex w-32 flex-col gap-0.5">
            <div className="flex justify-between font-mono text-[0.7rem] text-muted">
              <span>EXP</span>
              <span>
                {profile.currentExp} / {profile.maxExp}
              </span>
            </div>
            <div className="h-[5px] w-full overflow-hidden rounded-theme bg-white/10" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-accent shadow-[0_0_8px_var(--c-accent)] transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        <SyncLight status={status} />
        <button className="btn btn-outline btn-sm" onClick={onBackup} title={t('backupButtonTitle')} aria-label={t('backupButtonTitle')}>
          <Icon name="database" />
        </button>
      </div>
    </header>
  );
}
