import { useState } from 'react';
import type { Task } from '../types';
import { STAT_KEYS } from '../types';
import { objectiveProgress } from '../lib/tasks';
import { useActions } from '../state/actions';
import { useTheme } from '../theme/ThemeProvider';
import type { StringKey } from '../theme/strings';
import { Icon } from './Icon';
import { ConfirmDialog } from './Modal';
import { TYPE_TAG } from './TaskList';

export const STAT_SHORT: Record<(typeof STAT_KEYS)[number], StringKey> = {
  execution: 'statExecutionShort',
  discipline: 'statDisciplineShort',
  knowledge: 'statKnowledgeShort',
  vitality: 'statVitalityShort',
};

interface Props {
  task: Task | null;
  onEdit: (id: string) => void;
}

export function Dossier({ task, onEdit }: Props) {
  const { t } = useTheme();
  const actions = useActions();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!task) {
    return (
      <section className="panel flex min-h-[500px] flex-col items-center justify-center gap-2 p-10 text-center lg:h-[calc(100vh-120px)]">
        <Icon name="target" size="xl" className="mb-2 text-dim" />
        <h3 className="font-display text-ink">{t('noSelection')}</h3>
        <p className="text-sm text-muted">{t('noSelectionHint')}</p>
      </section>
    );
  }

  const { done, total, allDone } = objectiveProgress(task);
  const boost = STAT_KEYS.filter((k) => task.statBoost?.[k]).map((k) => `+${task.statBoost![k]} ${t(STAT_SHORT[k])}`);
  const tag = TYPE_TAG[task.type];

  const intel: [StringKey, string][] = [
    ['envLabel', task.env || t('defaultEnv')],
    ['goalLabel', task.goal || task.title],
    ['intensityLabel', task.intensity || t('defaultIntensity')],
    ['briefingLabel', task.briefing || t('defaultBriefing')],
  ];

  return (
    <section className="panel flex min-h-[500px] flex-col lg:h-[calc(100vh-120px)]">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-white/[0.02] px-6 pt-5 pb-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <Icon name="crest" size="lg" className="text-accent" />
            <span className={`tag ${task.completed ? 'tag-done' : tag.cls}`}>
              {task.completed ? t('tagArchived') : task.tagLabel || t(tag.long)}
            </span>
            <span className="truncate font-mono text-xs text-muted">ID: {task.id}</span>
          </div>
          <h2 className="font-display text-[1.45rem] font-bold tracking-wide break-words text-ink">{task.title}</h2>
        </div>
        <div className="flex gap-2">
          {task.completed ? (
            <button className="btn btn-outline btn-sm" onClick={() => actions.reactivate(task.id)}>
              <Icon name="sync" />
              <span>{t('reactivate')}</span>
            </button>
          ) : (
            <button className="btn btn-outline btn-sm" onClick={() => onEdit(task.id)}>
              <Icon name="edit" />
              <span>{t('edit')}</span>
            </button>
          )}
          <button className="btn btn-outline btn-sm hover:!border-danger hover:!text-danger" onClick={() => setConfirmDelete(true)}>
            <Icon name="trash" />
            <span>{t('delete')}</span>
          </button>
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
        <dl className="flex flex-col gap-2 rounded-theme border border-l-[3px] border-line border-l-accent bg-black/20 px-4 py-3.5">
          {intel.map(([label, value]) => (
            <div key={label} className="flex flex-col text-[0.85rem] leading-relaxed sm:flex-row">
              <dt className="w-[110px] shrink-0 font-mono font-semibold tracking-wide text-muted">{t(label)} :</dt>
              <dd className={`whitespace-pre-wrap ${label === 'briefingLabel' ? 'text-muted' : 'text-text'}`}>{value}</dd>
            </div>
          ))}
        </dl>

        {!task.completed && (
          <div className="flex items-center gap-2.5 rounded-theme border border-l-[3px] border-danger/35 border-l-danger bg-danger/10 px-3.5 py-2.5 text-[0.82rem] text-text">
            <Icon name="alert" className="text-danger" />
            <span>{t('alertBanner')}</span>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <div className="section-title">
            <span>{t('objectivesTitle')}</span>
            <span className="font-mono text-[0.85rem] text-accent">{t('objectivesProgress', { done, total })}</span>
          </div>
          <ul className="flex flex-col gap-2">
            {task.objectives.map((obj, idx) => (
              <li key={obj.id}>
                <button
                  onClick={() => actions.toggleObjective(task.id, idx)}
                  disabled={task.completed}
                  role="checkbox"
                  aria-checked={obj.done}
                  className="flex w-full items-center justify-between gap-3 rounded-theme border border-line bg-card px-3.5 py-3 text-left transition enabled:hover:border-white/25 enabled:hover:bg-card-hover disabled:cursor-default"
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-theme border transition ${
                        obj.done ? 'border-accent bg-accent text-accent-ink' : 'border-white/30 bg-black/25 text-transparent'
                      }`}
                    >
                      <Icon name="check" className="!h-3 !w-3" />
                    </span>
                    <span className={`text-[0.88rem] transition ${obj.done ? 'text-muted line-through' : 'text-ink'}`}>{obj.text}</span>
                  </span>
                  <span className={`font-mono text-[0.84rem] font-bold ${obj.done ? 'text-accent' : 'text-muted'}`}>{obj.done ? '1/1' : '0/1'}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="section-title">
            <span>{t('rewardsTitle')}</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
            <RewardSlot icon="bolt" color="accent" label={t('expLabel')} value={`+${task.exp} EXP`} />
            <RewardSlot icon="credit" color="gold" label={t('currencyName')} value={`+${task.credits} ${t('currencyUnit')}`} />
            <RewardSlot icon="brain" color="info" label={t('statBoostLabel')} value={boost.length ? boost.join(' / ') : '—'} />
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="flex items-center justify-end gap-4 border-t border-line bg-black/20 px-6 py-4">
        {task.completed ? (
          <button className="btn min-w-[190px] cursor-default border-line bg-card px-6 py-3 text-[0.95rem] text-muted" disabled>
            <Icon name="medal" />
            <span>{t('claimed')}</span>
          </button>
        ) : allDone ? (
          <button className="btn btn-primary animate-pulse-glow min-w-[190px] px-6 py-3 text-[0.95rem]" onClick={() => actions.claim(task.id)}>
            <Icon name="medal" />
            <span>{t('claimReady')}</span>
          </button>
        ) : (
          <button className="btn btn-primary min-w-[190px] px-6 py-3 text-[0.95rem] opacity-80" onClick={() => actions.claim(task.id)}>
            <Icon name="bolt" />
            <span>{t('claimInProgress', { done, total })}</span>
          </button>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          message={`${t('confirmDeleteTask')}\n「${task.title}」`}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            actions.deleteTask(task.id);
          }}
        />
      )}
    </section>
  );
}

function RewardSlot({ icon, color, label, value }: { icon: string; color: 'accent' | 'gold' | 'info'; label: string; value: string }) {
  const text = { accent: 'text-accent', gold: 'text-gold', info: 'text-info' }[color];
  const bar = { accent: 'bg-accent', gold: 'bg-gold', info: 'bg-info' }[color];
  return (
    <div className="relative flex items-center gap-2.5 overflow-hidden rounded-theme border border-line bg-panel2 px-3 py-2.5">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-theme bg-black/25 ${text}`}>
        <Icon name={icon} size="lg" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-display text-[0.7rem] text-muted uppercase">{label}</span>
        <span className="font-mono text-[0.95rem] font-bold break-words text-ink">{value}</span>
      </span>
      <span className={`absolute inset-x-0 bottom-0 h-0.5 ${bar}`} />
    </div>
  );
}
