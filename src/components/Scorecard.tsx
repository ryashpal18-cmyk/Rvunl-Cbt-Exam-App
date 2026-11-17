import { BarChart3, CheckCircle2, Clock3, Eye, Home, Printer, ShieldCheck, Target, XCircle } from 'lucide-react';
import { Attempt, Paper } from '../types/exam';
import { formatDuration, resultForAttempt } from '../utils/scoring';

interface Props {
  attempt: Attempt;
  paper: Paper;
  onReview: () => void;
  onDashboard: () => void;
}

const CUTOFFS = [
  { label: 'ST', value: 58 },
  { label: 'SC', value: 62 },
  { label: 'EWS', value: 68 },
  { label: 'OBC', value: 72 },
  { label: 'GEN', value: 75 },
];

export default function Scorecard({ attempt, paper, onReview, onDashboard }: Props) {
  const result = resultForAttempt(attempt, paper);
  const inSafeZone = result.percentage >= 75;

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Official-style scorecard</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">{paper.title}</h1>
              <p className="mt-1 text-xs text-slate-500">
                Submitted {new Date(attempt.timestamp).toLocaleString()}
                {attempt.submittedByTimer ? ' · Auto-submitted at 00:00' : ''}
                {attempt.tabSwitchCount ? ` · Focus switches: ${attempt.tabSwitchCount}` : ''}
              </p>
            </div>
            <div className="rounded-2xl bg-blue-50 px-6 py-4 text-right">
              <p className="text-xs font-bold uppercase text-blue-700">Total Score</p>
              <p className="text-3xl font-extrabold text-blue-900">{result.score} / {result.maxScore}</p>
              <p className="text-xs font-semibold text-blue-700">{result.percentage}%</p>
            </div>
          </div>

          {/* Expected Cutoff Bar */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                <ShieldCheck className={`h-4 w-4 ${inSafeZone ? 'text-emerald-600' : 'text-amber-600'}`} />
                Expected Cutoff Indicator ({inSafeZone ? 'Safe Zone' : 'Needs Improvement'})
              </span>
              <span className="text-xs font-semibold text-slate-600">Your Score: {result.percentage}%</span>
            </div>
            <div className="relative mt-3 h-4 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full transition-all ${inSafeZone ? 'bg-emerald-600' : result.percentage >= 62 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, Math.max(0, result.percentage))}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] font-semibold text-slate-600">
              {CUTOFFS.map((c) => (
                <span key={c.label} className={result.percentage >= c.value ? 'text-emerald-700' : 'text-slate-500'}>
                  {c.label}: {c.value}% {result.percentage >= c.value ? '✓' : ''}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <Metric icon={<BarChart3 className="h-4 w-4" />} label="Questions" value={String(result.total)} color="text-slate-900" />
            <Metric icon={<Target className="h-4 w-4" />} label="Attempted" value={String(result.attempted)} color="text-blue-700" />
            <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Correct" value={String(result.correct)} color="text-emerald-700" />
            <Metric icon={<XCircle className="h-4 w-4" />} label="Wrong" value={String(result.wrong)} color="text-red-600" />
            <Metric icon={<Clock3 className="h-4 w-4" />} label="Skipped" value={String(result.skipped)} color="text-slate-600" />
            <Metric icon={<Target className="h-4 w-4" />} label="Accuracy" value={`${result.accuracy}%`} color="text-violet-700" />
            <Metric icon={<Clock3 className="h-4 w-4" />} label="Time taken" value={formatDuration(attempt.timeTakenSeconds)} color="text-slate-900" />
          </div>

          <div className="mt-8 overflow-x-auto">
            <h2 className="mb-3 text-base font-bold text-slate-900">Subject-wise performance</h2>
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
                  <th className="p-3">Subject</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Correct</th>
                  <th className="p-3">Wrong</th>
                  <th className="p-3">Skipped</th>
                  <th className="p-3">Accuracy</th>
                  <th className="p-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {result.subjects.map((row) => (
                  <tr key={row.subject} className={`border-b border-slate-100 ${row.subject === 'Rajasthan GK' ? 'bg-amber-50/60 font-semibold' : ''}`}>
                    <td className="p-3">
                      {row.subject}
                      {row.subject === 'Rajasthan GK' && (
                        <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">46 MARKS</span>
                      )}
                    </td>
                    <td className="p-3">{row.total}</td>
                    <td className="p-3 text-emerald-700">{row.correct}</td>
                    <td className="p-3 text-red-600">{row.wrong}</td>
                    <td className="p-3 text-slate-500">{row.skipped}</td>
                    <td className="p-3">{row.accuracy}%</td>
                    <td className="p-3 text-right font-bold">{row.score} / {row.maxScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="no-print mt-8 flex flex-wrap items-center justify-between gap-3">
            <button onClick={onDashboard} className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
              <Home className="h-4 w-4" /> Dashboard
            </button>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                <Printer className="h-4 w-4" /> Print / Save as PDF
              </button>
              <button onClick={onReview} className="flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800">
                <Eye className="h-4 w-4" /> View detailed paper review
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, color }: { icon: JSX.Element; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
      <div className={`flex items-center justify-center gap-1 text-lg font-extrabold ${color}`}>{icon}{value}</div>
      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{label}</p>
    </div>
  );
}
