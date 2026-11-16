import { BarChart3, CheckCircle2, Clock3, Eye, Home, Target, XCircle } from 'lucide-react';
import { Attempt, Paper } from '../types/exam';
import { formatDuration, resultForAttempt } from '../utils/scoring';

interface Props {
  attempt: Attempt;
  paper: Paper;
  onReview: () => void;
  onDashboard: () => void;
}

export default function Scorecard({ attempt, paper, onReview, onDashboard }: Props) {
  const result = resultForAttempt(attempt, paper);
  return (
    <main className="min-h-screen bg-canvas p-8">
      <section className="mx-auto max-w-6xl">
        <header className="card overflow-hidden">
          <div className="flex items-center justify-between bg-navy px-8 py-6 text-white">
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">Official-style scorecard</p><h1 className="mt-2 text-2xl font-bold">{paper.title}</h1><p className="mt-1 text-sm text-blue-200">Submitted {new Date(attempt.timestamp).toLocaleString()}{attempt.submittedByTimer ? ' · Auto-submitted at 00:00' : ''}</p></div>
            <div className="rounded-2xl bg-white/10 px-8 py-4 text-center"><p className="text-xs uppercase tracking-wider text-blue-200">Total score</p><p className="text-4xl font-extrabold">{result.score}<span className="text-lg text-blue-200"> / {result.maxScore}</span></p><p className="text-sm font-semibold text-orange-300">{result.percentage}%</p></div>
          </div>
          <div className="grid grid-cols-7 divide-x divide-slate-200 p-6">
            <Metric icon={<BarChart3 />} label="Questions" value={result.total} color="text-navy" />
            <Metric icon={<Target />} label="Attempted" value={result.attempted} color="text-blue-600" />
            <Metric icon={<CheckCircle2 />} label="Correct" value={result.correct} color="text-emerald-600" />
            <Metric icon={<XCircle />} label="Wrong" value={result.wrong} color="text-red-600" />
            <Metric icon={<Target />} label="Skipped" value={result.skipped} color="text-slate-500" />
            <Metric icon={<Target />} label="Accuracy" value={`${result.accuracy}%`} color="text-violet-600" />
            <Metric icon={<Clock3 />} label="Time taken" value={formatDuration(attempt.timeTakenSeconds)} color="text-amber-600" />
          </div>
        </header>

        <section className="card mt-6 overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4"><h2 className="text-xl font-bold">Subject-wise performance</h2><p className="mt-1 text-sm text-slate-500">Rajasthan GK contributes 46 of the 100 marks.</p></div>
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-6 py-4">Subject</th><th>Total</th><th>Correct</th><th>Wrong</th><th>Skipped</th><th>Accuracy</th><th>Score</th></tr></thead>
            <tbody>
              {result.subjects.map((row) => <tr className={`border-t border-slate-100 ${row.subject === 'Rajasthan GK' ? 'bg-orange-50/60' : ''}`} key={row.subject}><td className="px-6 py-4 font-semibold">{row.subject}{row.subject === 'Rajasthan GK' && <span className="ml-2 rounded bg-orange-100 px-2 py-1 text-[10px] font-bold text-orange-800">46 MARKS</span>}</td><td>{row.total}</td><td className="font-semibold text-emerald-700">{row.correct}</td><td className="font-semibold text-red-700">{row.wrong}</td><td>{row.skipped}</td><td>{row.accuracy}%</td><td className="font-bold">{row.score} / {row.maxScore}</td></tr>)}
            </tbody>
          </table>
        </section>

        <div className="mt-6 flex justify-end gap-3"><button className="btn-secondary flex items-center gap-2" onClick={onDashboard}><Home size={18} /> Dashboard</button><button className="btn-primary flex items-center gap-2" onClick={onReview}><Eye size={18} /> View detailed paper review</button></div>
      </section>
    </main>
  );
}

function Metric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: React.ReactNode; color: string }) {
  return <div className="px-4 text-center"><div className={`mx-auto flex justify-center ${color}`}>{icon}</div><b className="mt-2 block text-xl text-slate-900">{value}</b><span className="text-xs text-slate-500">{label}</span></div>;
}
