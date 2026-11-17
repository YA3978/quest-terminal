import { useEffect, useRef, useState } from 'react';
import { sfx } from '../lib/audio';
import { localDateStr } from '../lib/date';
import { DataError, parseBackup } from '../lib/normalize';
import { useStore } from '../state/store';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './Icon';
import { ConfirmDialog, Modal } from './Modal';

/**
 * Export / import of the whole dataset as one JSON blob: {tasks, profile, rewards}.
 * Same shape as the original "tactical ops terminal" backup, so old backups import directly.
 */
export function BackupModal({ onClose }: { onClose: () => void }) {
  const { data, storage, replaceData, toast } = useStore();
  const { t } = useTheme();
  const [text, setText] = useState(() => JSON.stringify(data, null, 2));
  const [location, setLocation] = useState('');
  const [confirming, setConfirming] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void storage?.location().then(setLocation);
  }, [storage]);

  const download = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quest-terminal-backup-${localDateStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = () => {
    setConfirming(false);
    try {
      replaceData(parseBackup(text));
      sfx.success();
      toast('toastImported');
      onClose();
    } catch (e) {
      sfx.error();
      toast('toastImportFailed', { error: e instanceof DataError ? e.message : String(e) }, 'error');
    }
  };

  return (
    <Modal
      wide
      title={t('backupTitle')}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline mr-auto" onClick={download}>
            <Icon name="download" />
            <span>{t('backupDownload')}</span>
          </button>
          <button className="btn btn-outline" onClick={() => fileInput.current?.click()}>
            <Icon name="upload" />
            <span>{t('backupImportFile')}</span>
          </button>
          <button className="btn btn-outline" onClick={onClose}>
            {t('close')}
          </button>
          <button className="btn btn-primary" onClick={() => setConfirming(true)}>
            {t('backupImport')}
          </button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2 rounded-theme border border-line bg-black/20 px-3 py-2 text-[0.8rem]">
        <span className="field-label">{t('backupLocation')}:</span>
        <code className="font-mono break-all text-text">{location}</code>
        {storage?.openDataFolder && (
          <button className="btn btn-outline btn-sm ml-auto" onClick={() => void storage.openDataFolder?.()}>
            <Icon name="folder" />
            <span>{t('backupOpenFolder')}</span>
          </button>
        )}
      </div>
      <p className="text-[0.8rem] text-muted">{t('backupHint')}</p>
      <textarea
        className="form-control font-mono text-[0.78rem]"
        rows={12}
        spellCheck={false}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="JSON"
      />
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) setText(await file.text());
          e.target.value = '';
        }}
      />
      {confirming && <ConfirmDialog message={t('confirmImport')} onCancel={() => setConfirming(false)} onConfirm={doImport} />}
    </Modal>
  );
}
