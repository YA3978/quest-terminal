import { useState } from 'react';
import { useActions, type RewardForm } from '../state/actions';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, REWARD_ICONS } from './Icon';
import { Field, Modal } from './Modal';

export function RewardModal({ onClose }: { onClose: () => void }) {
  const { t } = useTheme();
  const actions = useActions();
  const [form, setForm] = useState<RewardForm>({ name: '', desc: '', cost: 300, icon: 'game' });

  return (
    <Modal
      title={t('rewardModalTitle')}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>
            {t('cancel')}
          </button>
          <button className="btn btn-primary" onClick={() => actions.addReward(form) && onClose()}>
            {t('publish')}
          </button>
        </>
      }
    >
      <Field label={t('fieldRewardName')}>
        <input className="form-control" autoFocus value={form.name} placeholder={t('fieldRewardNamePh')} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <Field label={t('fieldRewardDesc')}>
        <input className="form-control" value={form.desc} placeholder={t('fieldRewardDescPh')} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
      </Field>
      <Field label={t('fieldRewardCost')}>
        <input
          className="form-control"
          type="number"
          min={0}
          value={form.cost}
          onChange={(e) => setForm({ ...form, cost: Math.max(0, parseInt(e.target.value, 10) || 0) })}
        />
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="field-label">{t('fieldRewardIcon')}</span>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {REWARD_ICONS.map((name) => (
            <button
              key={name}
              role="radio"
              aria-checked={form.icon === name}
              aria-label={name}
              onClick={() => setForm({ ...form, icon: name })}
              className={`flex h-11 w-11 items-center justify-center rounded-theme border transition ${
                form.icon === name ? 'border-gold bg-gold/15 text-gold' : 'border-line text-muted hover:text-ink'
              }`}
            >
              <Icon name={name} size="lg" />
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
