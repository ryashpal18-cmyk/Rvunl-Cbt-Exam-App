import { useTranslation } from '../uiLanguage';
import { useEffect, useState } from 'react';
import { Download, RefreshCw, Rocket } from 'lucide-react';
import { UpdateStatus } from '../types/exam';
import { version as currentVersion } from '../../package.json';

export default function UpdateManager() {
  const t = useTranslation();
  const [version, setVersion] = useState(currentVersion);
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle', message: '' });

  useEffect(() => {
    const api = window.rvunlAPI;
    if (!api) return;
    let active = true;
    let eventReceived = false;
    void api.getAppVersion().then((value) => { if (active) setVersion(value); }).catch(() => undefined);
    const unsubscribe = api.onUpdateStatus((value) => {
      eventReceived = true;
      if (active) setStatus(value);
    });
    void api.getUpdateStatus().then((value) => {
      if (active && !eventReceived) setStatus(value);
    }).catch((error) => {
      if (active && !eventReceived) setStatus({ state: 'error', message: String(error) });
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  const act = async () => {
    const api = window.rvunlAPI;
    if (!api) return;
    try {
      if (status.state === 'available') {
        setStatus({ state: 'downloading', percent: 0, message: '' });
        await api.downloadUpdate();
      } else if (status.state === 'downloaded') {
        await api.installUpdate();
      } else {
        setStatus({ state: 'checking', message: '' });
        await api.checkForUpdates();
      }
    } catch (error) {
      setStatus({ state: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  };

  const messages = {
    idle: t('Check for application updates.', 'ऐप के अपडेट जाँचें।'),
    checking: t('Checking for updates…', 'अपडेट की जाँच हो रही है…'),
    available: t('A new version is available.', 'नया वर्ज़न उपलब्ध है।'),
    downloading: t('Downloading the update…', 'अपडेट डाउनलोड हो रहा है…'),
    downloaded: t('The update is ready to install.', 'अपडेट इंस्टॉल करने के लिए तैयार है।'),
    'not-available': t('No new update is available for this installation.', 'इस इंस्टॉलेशन के लिए नया अपडेट उपलब्ध नहीं है।'),
    error: t('The update could not be completed.', 'अपडेट पूरा नहीं हुआ।'),
  };
  const percent = Math.min(100, Math.max(0, Math.round(status.percent ?? 0)));
  const label = status.state === 'available' ? t('Download update', 'अपडेट डाउनलोड करें')
    : status.state === 'downloaded' ? t('Restart & install', 'फिर खोलें और इंस्टॉल करें')
    : status.state === 'checking' ? t('Checking…', 'जाँच हो रही है…')
    : status.state === 'downloading' ? `${t('Downloading', 'डाउनलोड')} ${percent}%`
    : t('Check for updates', 'अपडेट जाँचें');
  const icon = status.state === 'downloaded' ? <Rocket size={16} />
    : status.state === 'available' || status.state === 'downloading' ? <Download size={16} />
    : <RefreshCw size={16} />;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold">{t('Software update', 'सॉफ़्टवेयर अपडेट')}</h2>
        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-800">v{version}</span>
      </div>
      <p role="status" className="mt-2 text-sm text-slate-700">{messages[status.state]}</p>
      {!window.rvunlAPI && <p className="mt-2 text-sm text-slate-600">{t('Use the installed Windows app to update.', 'अपडेट के लिए इंस्टॉल किया हुआ Windows ऐप खोलें।')}</p>}
      {status.state === 'error' && status.message && <p role="alert" className="mt-2 text-sm text-red-700">{status.message}</p>}
      {status.state === 'downloading' && (
        <div role="progressbar" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full bg-blue-600" style={{ width: `${percent}%` }} />
        </div>
      )}
      <button disabled={!window.rvunlAPI || status.state === 'checking' || status.state === 'downloading'} className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={() => void act()}>
        {icon}{label}
      </button>
    </section>
  );
}
