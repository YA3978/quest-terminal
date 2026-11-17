import type { Task, TaskType } from '../types';
import { getAllFlatTasks, isGroup, matchesFilter, objectiveProgress, type TaskFilter } from '../lib/tasks';
import { useActions } from '../state/actions';
import { useData } from '../state/store';
import { useTheme } from '../theme/ThemeProvider';
import type { StringKey } from '../theme/strings';
import { Icon } from './Icon';

const FILTERS: { id: TaskFilter; label: StringKey }[] = [
  { id: 'all', label: 'filterAll' },
  { id: 'main', label: 'filterMain' },
  { id: 'side', label: 'filterSide' },
  { id: 'daily', label: 'filterDaily' },
  { id: 'bounty', label: 'filterBounty' },
  { id: 'completed', label: 'filterCompleted' },
];

export const TYPE_TAG: Record<TaskType, { cls: string; short: StringKey; long: StringKey }> = {
  main: { cls: 'tag-main', short: 'filterMain', long: 'tagMain' },
  side: { cls: 'tag-side', short: 'filterSide', long: 'tagSide' },
  daily: { cls: 'tag-daily', short: 'filterDaily', long: 'tagDaily' },
  bounty: { cls: 'tag-bounty', short: 'filterBounty', long: 'tagBounty' },
};

interface Props {
  filter: TaskFilter;
  onFilter: (f: TaskFilter) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onReload: () => void;
}

function TaskCard({ task, selected, nested, onSelect }: { task: Task; selected: boolean; nested?: boolean; onSelect: () => void }) {
  const { t } = useTheme();
  const { done, total } = objectiveProgress(task);
  const tag = TYPE_TAG[task.type];
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={`group flex w-full items-center justify-between gap-2 rounded-theme border px-3 py-2.5 text-left transition hover:translate-x-0.5 ${
        selected
          ? 'border-accent bg-card-active shadow-[inset_3px_0_0_var(--c-accent),0_0_15px_color-mix(in_srgb,var(--c-accent)_12%,transparent)]'
          : 'border-line bg-card hover:border-white/25 hover:bg-card-hover'
      } ${nested ? 'ml-3.5 w-[calc(100%-0.875rem)] border-l-2' : ''} ${task.completed ? 'opacity-70' : ''}`}
    >
      <span className="flex min-w-0 items-center gap-2">
        {task.completed ? (
          <span className="tag tag-done">{t('tagCompleted')}</span>
        ) : nested ? (
          <Icon name="bolt" className="text-accent" />
        ) : (
          <span className={`tag ${tag.cls}`}>{t(tag.short)}</span>
        )}
        <span className={`truncate text-[0.86rem] ${selected ? 'font-semibold text-ink' : 'text-text'} ${task.completed ? 'text-muted line-through' : ''}`}>
          {task.title}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 font-mono text-[0.8rem] text-muted">
        {task.completed && <Icon name="medal" className="text-accent" />}
        {done}/{total}
      </span>
    </button>
  );
}

function Empty({ icon, title, hint }: { icon: string; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-10 text-center text-sm text-muted">
      <Icon name={icon} size="xl" className="mb-1 text-dim" />
      <span>{title}</span>
      <span className="text-xs text-dim">{hint}</span>
    </div>
  );
}

export function TaskList({ filter, onFilter, selectedId, onSelect, onNew, onReload }: Props) {
  const { tasks } = useData();
  const { t } = useTheme();
  const actions = useActions();

  const flat = getAllFlatTasks(tasks);
  const active = flat.filter((x) => !x.completed);
  const counts: Record<TaskFilter, number> = {
    all: active.length,
    main: active.filter((x) => x.type === 'main').length,
    side: active.filter((x) => x.type === 'side').length,
    daily: active.filter((x) => x.type === 'daily').length,
    bounty: active.filter((x) => x.type === 'bounty').length,
    completed: flat.length - active.length,
  };

  let body: React.ReactNode;
  if (filter === 'completed') {
    const list = flat.filter((x) => x.completed);
    body =
      list.length === 0 ? (
        <Empty icon="medal" title={t('emptyCompleted')} hint={t('emptyCompletedHint')} />
      ) : (
        list.map((task) => <TaskCard key={task.id} task={task} selected={task.id === selectedId} onSelect={() => onSelect(task.id)} />)
      );
  } else {
    const nodes = tasks
      .map((node) => {
        if (isGroup(node)) {
          const children = node.children.filter((c) => matchesFilter(c, filter));
          if (children.length === 0) return null;
          const open = node.open ?? true;
          return (
            <div key={node.id} className="overflow-hidden rounded-theme border border-line bg-card/50 transition hover:border-white/20">
              <button
                onClick={() => actions.toggleGroup(node.id)}
                aria-expanded={open}
                className={`flex w-full items-center justify-between gap-2 bg-white/[0.03] px-3 py-2.5 text-left transition hover:bg-white/[0.07] ${open ? 'border-b border-line' : ''}`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="tag tag-main">{t('groupTag')}</span>
                  <span className="truncate text-[0.88rem] font-semibold text-ink">{node.title}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 font-mono text-[0.8rem] text-muted">
                  {t('groupCount', { n: children.length })}
                  <Icon name="chevron-down" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                </span>
              </button>
              {open && (
                <div className="flex flex-col gap-1.5 px-2 pt-1.5 pb-2.5">
                  {children.map((c) => (
                    <TaskCard key={c.id} task={c} nested selected={c.id === selectedId} onSelect={() => onSelect(c.id)} />
                  ))}
                </div>
              )}
            </div>
          );
        }
        if (!matchesFilter(node, filter)) return null;
        return <TaskCard key={node.id} task={node} selected={node.id === selectedId} onSelect={() => onSelect(node.id)} />;
      })
      .filter(Boolean);
    body = nodes.length > 0 ? nodes : <Empty icon="shield" title={t('emptyActive')} hint={t('emptyActiveHint')} />;
  }

  return (
    <aside className="panel flex min-h-[500px] flex-col lg:h-[calc(100vh-120px)]">
      <div className="flex flex-col gap-3 border-b border-line bg-white/[0.02] px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-[0.95rem] font-bold tracking-wider text-ink before:inline-block before:h-3.5 before:w-[3px] before:bg-accent">
            {t('missionsPanelTitle')}
          </h2>
          <span className="font-mono text-[0.78rem] text-muted">{t('summary', { active: counts.all, done: counts.completed })}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {FILTERS.map((f) => {
            const on = filter === f.id;
            const completed = f.id === 'completed';
            return (
              <button
                key={f.id}
                onClick={() => onFilter(f.id)}
                aria-pressed={on}
                className={`flex items-center justify-center gap-0.5 rounded-theme border px-1 py-1.5 font-display text-[0.76rem] font-semibold whitespace-nowrap transition ${
                  on
                    ? completed
                      ? 'border-muted bg-muted/15 text-text'
                      : 'border-accent bg-accent/10 text-accent'
                    : 'border-line bg-card text-muted hover:bg-white/5 hover:text-ink'
                }`}
              >
                {t(f.label)} ({counts[f.id]})
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3">{body}</div>

      <div className="flex gap-2.5 border-t border-line bg-black/15 px-4 py-3">
        <button className="btn btn-primary flex-1" onClick={onNew}>
          <Icon name="plus" />
          <span>{t('newMission')}</span>
        </button>
        <button className="btn btn-outline" onClick={onReload} title={t('reloadTitle')}>
          <Icon name="sync" />
          <span>{t('reload')}</span>
        </button>
      </div>
    </aside>
  );
}
