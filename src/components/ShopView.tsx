import { useState } from 'react';
import type { Reward } from '../types';
import { useActions } from '../state/actions';
import { useData } from '../state/store';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './Icon';
import { ConfirmDialog } from './Modal';

export function ShopView({ onAddReward }: { onAddReward: () => void }) {
  const { rewards, profile } = useData();
  const { t } = useTheme();
  const actions = useActions();
  const [toDelete, setToDelete] = useState<Reward | null>(null);

  return (
    <section className="panel flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl text-ink">
            <Icon name="shop" size="lg" className="text-gold" />
            <span>{t('shopTitle')}</span>
          </h2>
          <p className="mt-1 text-[0.8rem] text-muted">{t('shopSubtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={onAddReward}>
          <Icon name="plus" />
          <span>{t('addReward')}</span>
        </button>
      </div>

      {rewards.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">{t('shopEmpty')}</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {rewards.map((rew) => {
            const affordable = profile.credits >= rew.cost;
            return (
              <article
                key={rew.id}
                className="group relative flex flex-col justify-between gap-3.5 rounded-theme border border-line bg-card p-4 transition hover:-translate-y-0.5 hover:border-gold/45 hover:bg-card-hover"
              >
                <button
                  className="absolute top-2 right-2 rounded-theme p-1 text-dim opacity-0 transition group-hover:opacity-100 hover:text-danger focus:opacity-100"
                  onClick={() => setToDelete(rew)}
                  title={t('deleteReward')}
                  aria-label={`${t('deleteReward')} ${rew.name}`}
                >
                  <Icon name="trash" />
                </button>
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-theme border border-line bg-black/25 text-gold">
                    <Icon name={rew.icon} size="xl" />
                  </span>
                  <div className="min-w-0 pr-5">
                    <h3 className="mb-1 text-[0.95rem] text-ink">{rew.name}</h3>
                    <p className="text-[0.78rem] leading-snug text-muted">{rew.desc}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-2.5">
                  <span className="flex items-center gap-1.5 font-mono font-bold text-gold">
                    <Icon name="credit" />
                    {rew.cost.toLocaleString()} {t('currencyUnit')}
                  </span>
                  <button className={`btn btn-outline btn-sm ${affordable ? '' : 'opacity-60'}`} onClick={() => actions.buy(rew.id)}>
                    {t('redeem')}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {toDelete && (
        <ConfirmDialog
          message={`${t('confirmDeleteReward')}\n「${toDelete.name}」`}
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            actions.deleteReward(toDelete.id);
            setToDelete(null);
          }}
        />
      )}
    </section>
  );
}
