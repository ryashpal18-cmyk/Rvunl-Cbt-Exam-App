import { FormEvent, useMemo, useState } from 'react';
import { AlertTriangle, ArchiveRestore, Check, DatabaseBackup, FileDown, FileText, KeyRound, LockKeyhole, LockOpen, Plus, ShieldCheck, Trash2, UploadCloud, UserRound, UsersRound, X } from 'lucide-react';
import { Attempt, Paper, ProfileRecord, UserId } from '../types/exam';
import { buildResultsCsv, buildResultsPdf } from '../utils/reportExport';
import Importer from './Importer';

interface Props {
  attempts: Attempt[];
  papers: Paper[];
  profiles: ProfileRecord[];
  onVerifyPin: (pin: string) => Promise<boolean>;
  onChangePin: (currentPin: string, newPin: string) => Promise<void>;
  onImport: (papers: Paper[], pin: string) => Promise<number>;
  onDeletePapers: (paperIds: string[], pin: string) => Promise<number>;
  onResetResults: (target: UserId | 'all', pin: string) => Promise<number>;
  onAddProfile: (name: string, pin: string) => Promise<ProfileRecord>;
  onDeleteProfile: (userId: UserId, pin: string) => Promise<number>;
  onExportBackup: (pin: string) => Promise<boolean>;
  onImportBackup: (pin: string) => Promise<boolean>;
  onSaveExport: (name: string, data: Uint8Array, kind: 'csv' | 'pdf', pin: string) => Promise<boolean>;
}

type Confirmation =
  | { kind: 'reset'; target: UserId | 'all'; title: string; detail: string }
  | { kind: 'papers'; ids: string[]; title: string; detail: string }
  | { kind: 'profile'; userId: UserId; title: string; detail: string }
  | { kind: 'restore'; title: string; detail: string };

