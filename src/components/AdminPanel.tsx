import { FormEvent, useMemo, useState } from 'react';
import { AlertTriangle, Check, DatabaseBackup, KeyRound, LockKeyhole, LockOpen, ShieldCheck, Trash2, UploadCloud, UserRound, UsersRound, X } from 'lucide-react';
import { Attempt, Paper, UserId } from '../types/exam';
import Importer from './Importer';

interface Props {
  attempts: Attempt[];
  papers: Paper[];
  onVerifyPin: (pin: string) => Promise<boolean>;
  onImport: (papers: Paper[], pin: string) => Promise<number>;
  onDeletePapers: (paperIds: string[], pin: string) => Promise<number>;
  onResetResults: (target: UserId | 'all', pin: string) => Promise<number>;
}

type Confirmation =
  | { kind: 'reset'; target: UserId | 'all'; title: string; detail: string }
  | { kind: 'delete'; ids: string[]; title: string; detail: string };

export default function AdminPanel({ attempts, papers, onVerifyPin, onImport, onDeletePapers, onResetResults }: Props) {
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [selectedPapers, setSelectedPapers] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const importedPapers = useMemo(() => papers.filter((paper) => paper.imported), [papers]);
  const countFor = (userId: UserId) => attempts.filter((attempt) => attempt.userId === userId).length;

  const unlock = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{4}$/.test(pin)) { setError('Enter the 4-digit admin PIN.'); return; }
    if (!(await onVerifyPin(pin))) { setError('Incorrect admin PIN.'); setPin(''); return; }
    setUnlocked(true); setError(''); setNotice('Admin settings unlocked.');
  };

  const importPapers = async (newPapers: Paper[]) => {
    const count = await onImport(newPapers, pin);
    setNotice(`${count} paper${count === 1 ? '' : 's'} imported successfully.`);
  };

  const runConfirmedAction = async () => {
    if (!confirmation) return;
    setBusy(true); setError('');
    try {
      if (confirmation.kind === 'reset') {
        const count = await onResetResults(confirmation.target, pin);
        setNotice(`${count} saved exam result${count === 1 ? '' : 's'} reset. The paper can now be attempted again with a clean history.`);
      } else {
        const count = await onDeletePapers(confirmation.ids, pin);
        setSelectedPapers([]);
        setNotice(`${count} imported paper${count === 1 ? '' : 's'} deleted.`);
      }
      setConfirmation(null);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'The admin action failed.');
    } finally { setBusy(false); }
  };

  if (!unlocked) return (
    <section className="mx-auto max-w-xl py-12">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-500 p-[2px] shadow-2xl shadow-violet-200">
        <form onSubmit={(event) => void unlock(event)} className="rounded-[22px] bg-white p-9 text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-200"><LockKeyhole size={38} /></span>
          <p className="eyebrow mt-6">Protected settings</p>
          <h2 className="mt-2 text-3xl font-extrabold">Admin Panel</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">Result reset, bulk paper import, and paper deletion are locked so students cannot change exam data.</p>
          <label className="mx-auto mt-7 block max-w-xs text-left text-sm font-bold">Admin PIN
            <div className="relative mt-2"><KeyRound className="absolute left-4 top-3.5 text-violet-500" size={20} /><input autoFocus className="w-full rounded-xl border-2 border-violet-200 bg-violet-50/50 py-3 pl-12 pr-4 text-center text-xl font-bold tracking-[0.55em]" inputMode="numeric" maxLength={4} type="password" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} /></div>
          </label>
          {error && <p className="mx-auto mt-3 max-w-xs rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
          <button className="btn-primary mt-6 w-full max-w-xs bg-gradient-to-r from-violet-700 to-fuchsia-600 shadow-lg shadow-violet-200 hover:from-violet-800 hover:to-fuchsia-700" type="submit"><LockOpen className="mr-2 inline" size={18} /> Unlock settings</button>
        </form>
      </div>
    </section>
  );

  return (
    <section>
      <header className="flex items-start justify-between rounded-3xl bg-gradient-to-r from-violet-700 via-fuchsia-600 to-orange-500 p-7 text-white shadow-xl shadow-violet-200/60">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-100">Secure controls</p><h2 className="mt-2 text-3xl font-extrabold">Admin Settings</h2><p className="mt-2 max-w-2xl text-sm text-white/85">Manage result history and question papers. Destructive actions always require confirmation.</p></div>
        <button className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20" onClick={() => { setUnlocked(false); setPin(''); setNotice(''); }}><LockKeyhole className="mr-2 inline" size={17} /> Lock panel</button>
      </header>

      {notice && <div className="mt-5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><span className="flex items-center gap-2"><Check size={18} />{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X size={17} /></button></div>}
      {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}

      <section className="mt-7">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white"><DatabaseBackup size={23} /></span><div><h3 className="text-xl font-bold">Reset exam results</h3><p className="text-sm text-slate-500">Clears attempt history and the related Mistake Bank. Imported papers stay available.</p></div></div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <ResetCard name="Monika" count={countFor('monika')} icon={<UserRound />} color="from-cyan-600 to-blue-600" onReset={() => setConfirmation({ kind: 'reset', target: 'monika', title: "Reset Monika's results?", detail: `This will permanently remove ${countFor('monika')} saved attempt(s) and clear Monika's Mistake Bank.` })} />
          <ResetCard name="Shivani" count={countFor('shivani')} icon={<UserRound />} color="from-violet-600 to-fuchsia-600" onReset={() => setConfirmation({ kind: 'reset', target: 'shivani', title: "Reset Shivani's results?", detail: `This will permanently remove ${countFor('shivani')} saved attempt(s) and clear Shivani's Mistake Bank.` })} />
          <ResetCard name="Both profiles" count={attempts.length} icon={<UsersRound />} color="from-rose-500 to-orange-500" onReset={() => setConfirmation({ kind: 'reset', target: 'all', title: 'Reset all results?', detail: `This will permanently remove all ${attempts.length} saved attempt(s) for Monika and Shivani.` })} />
        </div>
      </section>

      <div className="my-8 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      <Importer onImport={importPapers} />

      <section className="mt-9">
        <div className="flex items-end justify-between"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white"><Trash2 size={22} /></span><div><h3 className="text-xl font-bold">Manage imported papers</h3><p className="text-sm text-slate-500">The built-in paper is protected and cannot be deleted.</p></div></div>{importedPapers.length > 0 && <div className="flex gap-2"><button className="btn-secondary text-sm" onClick={() => setSelectedPapers(selectedPapers.length === importedPapers.length ? [] : importedPapers.map((item) => item.paperId))}>{selectedPapers.length === importedPapers.length ? 'Clear selection' : 'Select all'}</button><button disabled={!selectedPapers.length} className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setConfirmation({ kind: 'delete', ids: selectedPapers, title: `Delete ${selectedPapers.length} paper${selectedPapers.length === 1 ? '' : 's'}?`, detail: 'The selected question papers will be permanently removed. Saved attempts linked to deleted papers can no longer be opened for detailed review.' })}><Trash2 className="mr-2 inline" size={16} /> Delete selected</button></div>}</div>
        <div className="card mt-4 overflow-hidden">
          {importedPapers.length ? importedPapers.map((paper) => {
            const selected = selectedPapers.includes(paper.paperId);
            return <label className={`flex cursor-pointer items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0 ${selected ? 'bg-red-50' : 'hover:bg-slate-50'}`} key={paper.paperId}><input className="h-4 w-4 accent-red-600" type="checkbox" checked={selected} onChange={() => setSelectedPapers((current) => current.includes(paper.paperId) ? current.filter((id) => id !== paper.paperId) : [...current, paper.paperId])} /><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><UploadCloud size={20} /></span><span className="min-w-0 flex-1"><b className="block truncate">{paper.title}</b><span className="text-xs text-slate-500">70 questions · 100 marks{paper.importedAt ? ` · Imported ${new Date(paper.importedAt).toLocaleDateString()}` : ''}</span></span><button className="rounded-lg p-2 text-slate-400 hover:bg-red-100 hover:text-red-700" title="Delete this paper" onClick={(event) => { event.preventDefault(); setConfirmation({ kind: 'delete', ids: [paper.paperId], title: `Delete “${paper.title}”?`, detail: 'This question paper will be permanently removed from this computer.' }); }}><Trash2 size={18} /></button></label>;
          }) : <div className="p-10 text-center text-slate-500">No imported papers yet. Use the bulk uploader above to add papers.</div>}
        </div>
      </section>

      {confirmation && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-6" role="dialog" aria-modal="true"><div className="card w-full max-w-md p-7 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-700"><AlertTriangle size={28} /></span><h3 className="mt-4 text-2xl font-bold">{confirmation.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{confirmation.detail}</p><div className="mt-6 flex gap-3"><button disabled={busy} className="btn-secondary flex-1" onClick={() => setConfirmation(null)}>Cancel</button><button disabled={busy} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-bold text-white hover:bg-red-700 disabled:opacity-50" onClick={() => void runConfirmedAction()}>{busy ? 'Working…' : 'Yes, continue'}</button></div></div></div>}
    </section>
  );
}

function ResetCard({ name, count, icon, color, onReset }: { name: string; count: number; icon: React.ReactNode; color: string; onReset: () => void }) {
  return <article className="card overflow-hidden"><div className={`flex items-center gap-3 bg-gradient-to-r ${color} p-4 text-white`}><span className="rounded-lg bg-white/20 p-2">{icon}</span><div><b>{name}</b><p className="text-xs text-white/80">{count} saved attempt{count === 1 ? '' : 's'}</p></div></div><div className="p-4"><button disabled={!count} className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40" onClick={onReset}>Reset results</button></div></article>;
}
