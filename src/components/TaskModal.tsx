import { useState } from 'react';
import { STAT_KEYS, TASK_TYPES, type Stats, type Task, type TaskType } from '../types';
import { useActions, type TaskForm } from '../state/actions';
import { useTheme } from '../theme/ThemeProvider';
import type { StringKey } from '../theme/strings';
import { STAT_SHORT } from './Dossier';
import { Field, Modal } from './Modal';

const TYPE_OPTION: Record<TaskType, StringKey> = { main: 'optMain', side: 'optSide', daily: 'optDaily', bounty: 'optBounty' };

/** Default payout per category — tweak freely, these are just starting values. */
const DEFAULTS: Record<TaskType, { exp: number; credits: number }> = {
  main: { exp: 300, credits: 80 },
  side: { exp: 200, credits: 50 },
  daily: { exp: 40, credits: 15 },
  bounty: { exp: 60, credits: 20 },
};

interface Props {
  task: Task | null; // null = create
  onClose: () => void;
  onSaved: (id: string, type: TaskType) => void;
}

export function TaskModal({ task, onClose, onSaved }: Props) {
  const { t } = useTheme();
  const actions = useActions();
  const [form, setForm] = useState<TaskForm>(() =>
    task
      ? {
          type: task.type,
          title: task.title,
          briefing: task.briefing ?? '',
          objectives: task.objectives.map((o) => o.text),
          exp: task.exp,
          credits: task.credits,
          statBoost: { ...task.statBoost },
        }
      : { type: 'side', title: '', briefing: '', objectives: [], exp: DEFAULTS.side.exp, credits: DEFAULTS.side.credits, statBoost: { execution: 1 } },
  );
  const [objText, setObjText] = useState(form.objectives.join('\n'));
  const set = <K extends keyof TaskForm>(k: K, v: TaskForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    const id = actions.saveTask({ ...form, objectives: objText.split('\n') }, task?.id ?? null);
    if (id) onSaved(id, form.type);
  };

  return (
    <Modal
      title={task ? t('modalEditTitle') : t('modalNewTitle')}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>
            {t('cancel')}
          </button>
          <button className="btn btn-primary" onClick={save}>
            {t('save')}
          </button>
        </>
      }
    >
      <Field label={t('fieldCategory')}>
        <select
          className="form-control"
          value={form.type}
          onChange={(e) => {
            const type = e.target.value as TaskType;
            // switching category on a NEW task also switches the suggested payout
            setForm((f) => (task ? { ...f, type } : { ...f, type, ...DEFAULTS[type] }));
          }}
        >
          {TASK_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(TYPE_OPTION[type])}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t('fieldTitle')}>
        <input className="form-control" value={form.title} placeholder={t('fieldTitlePh')} onChange={(e) => set('title', e.target.value)} autoFocus />
      </Field>

      <Field label={t('fieldBriefing')}>
        <textarea className="form-control" rows={2} value={form.briefing} placeholder={t('fieldBriefingPh')} onChange={(e) => set('briefing', e.target.value)} />
      </Field>

      <Field label={t('fieldObjectives')}>
        <textarea className="form-control" rows={4} value={objText} placeholder={t('fieldObjectivesPh')} onChange={(e) => setObjText(e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label={t('fieldExp')}>
          <input className="form-control" type="number" min={0} value={form.exp} onChange={(e) => set('exp', Math.max(0, parseInt(e.target.value, 10) || 0))} />
        </Field>
        <Field label={t('fieldCredits')}>
          <input className="form-control" type="number" min={0} value={form.credits} onChange={(e) => set('credits', Math.max(0, parseInt(e.target.value, 10) || 0))} />
        </Field>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="field-label">
          {t('fieldStatBoost')} <span className="ml-1 font-body font-normal text-dim">{t('fieldStatBoostHint')}</span>
        </span>
        <div className="grid grid-cols-4 gap-2">
          {STAT_KEYS.map((k) => (
            <label key={k} className="flex flex-col gap-1 text-[0.75rem] text-muted">
              {t(STAT_SHORT[k])}
              <input
                className="form-control"
                type="number"
                min={0}
                max={5}
                value={form.statBoost[k] ?? 0}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(5, parseInt(e.target.value, 10) || 0));
                  setForm((f) => ({ ...f, statBoost: { ...f.statBoost, [k]: v } as Partial<Stats> }));
                }}
              />
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}
