import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Languages, MousePointerClick, ShieldCheck, Shuffle } from 'lucide-react';
import { ExamConfig, Language, NegativeMarking, Paper } from '../types/exam';

interface Props {
  paper: Paper;
  onBack: () => void;
  onStart: (config: ExamConfig) => void;
}

export default function InstructionsModal({ paper, onBack, onStart }: Props) {
  const [language, setLanguage] = useState<Language>('en');
  const [negativeMarking, setNegativeMarking] = useState<NegativeMarking>('none');
  const [strictOmnibus, setStrictOmnibus] = useState(true);
  const [mouseOnly, setMouseOnly] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const maxMarks = paper.questions.reduce((sum, q) => sum + Number(q.marks), 0);

  const legend = [
    { label: 'Answered', cls: 'bg-emerald-600 text-white' },
    { label: 'Visited & not answered', cls: 'bg-red-600 text-white' },
    { label: 'Marked for review', cls: 'bg-violet-700 text-white' },
    { label: 'Answered & marked', cls: 'bg-violet-700 text-white ring-2 ring-emerald-400' },
    { label: 'Not visited', cls: 'border border-slate-300 bg-slate-50 text-slate-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Candidate instructions</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{paper.title}</h1>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat icon={<Clock3 className="h-4 w-4 text-blue-700" />} value={`${paper.durationMinutes} min`} label="Strict timer" />
            <Stat icon={<CheckCircle2 className="h-4 w-4 text-emerald-700" />} value={`${paper.questions.length} Qs`} label="Omnibus paper" />
            <Stat icon={<ShieldCheck className="h-4 w-4 text-amber-600" />} value={`${maxMarks} marks`} label="No live answers" />
          </div>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Important instructions</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
                <li>The exam opens in fullscreen mode and auto-submits when the countdown reaches <strong>00:00</strong>.</li>
                <li>Each question has 5 options (A–E) with only one correct answer.</li>
                <li>No right/wrong hints or explanations are shown while the exam is running.</li>
                <li>Unless Strict Mouse-Only Mode is enabled, use keys <strong>1–5</strong> to select options, <strong>Enter</strong> for Save &amp; Next, and <strong>M</strong> to Mark for Review.</li>
                <li>All <em>Answered &amp; Marked for Review</em> responses are evaluated in final scoring.</li>
              </ol>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Question palette legend</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {legend.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-xs text-slate-700">
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md font-bold ${item.cls}`}>1</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-800">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-blue-700" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
              <span>
                <AlertTriangle className="mr-1 inline h-4 w-4 text-amber-600" />
                I have read the instructions. Leaving or minimizing the exam screen does not pause the timer.
              </span>
            </label>
          </div>

          <aside className="space-y-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-base font-bold text-slate-900">Exam settings</h2>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Languages className="h-4 w-4" /> Default language
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['en', 'hi'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold ${language === lang ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
                  >
                    {lang === 'en' ? 'English' : 'हिन्दी'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Negative marking</label>
              <select
                value={negativeMarking}
                onChange={(e) => setNegativeMarking(e.target.value as NegativeMarking)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              >
                <option value="none">None · Official Phase-I</option>
                <option value="quarter">¼ of question marks</option>
              </select>
            </div>

            <div className="space-y-2.5 border-t border-slate-200 pt-3 text-sm text-slate-700">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-blue-700" checked={strictOmnibus} onChange={(e) => setStrictOmnibus(e.target.checked)} />
                <span>Hide subject tags (Strict Omnibus)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-blue-700" checked={mouseOnly} onChange={(e) => setMouseOnly(e.target.checked)} />
                <span className="flex items-center gap-1"><MousePointerClick className="h-3.5 w-3.5" /> Strict Mouse-Only CBT Mode</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-blue-700" checked={shuffleQuestions} onChange={(e) => setShuffleQuestions(e.target.checked)} />
                <span className="flex items-center gap-1"><Shuffle className="h-3.5 w-3.5" /> Shuffle Questions</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-blue-700" checked={shuffleOptions} onChange={(e) => setShuffleOptions(e.target.checked)} />
                <span className="flex items-center gap-1"><Shuffle className="h-3.5 w-3.5" /> Shuffle Options (A–E)</span>
              </label>
            </div>

            <div className="space-y-2 pt-2">
              <button
                disabled={!accepted}
                onClick={() => onStart({ language, negativeMarking, strictOmnibus, mouseOnly, shuffleQuestions, shuffleOptions })}
                className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Start exam
              </button>
              <button onClick={onBack} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                Return to dashboard
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: JSX.Element; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
      <div className="flex items-center justify-center gap-1 text-sm font-bold text-slate-900">{icon}{value}</div>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}
