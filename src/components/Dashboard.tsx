import { useState } from 'react';
import { Award, BarChart3, BookOpen, FilePlus2, History, LogOut, Play, Trash2, TriangleAlert } from 'lucide-react';
import { Attempt, Paper, UserId } from '../types/exam';
import ComparisonView from './ComparisonView';
import Importer from './Importer';
import MistakeBank from './MistakeBank';

type Page = 'overview' | 'import' | 'mistakes' | 'compare';

interface Props {
  userId: UserId;
  userName: string;
  attempts: Attempt[];
  papers: Paper[];
  onStart: (paper: Paper) => void;
  onOpenAttempt: (attempt: Attempt) => void;
  onImport: (paper: Paper) => Promise<void>;
  onDeletePaper: (paperId: string) => Promise<void>;
  onLogout: () => void;
}

export default function Dashboard({ userId, userName, attempts, papers, onStart, onOpenAttempt, onImport, onDeletePaper, onLogout }: Props) {
  const [page, setPage] = useState<Page>('overview');
  const userAttempts = attempts.filter((attempt) => attempt.userId === userId && papers.some((paper) => paper.paperId === attempt.paperId));
  const average = userAttempts.length ? userAttempts.reduce((sum, attempt) => sum + attempt.totalScore, 0) / userAttempts.length : 0;
  const highest = userAttempts.length ? Math.max(...userAttempts.map((attempt) => attempt.totalScore)) : 0;
  const paperFor = (attempt: Attempt) => papers.find((paper) => paper.paperId === attempt.paperId);

  return (
    <main className="flex min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col bg-navy p-5 text-white">
        <div className="flex items-center gap-3 border-b border-white/15 pb-5"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-saffron font-extrabold">R</span><div><b className="block">RVUNL CBT</b><span className="text-xs text-blue-200">Offline mock suite</span></div></div>
        <nav className="mt-6 space-y-2"><Nav active={page === 'overview'} icon={<BookOpen />} label="Dashboard" onClick={() => setPage('overview')} /><Nav active={page === 'mistakes'} icon={<TriangleAlert />} label="Mistake Bank" onClick={() => setPage('mistakes')} /><Nav active={page === 'compare'} icon={<BarChart3 />} label="Compare profiles" onClick={() => setPage('compare')} /><Nav active={page === 'import'} icon={<FilePlus2 />} label="Import papers" onClick={() => setPage('import')} /></nav>
        <div className="mt-auto rounded-xl bg-white/10 p-4"><p className="text-xs text-blue-200">Signed in as</p><b>{userName}</b><button className="mt-3 flex items-center gap-2 text-sm text-blue-100 hover:text-white" onClick={onLogout}><LogOut size={16} /> Switch profile</button></div>
      </aside>
      <section className="ml-64 min-w-0 flex-1 p-8">
        <div className="mx-auto max-w-6xl">
          {page === 'overview' && <>
            <header><p className="eyebrow">Candidate dashboard</p><h1 className="mt-2 text-3xl font-extrabold">Welcome back, {userName}</h1><p className="mt-2 text-slate-600">Choose a paper and begin when you are ready.</p></header>
            <div className="mt-7 grid grid-cols-3 gap-5"><DashboardStat icon={<History />} label="Completed attempts" value={userAttempts.length} /><DashboardStat icon={<Award />} label="Highest score" value={`${highest.toFixed(highest % 1 ? 2 : 0)} / 100`} /><DashboardStat icon={<BarChart3 />} label="Average score" value={`${average.toFixed(1)} / 100`} /></div>
            <section className="mt-9"><div className="flex items-end justify-between"><div><h2 className="text-xl font-bold">Available mock papers</h2><p className="mt-1 text-sm text-slate-500">Official pattern: 70 questions · 100 marks · 60 minutes</p></div><button className="text-sm font-bold text-navy hover:underline" onClick={() => setPage('import')}>+ Import new paper</button></div>
              <div className="mt-4 grid grid-cols-2 gap-5">{papers.map((paper) => <article className="card p-6" key={paper.paperId}><div className="flex items-start justify-between"><span className={`rounded-lg px-3 py-1 text-xs font-bold ${paper.imported ? 'bg-violet-50 text-violet-700' : 'bg-orange-50 text-orange-700'}`}>{paper.imported ? 'IMPORTED' : 'BUILT-IN'}</span>{paper.imported && <button title="Delete imported paper" className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => void onDeletePaper(paper.paperId)}><Trash2 size={17} /></button>}</div><h3 className="mt-4 text-lg font-bold">{paper.title}</h3><p className="mt-2 text-sm text-slate-500">{paper.questions.length} questions · {paper.questions.reduce((sum, question) => sum + question.marks, 0)} marks · {paper.durationMinutes} minutes</p><button className="btn-primary mt-6 flex w-full items-center justify-center gap-2" onClick={() => onStart(paper)}><Play size={17} fill="currentColor" /> Read instructions & start</button></article>)}</div>
            </section>
            <section className="mt-9"><h2 className="text-xl font-bold">Recent attempts</h2><div className="card mt-4 overflow-hidden">{userAttempts.length ? userAttempts.slice(0, 8).map((attempt) => <button className="flex w-full items-center justify-between border-b border-slate-100 px-6 py-4 text-left last:border-0 hover:bg-slate-50" key={attempt.attemptId} onClick={() => onOpenAttempt(attempt)}><div><b>{attempt.paperTitle}</b><p className="mt-1 text-xs text-slate-500">{new Date(attempt.timestamp).toLocaleString()} · {attempt.negativeMarking === 'none' ? 'No negative marking' : '¼ negative marking'}</p></div><div className="text-right"><b className="text-xl text-navy">{attempt.totalScore}</b><span className="text-sm text-slate-400"> / {attempt.maxScore}</span><p className="text-xs font-semibold text-navy">View scorecard →</p></div></button>) : <div className="p-10 text-center text-slate-500">No attempts yet. Your results will appear here.</div>}</div></section>
          </>}
          {page === 'import' && <Importer onImport={onImport} />}
          {page === 'mistakes' && <MistakeBank userId={userId} attempts={attempts} papers={papers} onPractice={onStart} />}
          {page === 'compare' && <ComparisonView attempts={attempts} papers={papers} />}
        </div>
      </section>
    </main>
  );
}

function Nav({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) { return <button className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold ${active ? 'bg-white text-navy' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`} onClick={onClick}>{icon}{label}</button>; }
function DashboardStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) { return <div className="card flex items-center gap-4 p-5"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-navy">{icon}</span><div><b className="text-2xl">{value}</b><p className="text-xs text-slate-500">{label}</p></div></div>; }
