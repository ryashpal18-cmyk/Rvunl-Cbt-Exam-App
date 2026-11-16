import { useEffect, useState } from 'react';
import { CheckCircle2, Download, RefreshCw, Rocket, WifiOff } from 'lucide-react';
import { UpdateStatus } from '../types/exam';

export default function UpdateManager() {
  const [version, setVersion] = useState('1.1.0');
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle', message: 'Check for application updates.' });

  useEffect(() => {
    if (!window.rvunlAPI) return;
    void window.rvunlAPI.getAppVersion().then(setVersion);
    return window.rvunlAPI.onUpdateStatus(setStatus);
  }, []);

  const check = async () => {
    setStatus({ state: 'checking', message: 'Checking for a new version…' });
    try { await window.rvunlAPI?.checkForUpdates(); }
    catch (error) { setStatus({ state: 'error', message: error instanceof Error ? error.message : 'Update check failed.' }); }
  };
  const download = async () => {
    try { await window.rvunlAPI?.downloadUpdate(); }
    catch (error) { setStatus({ state: 'error', message: error instanceof Error ? error.message : 'Update download failed.' }); }
  };

  const icon = status.state === 'downloaded' ? <Rocket size={16} /> : status.state === 'available' || status.state === 'downloading' ? <Download size={16} /> : status.state === 'not-available' ? <CheckCircle2 size={16} /> : status.state === 'error' ? <WifiOff size={16} /> : <RefreshCw className={status.state === 'checking' ? 'animate-spin' : ''} size={16} />;
  const action = status.state === 'available' ? download : status.state === 'downloaded' ? () => void window.rvunlAPI?.installUpdate() : check;
  const label = status.state === 'available' ? 'Download update' : status.state === 'downloaded' ? 'Restart & install' : status.state === 'checking' ? 'Checking…' : status.state === 'downloading' ? `Downloading ${Math.round(status.percent ?? 0)}%` : 'Check for updates';

  return <div className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur"><div className="flex items-center justify-between"><span className="text-xs font-bold text-white">Software update</span><span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-violet-100">v{version}</span></div><p className={`mt-2 text-[11px] leading-4 ${status.state === 'error' ? 'text-red-200' : 'text-blue-100'}`}>{status.message}</p>{status.state === 'downloading' && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20"><div className="h-full bg-gradient-to-r from-cyan-300 to-orange-300 transition-all" style={{ width: `${status.percent ?? 0}%` }} /></div>}<button disabled={status.state === 'checking' || status.state === 'downloading'} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-2 py-2 text-xs font-bold text-violet-900 hover:bg-violet-50 disabled:opacity-60" onClick={action}>{icon}{label}</button></div>;
}
