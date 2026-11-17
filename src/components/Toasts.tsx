import { useEffect } from 'react';
import { useStore, type ToastMsg } from '../state/store';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './Icon';

const TOAST_MS = 3200;

function ToastItem({ msg }: { msg: ToastMsg }) {
  const { dismissToast } = useStore();
  const { t } = useTheme();
  useEffect(() => {
    const id = window.setTimeout(() => dismissToast(msg.id), TOAST_MS);
    return () => window.clearTimeout(id);
  }, [msg.id, dismissToast]);

  const error = msg.tone === 'error';
  return (
    <div
      role="status"
      onClick={() => dismissToast(msg.id)}
      className={`animate-toast-in flex max-w-md cursor-pointer items-center gap-2.5 rounded-theme border bg-panel2 px-5 py-3 font-display text-[0.9rem] font-semibold text-ink shadow-[0_10px_30px_rgb(0_0_0/0.6)] ${error ? 'border-danger' : 'border-accent'}`}
    >
      <Icon name={error ? 'alert' : 'bolt'} className={error ? 'text-danger' : 'text-accent'} />
      <span>{t(msg.key, msg.params)}</span>
    </div>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="pointer-events-none fixed right-6 bottom-6 z-[2000] flex flex-col items-end gap-2 [&>*]:pointer-events-auto" aria-live="polite">
      {toasts.map((m) => (
        <ToastItem key={m.id} msg={m} />
      ))}
    </div>
  );
}
