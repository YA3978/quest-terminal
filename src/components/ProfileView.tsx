import { useEffect, useState } from 'react';
import { STAT_KEYS, type StatKey } from '../types';
import { useActions } from '../state/actions';
import { useData } from '../state/store';
import { useTheme } from '../theme/ThemeProvider';
import { themes } from '../theme/themes';
import type { StringKey } from '../theme/strings';
import { Icon } from './Icon';

const STAT_LOOK: Record<StatKey, { label: StringKey; icon: string; text: string; bar: string }> = {
  execution: { label: 'statExecution', icon: 'bolt', text: 'text-accent', bar: 'bg-accent' },
  discipline: { label: 'statDiscipline', icon: 'target', text: 'text-info', bar: 'bg-info' },
  knowledge: { label: 'statKnowledge', icon: 'brain', text: 'text-gold', bar: 'bg-gold' },
  vitality: { label: 'statVitality', icon: 'shield', text: 'text-warn', bar: 'bg-warn' },
};

function Box({ icon, iconClass, title, children }: { icon: string; iconClass: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-[calc(var(--radius)*2)] border border-line bg-card p-5">
      <h3 className="flex items-center gap-2 border-b border-line pb-2 font-display text-lg text-ink">
        <Icon name={icon} size="lg" className={iconClass} />
        <span>{title}</span>
      </h3>
      {children}
    </div>
  );
}

export function ProfileView() {
  const { profile } = useData();
  const { t, theme, achievementName } = useTheme();
  const actions = useActions();
  const [callsign, setCallsign] = useState(profile.callsign);
  useEffect(() => setCallsign(profile.callsign), [profile.callsign]);

  return (
    <section className="panel grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
      <Box icon="crest" iconClass="text-accent" title={t('statsTitle')}>
        {STAT_KEYS.map((key) => {
          const look = STAT_LOOK[key];
          const val = profile.stats[key];
          return (
            <div key={key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between font-display text-[0.82rem] font-semibold text-text">
                <span className="flex items-center gap-1.5">
                  <Icon name={look.icon} className={look.text} />
                  {t(look.label)}
                </span>
                <span className={look.text}>{val} / 100</span>
              </div>
              <div className="h-2 overflow-hidden rounded-theme border border-white/5 bg-black/30">
                <div className={`h-full transition-[width] duration-500 ${look.bar}`} style={{ width: `${val}%` }} />
              </div>
            </div>
          );
        })}

        <div className="mt-2">
          <h4 className="mb-2 font-display text-[0.88rem] text-ink">{t('historyTitle')}</h4>
          <div className="max-h-48 overflow-y-auto">
            {profile.history.length === 0 ? (
              <p className="text-[0.8rem] text-muted">{t('historyEmpty')}</p>
            ) : (
              profile.history.slice(0, 30).map((h, i) => (
                <div key={`${h.timestamp}-${i}`} className="flex justify-between gap-3 border-b border-line py-1.5 text-[0.8rem]">
                  <span className="flex min-w-0 items-center gap-1.5 text-text">
                    <Icon name={h.type === 'shop_redeem' ? 'shop' : 'medal'} className={h.type === 'shop_redeem' ? 'text-gold' : 'text-accent'} />
                    <span className="truncate">{h.title}</span>
                    {h.cost != null && <span className="shrink-0 font-mono text-gold">-{h.cost}</span>}
                  </span>
                  <span className="shrink-0 font-mono text-muted">{new Date(h.timestamp).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </Box>

      <div className="flex flex-col gap-6">
        <Box icon="medal" iconClass="text-gold" title={t('achievementsTitle')}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2.5">
            {profile.achievements.map((ach) => (
              <div
                key={ach.id}
                title={ach.desc}
                className={`flex flex-col items-center gap-1.5 rounded-theme border px-2 py-3 text-center ${
                  ach.unlocked ? 'border-accent/40 bg-accent/10' : 'border-line bg-black/20'
                }`}
              >
                <span className={`flex h-9 w-9 items-center justify-center ${ach.unlocked ? 'text-accent' : 'text-dim'}`}>
                  <Icon name={ach.unlocked ? ach.icon : 'lock'} size="xl" />
                </span>
                <span className="text-[0.72rem] font-semibold text-ink">{achievementName(ach.id, ach.name)}</span>
                <span className="text-[0.65rem] leading-tight text-muted">{ach.desc}</span>
                <span className={`text-[0.65rem] ${ach.unlocked ? 'text-accent' : 'text-dim'}`}>{ach.unlocked ? t('unlocked') : t('locked')}</span>
              </div>
            ))}
          </div>
        </Box>

        <Box icon="edit" iconClass="text-info" title={t('settingsTitle')}>
          <label className="flex flex-col gap-1.5">
            <span className="field-label">{t('callsignLabel')}</span>
            <input
              className="form-control"
              value={callsign}
              maxLength={32}
              onChange={(e) => setCallsign(e.target.value)}
              onBlur={() => callsign.trim() && callsign !== profile.callsign && actions.setCallsign(callsign.trim())}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="field-label">{t('themeLabel')}</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {themes.map((th) => {
                const on = th.id === theme.id;
                return (
                  <button
                    key={th.id}
                    onClick={() => actions.setTheme(th.id)}
                    aria-pressed={on}
                    className={`flex flex-col gap-2 rounded-theme border p-2.5 text-left transition ${on ? 'border-accent bg-accent/10' : 'border-line hover:border-white/25'}`}
                  >
                    <span className="flex gap-1" aria-hidden="true">
                      {[th.colors.bg, th.colors.card, th.colors.accent, th.colors.warn, th.colors.info].map((c, i) => (
                        <span key={i} className="h-4 w-4 rounded-sm border border-white/10" style={{ background: c }} />
                      ))}
                    </span>
                    <span className="text-[0.8rem] font-semibold text-ink">{th.name}</span>
                    <span className="text-[0.7rem] leading-snug text-muted">{th.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="field-label flex items-center gap-1.5">
              <Icon name="sound" />
              {t('soundLabel')}
            </span>
            <button className="btn btn-outline btn-sm min-w-16" onClick={() => actions.setSound(profile.sound === false)} aria-pressed={profile.sound !== false}>
              {profile.sound === false ? t('off') : t('on')}
            </button>
          </div>
        </Box>
      </div>
    </section>
  );
}
