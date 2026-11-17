import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeProvider';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

/** Open modals, innermost last — Esc only closes the top one. */
const modalStack: symbol[] = [];

/** Modal shell. Closes on Esc and on backdrop click. (No window.alert/confirm — they don't work in every Tauri webview.) */
export function Modal({ title, onClose, children, footer, wide }: ModalProps) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    // registered once per mount, so stack order = open order even if the parent re-renders
    const me = Symbol('modal');
    modalStack.push(me);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalStack[modalStack.length - 1] === me) closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      modalStack.splice(modalStack.indexOf(me), 1);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`flex max-h-[90vh] w-full flex-col gap-4 overflow-y-auto rounded-[calc(var(--radius)*2)] border border-accent bg-panel p-6 shadow-[0_0_40px_color-mix(in_srgb,var(--c-accent)_20%,transparent)] ${wide ? 'max-w-2xl' : 'max-w-lg'}`}
      >
        <div className="flex items-center justify-between border-b border-line pb-3 font-display text-lg font-bold tracking-wide text-ink">
          <span>{title}</span>
          <button className="text-muted transition hover:text-ink" onClick={onClose} aria-label="close">
            <Icon name="close" size="lg" />
          </button>
        </div>
        {children}
        {footer && <div className="mt-1 flex flex-wrap items-center justify-end gap-2.5">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useTheme();
  return (
    <Modal
      title={t('appTitle')}
      onClose={onCancel}
      footer={
        <>
          <button className="btn btn-outline" onClick={onCancel}>
            {t('cancel')}
          </button>
          <button className="btn btn-primary" onClick={onConfirm} autoFocus>
            OK
          </button>
        </>
      }
    >
      <p className="text-sm whitespace-pre-line text-text">{message}</p>
    </Modal>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="field-label">
        {label}
        {hint && <span className="ml-2 font-body font-normal text-dim">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
