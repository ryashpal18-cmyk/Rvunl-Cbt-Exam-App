import { useState } from 'react';
import { Award, BarChart3, BookOpen, Clock3, History, LogOut, Play, Settings2, Sparkles, Target, TriangleAlert } from 'lucide-react';
import { Attempt, Paper, UserId } from '../types/exam';
import AdminPanel from './AdminPanel';
import ComparisonView from './ComparisonView';
import MistakeBank from './MistakeBank';

type Page = 'overview' | 'mistakes' | 'compare' | 'admin';

interface Props {
  userId: UserId;
  userName: string;
  attempts: Attempt[];
  papers: Paper[];
  onStart: (paper: Paper) => void;
  onOpenAttempt: (attempt: Attempt) => void;
  onVerifyAdminPin: (pin: string) => Promise<boolean>;
  onImportPapers: (papers: Paper[], pin: string) => Promise<number>;
  onDeletePapers: (paperIds: string[], pin: string) => Promise<number>;
  onResetResults: (target: UserId | 'all', pin: string) => Promise<number>;
  onLogout: () => void;
}

const paperColors = [
  'from-cyan-500 to-blue-600 shadow-cyan-200',
  'from-violet-600 to-fuchsia-600 shadow-violet-200',
  'from-orange-500 to-rose-500 shadow-orange-200',
  'from-emerald-500 to-teal-600 shadow-emerald-200',
];