export default function AdminPanel(props: Props) {
  const { attempts, papers, profiles } = props;
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedPapers, setSelectedPapers] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const importedPapers = useMemo(() => papers.filter((paper) => paper.imported), [papers]);
  const countFor = (userId: UserId) => attempts.filter((attempt) => attempt.userId === userId).length;

  const unlock = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{4}$/.test(pin)) { setError('Enter the 4-digit admin PIN.'); return; }
    if (!(await props.onVerifyPin(pin))) { setError('Incorrect admin PIN.'); setPin(''); return; }
    setUnlocked(true); setError(''); setNotice('Admin settings unlocked.');
  };
  const importPapers = async (newPapers: Paper[]) => { const count = await props.onImport(newPapers, pin); setNotice(`${count} paper${count === 1 ? '' : 's'} imported successfully.`); };
  const downloadTemplate = async (data: Uint8Array) => {
    try { if (await props.onSaveExport('rvunl-question-paper-template.csv', data, 'csv', pin)) setNotice('Question paper CSV template saved.'); }
    catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Could not save the template.'); }
  };
  const addUser = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    try { const profile = await props.onAddProfile(newUserName, pin); setNewUserName(''); setNotice(`${profile.name}'s student profile was added.`); }
    catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Could not add profile.'); }
  };
  const changePin = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!/^\d{4}$/.test(newPin) || newPin !== confirmPin) { setError('New PIN must contain four digits and both entries must match.'); return; }
    try { await props.onChangePin(pin, newPin); setPin(newPin); setNewPin(''); setConfirmPin(''); setNotice('Admin PIN changed successfully. Use the new PIN next time.'); }
    catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Could not change admin PIN.'); }
  };
  const runSimpleAction = async (action: () => Promise<boolean>, successMessage: string) => {
    setBusy(true); setError('');
    try { if (await action()) setNotice(successMessage); }
    catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'The admin action failed.'); }
    finally { setBusy(false); }
  };
  const exportResults = async (kind: 'csv' | 'pdf') => {
    setBusy(true); setError('');
    try {
      const data = kind === 'csv' ? buildResultsCsv(attempts, profiles) : await buildResultsPdf(attempts, profiles);
      const saved = await props.onSaveExport(`rvunl-results-${new Date().toISOString().slice(0, 10)}.${kind}`, data, kind, pin);
      if (saved) setNotice(`${kind.toUpperCase()} result report saved.`);
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Could not export results.'); }
    finally { setBusy(false); }
  };
  const runConfirmedAction = async () => {
    if (!confirmation) return;
    setBusy(true); setError('');
    try {
      if (confirmation.kind === 'reset') { const count = await props.onResetResults(confirmation.target, pin); setNotice(`${count} saved result${count === 1 ? '' : 's'} reset.`); }
      if (confirmation.kind === 'papers') { const count = await props.onDeletePapers(confirmation.ids, pin); setSelectedPapers([]); setNotice(`${count} imported paper${count === 1 ? '' : 's'} deleted.`); }
      if (confirmation.kind === 'profile') { const count = await props.onDeleteProfile(confirmation.userId, pin); setNotice(`Student profile and ${count} linked result${count === 1 ? '' : 's'} deleted.`); }
      if (confirmation.kind === 'restore') { const restored = await props.onImportBackup(pin); if (restored) setNotice('Backup restored successfully.'); }
      setConfirmation(null);
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'The admin action failed.'); }
    finally { setBusy(false); }
  };

  if (!unlocked) return <section className="mx-auto max-w-xl py-12"><div className="overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-500 p-[2px] shadow-2xl shadow-violet-200"><form onSubmit={(event) => void unlock(event)} className="rounded-[22px] bg-white p-9 text-center"><span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-200"><LockKeyhole size={38} /></span><p className="eyebrow mt-6">Protected settings</p><h2 className="mt-2 text-3xl font-extrabold">Admin Panel</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">Users, results, backups, reports and question papers are protected from student changes.</p><label className="mx-auto mt-7 block max-w-xs text-left text-sm font-bold">Admin PIN<div className="relative mt-2"><KeyRound className="absolute left-4 top-3.5 text-violet-500" size={20} /><input autoFocus className="w-full rounded-xl border-2 border-violet-200 bg-violet-50/50 py-3 pl-12 pr-4 text-center text-xl font-bold tracking-[0.55em]" inputMode="numeric" maxLength={4} type="password" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} /></div></label>{error && <p className="mx-auto mt-3 max-w-xs rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}<button className="btn-primary mt-6 w-full max-w-xs bg-gradient-to-r from-violet-700 to-fuchsia-600" type="submit"><LockOpen className="mr-2 inline" size={18} /> Unlock settings</button></form></div></section>;

  return <section>
    <header className="flex items-start justify-between rounded-3xl bg-gradient-to-r from-violet-700 via-fuchsia-600 to-orange-500 p-7 text-white shadow-xl shadow-violet-200/60"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-100">Secure controls</p><h2 className="mt-2 text-3xl font-extrabold">Admin Settings</h2><p className="mt-2 text-sm text-white/85">Manage students, data, reports and question papers.</p></div><button className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20" onClick={() => { setUnlocked(false); setPin(''); setNotice(''); }}><LockKeyhole className="mr-2 inline" size={17} /> Lock panel</button></header>
    {notice && <div className="mt-5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><span className="flex items-center gap-2"><Check size={18} />{notice}</span><button onClick={() => setNotice('')}><X size={17} /></button></div>}
    {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}

    <AdminSection icon={<UsersRound />} title="Student profiles & result reset" subtitle="Add students, clear their result history, or remove custom profiles." color="from-cyan-500 to-blue-600">
      <form className="mb-4 flex gap-3" onSubmit={(event) => void addUser(event)}><input className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3" maxLength={30} placeholder="New student name" value={newUserName} onChange={(event) => setNewUserName(event.target.value)} /><button className="btn-primary" type="submit"><Plus className="mr-2 inline" size={17} />Add student</button></form>
      <div className="grid grid-cols-3 gap-4">{profiles.map((profile, index) => <ResetCard key={profile.id} profile={profile} count={countFor(profile.id)} color={index % 3 === 0 ? 'from-cyan-600 to-blue-600' : index % 3 === 1 ? 'from-violet-600 to-fuchsia-600' : 'from-emerald-500 to-teal-600'} onReset={() => setConfirmation({ kind: 'reset', target: profile.id, title: `Reset ${profile.name}'s results?`, detail: `This removes ${countFor(profile.id)} saved attempt(s) and clears this student's Mistake Bank.` })} onDelete={profile.builtIn ? undefined : () => setConfirmation({ kind: 'profile', userId: profile.id, title: `Delete ${profile.name}'s profile?`, detail: 'The profile, its PIN and all linked results will be permanently deleted.' })} />)}<ResetCard profile={{ id: 'all', name: 'All profiles', pinConfigured: false }} count={attempts.length} color="from-rose-500 to-orange-500" onReset={() => setConfirmation({ kind: 'reset', target: 'all', title: 'Reset all results?', detail: `This removes all ${attempts.length} saved attempts for every student.` })} /></div>
    </AdminSection>

    <AdminSection icon={<DatabaseBackup />} title="Backup, restore & result reports" subtitle="Protect local data and export progress reports." color="from-emerald-500 to-teal-600"><div className="grid grid-cols-4 gap-3"><ActionButton icon={<DatabaseBackup />} label="Export All Data (.json)" disabled={busy} onClick={() => runSimpleAction(() => props.onExportBackup(pin), 'Backup file saved.')} /><ActionButton icon={<ArchiveRestore />} label="Import Backup (.json)" disabled={busy} onClick={() => setConfirmation({ kind: 'restore', title: 'Restore backup?', detail: 'The selected backup replaces current profiles, results, imported papers, bookmarks and typing history.' })} /><ActionButton icon={<FileDown />} label="Export CSV" disabled={!attempts.length || busy} onClick={() => void exportResults('csv')} /><ActionButton icon={<FileText />} label="Export PDF" disabled={!attempts.length || busy} onClick={() => void exportResults('pdf')} /></div></AdminSection>

    <div className="my-8 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
    <Importer onImport={importPapers} onDownloadTemplate={downloadTemplate} />

    <AdminSection icon={<Trash2 />} title="Manage imported papers" subtitle="Select one or many papers. The built-in paper stays protected." color="from-red-500 to-rose-600"><div className="mb-3 flex justify-end gap-2">{importedPapers.length > 0 && <><button className="btn-secondary text-sm" onClick={() => setSelectedPapers(selectedPapers.length === importedPapers.length ? [] : importedPapers.map((item) => item.paperId))}>{selectedPapers.length === importedPapers.length ? 'Clear selection' : 'Select all'}</button><button disabled={!selectedPapers.length} className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40" onClick={() => setConfirmation({ kind: 'papers', ids: selectedPapers, title: `Delete ${selectedPapers.length} paper(s)?`, detail: 'The selected papers will be permanently removed.' })}><Trash2 className="mr-2 inline" size={16} />Delete selected</button></>}</div><div className="card overflow-hidden">{importedPapers.length ? importedPapers.map((paper) => { const selected = selectedPapers.includes(paper.paperId); return <label className={`flex cursor-pointer items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0 ${selected ? 'bg-red-50' : 'hover:bg-slate-50'}`} key={paper.paperId}><input className="h-4 w-4 accent-red-600" type="checkbox" checked={selected} onChange={() => setSelectedPapers((current) => current.includes(paper.paperId) ? current.filter((id) => id !== paper.paperId) : [...current, paper.paperId])} /><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><UploadCloud size={20} /></span><span className="min-w-0 flex-1"><b className="block truncate">{paper.title}</b><span className="text-xs text-slate-500">{paper.category ?? 'Full Mock'} · {paper.difficulty ?? 'Medium'} · {paper.year ?? '—'}</span></span><button className="rounded-lg p-2 text-slate-400 hover:bg-red-100 hover:text-red-700" onClick={(event) => { event.preventDefault(); setConfirmation({ kind: 'papers', ids: [paper.paperId], title: `Delete “${paper.title}”?`, detail: 'This question paper will be permanently removed.' }); }}><Trash2 size={18} /></button></label>; }) : <div className="p-10 text-center text-slate-500">No imported papers yet.</div>}</div></AdminSection>

    <AdminSection icon={<ShieldCheck />} title="Change admin PIN" subtitle="The new PIN is stored as a salted hash on this computer." color="from-amber-500 to-orange-600"><form className="grid grid-cols-[1fr_1fr_auto] gap-3" onSubmit={(event) => void changePin(event)}><input className="rounded-xl border border-slate-300 px-4 py-3 text-center tracking-[0.35em]" inputMode="numeric" maxLength={4} placeholder="New PIN" type="password" value={newPin} onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ''))} /><input className="rounded-xl border border-slate-300 px-4 py-3 text-center tracking-[0.35em]" inputMode="numeric" maxLength={4} placeholder="Confirm PIN" type="password" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))} /><button className="btn-primary" type="submit">Change PIN</button></form></AdminSection>

    {confirmation && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-6"><div className="card w-full max-w-md p-7 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-700"><AlertTriangle size={28} /></span><h3 className="mt-4 text-2xl font-bold">{confirmation.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{confirmation.detail}</p><div className="mt-6 flex gap-3"><button disabled={busy} className="btn-secondary flex-1" onClick={() => setConfirmation(null)}>Cancel</button><button disabled={busy} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-bold text-white disabled:opacity-50" onClick={() => void runConfirmedAction()}>{busy ? 'Working…' : 'Yes, continue'}</button></div></div></div>}
  </section>;
}

function AdminSection({ icon, title, subtitle, color, children }: { icon: React.ReactNode; title: string; subtitle: string; color: string; children: React.ReactNode }) { return <section className="mt-8"><div className="mb-4 flex items-center gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white ${color}`}>{icon}</span><div><h3 className="text-xl font-bold">{title}</h3><p className="text-sm text-slate-500">{subtitle}</p></div></div>{children}</section>; }
function ResetCard({ profile, count, color, onReset, onDelete }: { profile: ProfileRecord; count: number; color: string; onReset: () => void; onDelete?: () => void }) { return <article className="card overflow-hidden"><div className={`flex items-center gap-3 bg-gradient-to-r p-4 text-white ${color}`}><UserRound /><div className="min-w-0"><b className="block truncate">{profile.name}</b><p className="text-xs text-white/80">{count} saved attempt{count === 1 ? '' : 's'}</p></div></div><div className="flex gap-2 p-3"><button disabled={!count} className="flex-1 rounded-lg bg-red-50 px-2 py-2 text-xs font-bold text-red-700 disabled:opacity-40" onClick={onReset}>Reset</button>{onDelete && <button className="rounded-lg border border-red-200 px-3 text-red-600 hover:bg-red-50" onClick={onDelete}><Trash2 size={15} /></button>}</div></article>; }
function ActionButton({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void | Promise<void>; disabled?: boolean }) { return <button disabled={disabled} className="card flex items-center justify-center gap-2 p-4 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 disabled:opacity-40" onClick={() => void onClick()}>{icon}{label}</button>; }