export default function Dashboard({ userId, userName, attempts, papers, onStart, onOpenAttempt, onVerifyAdminPin, onImportPapers, onDeletePapers, onResetResults, onLogout }: Props) {
  const [page, setPage] = useState<Page>('overview');
  const userAttempts = attempts.filter((attempt) => attempt.userId === userId && papers.some((paper) => paper.paperId === attempt.paperId));
  const average = userAttempts.length ? userAttempts.reduce((sum, attempt) => sum + attempt.totalScore, 0) / userAttempts.length : 0;
  const highest = userAttempts.length ? Math.max(...userAttempts.map((attempt) => attempt.totalScore)) : 0;
  const averageTime = userAttempts.length ? Math.round(userAttempts.reduce((sum, attempt) => sum + attempt.timeTakenSeconds, 0) / userAttempts.length / 60) : 0;

  return (
    <main className="flex min-h-screen bg-[radial-gradient(circle_at_85%_5%,rgba(216,180,254,0.28),transparent_28%),radial-gradient(circle_at_25%_30%,rgba(125,211,252,0.22),transparent_26%),linear-gradient(145deg,#f8fafc,#f5f3ff_48%,#fff7ed)]">
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col overflow-hidden bg-gradient-to-b from-[#142f5b] via-[#312e81] to-[#581c87] p-5 text-white shadow-2xl">
        <div className="pointer-events-none absolute -left-16 top-32 h-40 w-40 rounded-full bg-cyan-400/15 blur-2xl" />
        <div className="pointer-events-none absolute -right-20 bottom-24 h-48 w-48 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative flex items-center gap-3 border-b border-white/15 pb-5"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 text-xl font-extrabold shadow-lg shadow-orange-950/30">R</span><div><b className="block text-lg">RVUNL CBT</b><span className="text-xs text-blue-100">Offline mock suite</span></div></div>
        <nav className="relative mt-6 space-y-2"><Nav active={page === 'overview'} icon={<BookOpen />} label="Dashboard" onClick={() => setPage('overview')} /><Nav active={page === 'mistakes'} icon={<TriangleAlert />} label="Mistake Bank" onClick={() => setPage('mistakes')} /><Nav active={page === 'compare'} icon={<BarChart3 />} label="Compare profiles" onClick={() => setPage('compare')} /><Nav active={page === 'admin'} icon={<Settings2 />} label="Admin Settings" onClick={() => setPage('admin')} /></nav>
        <div className="relative mt-auto rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><p className="text-xs text-violet-100">Signed in as</p><b className="text-lg">{userName}</b><button className="mt-3 flex items-center gap-2 text-sm text-blue-100 hover:text-white" onClick={onLogout}><LogOut size={16} /> Switch profile</button></div>
      </aside>

      <section className="ml-64 min-w-0 flex-1 p-8">
        <div className="mx-auto max-w-6xl">
          {page === 'overview' && <>
            <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-600 via-blue-700 to-violet-700 p-8 text-white shadow-xl shadow-blue-200/70">
              <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-fuchsia-400/25 blur-2xl" /><div className="pointer-events-none absolute bottom-0 right-48 h-24 w-24 rounded-full bg-orange-300/20 blur-xl" />
              <div className="relative"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-100"><Sparkles size={15} /> Candidate dashboard</p><h1 className="mt-3 text-4xl font-extrabold">Welcome back, {userName}</h1><p className="mt-3 max-w-xl text-blue-100">हर mock test के साथ speed, accuracy और confidence बेहतर करें। अपना paper चुनें और परीक्षा शुरू करें।</p></div>
            </header>

            <div className="mt-6 grid grid-cols-4 gap-4">
              <DashboardStat icon={<History />} label="Completed attempts" value={userAttempts.length} color="from-cyan-500 to-blue-600" />
              <DashboardStat icon={<Award />} label="Highest score" value={`${highest.toFixed(highest % 1 ? 2 : 0)} / 100`} color="from-violet-600 to-fuchsia-600" />
              <DashboardStat icon={<Target />} label="Average score" value={`${average.toFixed(1)} / 100`} color="from-orange-500 to-rose-500" />
              <DashboardStat icon={<Clock3 />} label="Average time" value={`${averageTime} min`} color="from-emerald-500 to-teal-600" />
            </div>

            <section className="mt-9"><div className="flex items-end justify-between"><div><h2 className="text-2xl font-bold text-slate-900">Available mock papers</h2><p className="mt-1 text-sm text-slate-500">Official pattern · 70 questions · 100 marks · 60 minutes</p></div><button className="rounded-full bg-violet-100 px-4 py-2 text-sm font-bold text-violet-700 hover:bg-violet-200" onClick={() => setPage('admin')}><Settings2 className="mr-2 inline" size={16} />Manage papers</button></div>
              <div className="mt-4 grid grid-cols-2 gap-5">{papers.map((paper, index) => <article className="group card overflow-hidden transition hover:-translate-y-1 hover:shadow-xl" key={paper.paperId}><div className={`h-2 bg-gradient-to-r ${paperColors[index % paperColors.length]}`} /><div className="p-6"><div className="flex items-start gap-4"><span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${paperColors[index % paperColors.length]}`}><BookOpen size={27} /></span><div className="min-w-0 flex-1"><span className={`rounded-full px-3 py-1 text-[10px] font-extrabold tracking-wider ${paper.imported ? 'bg-violet-100 text-violet-700' : 'bg-orange-100 text-orange-700'}`}>{paper.imported ? 'IMPORTED PAPER' : 'BUILT-IN PAPER'}</span><h3 className="mt-3 text-lg font-bold leading-6">{paper.title}</h3></div></div><div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs"><span className="rounded-lg bg-cyan-50 px-2 py-2 font-semibold text-cyan-800">{paper.questions.length} Questions</span><span className="rounded-lg bg-orange-50 px-2 py-2 font-semibold text-orange-800">{paper.questions.reduce((sum, question) => sum + question.marks, 0)} Marks</span><span className="rounded-lg bg-violet-50 px-2 py-2 font-semibold text-violet-800">{paper.durationMinutes} Minutes</span></div><button className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r py-3 font-bold text-white shadow-lg transition hover:brightness-110 ${paperColors[index % paperColors.length]}`} onClick={() => onStart(paper)}><Play size={17} fill="currentColor" /> Read instructions & start</button></div></article>)}</div>
            </section>

            <section className="mt-9"><h2 className="text-2xl font-bold">Recent attempts</h2><div className="card mt-4 overflow-hidden border-0 shadow-lg">{userAttempts.length ? userAttempts.slice(0, 8).map((attempt, index) => <button className="flex w-full items-center justify-between border-b border-slate-100 px-6 py-4 text-left last:border-0 hover:bg-violet-50/60" key={attempt.attemptId} onClick={() => onOpenAttempt(attempt)}><div className="flex items-center gap-4"><span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-extrabold text-white ${paperColors[index % paperColors.length]}`}>{index + 1}</span><div><b>{attempt.paperTitle}</b><p className="mt-1 text-xs text-slate-500">{new Date(attempt.timestamp).toLocaleString()} · {attempt.negativeMarking === 'none' ? 'No negative marking' : '¼ negative marking'}</p></div></div><div className="text-right"><b className="text-xl text-violet-700">{attempt.totalScore}</b><span className="text-sm text-slate-400"> / {attempt.maxScore}</span><p className="text-xs font-semibold text-violet-700">View scorecard →</p></div></button>) : <div className="p-10 text-center text-slate-500">No attempts yet. Your results will appear here.</div>}</div></section>
          </>}
          {page === 'mistakes' && <MistakeBank userId={userId} attempts={attempts} papers={papers} onPractice={onStart} />}
          {page === 'compare' && <ComparisonView attempts={attempts} papers={papers} />}
          {page === 'admin' && <AdminPanel attempts={attempts} papers={papers} onVerifyPin={onVerifyAdminPin} onImport={onImportPapers} onDeletePapers={onDeletePapers} onResetResults={onResetResults} />}
        </div>
      </section>
    </main>
  );
}

function Nav({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) { return <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${active ? 'bg-white text-violet-900 shadow-lg' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`} onClick={onClick}>{icon}{label}</button>; }
function DashboardStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: React.ReactNode; color: string }) { return <div className="card overflow-hidden border-0 p-0 shadow-lg"><div className={`h-1.5 bg-gradient-to-r ${color}`} /><div className="flex items-center gap-3 p-4"><span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white ${color}`}>{icon}</span><div><b className="text-xl">{value}</b><p className="text-xs text-slate-500">{label}</p></div></div></div>; }
