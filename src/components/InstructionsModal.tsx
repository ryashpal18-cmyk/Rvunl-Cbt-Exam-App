import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Languages, ShieldCheck } from 'lucide-react';
import { ExamConfig, Language, NegativeMarking, Paper } from '../types/exam';

interface Props {
  paper: Paper;
  onBack: () => void;
  onStart: (config: ExamConfig) => void;
}

const legend = [
  ['bg-emerald-600 text-white', 'Answered'],
  ['bg-red-600 text-white', 'Visited & not answered'],
  ['bg-violet-700 text-white', 'Marked for review'],
  ['bg-violet-700 text-white ring-4 ring-emerald-400 ring-inset', 'Answered & marked'],
  ['bg-slate-100 text-slate-600 border border-slate-300', 'Not visited'],
];

export default function InstructionsModal({ paper, onBack, onStart }: Props) {
  const [language, setLanguage] = useState<Language>('en');
  const [negativeMarking, setNegativeMarking] = useState<NegativeMarking>('none');
  const [strictOmnibus, setStrictOmnibus] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const maxMarks = paper.questions.reduce((sum, question) => sum + question.marks, 0);

  return (
    <main className="min-h-screen bg-canvas p-8">
      <section className="mx-auto max-w-5xl card overflow-hidden">
        <header className="bg-navy px-8 py-6 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">Candidate instructions</p>
          <h1 className="mt-2 text-2xl font-bold">{paper.title}</h1>
        </header>
        <div className="grid grid-cols-[1fr_340px] gap-8 p-8">
          <div>
            <div className="grid grid-cols-3 gap-4">
              <Stat icon={<Clock3 />} value={`${paper.durationMinutes} minutes`} label="Strict timer" />
              <Stat icon={<CheckCircle2 />} value={`${paper.questions.length} questions`} label="Single omnibus paper" />
              <Stat icon={<ShieldCheck />} value={`${maxMarks} marks`} label="No live answers" />
            </div>
            <h2 className="mt-8 text-xl font-bold">Important instructions</h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <li><b>1.</b> The clock starts when you select “Start exam” and automatically submits at 00:00.</li>
              <li><b>2.</b> Choose exactly one of five options. Use Save & Next to move ahead.</li>
              <li><b>3.</b> Correct answers and explanations remain hidden until submission.</li>
              <li><b>4.</b> Keyboard shortcuts: 1–5 select A–E, Enter saves and moves next, M marks for review.</li>
              <li><b>5.</b> An answered question marked for review is still evaluated.</li>
            </ol>
            <h2 className="mt-8 text-xl font-bold">Question palette legend</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {legend.map(([style, label], index) => <div className="flex items-center gap-3 text-sm" key={label}><span className={`flex h-9 w-9 items-center justify-center rounded-md font-bold ${style}`}>{index + 1}</span>{label}</div>)}
            </div>
            <label className="mt-8 flex cursor-pointer gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <input className="mt-1 h-4 w-4" type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
              <span><b>I have read the instructions.</b><br />I understand that leaving the exam screen does not pause the timer.</span>
            </label>
          </div>
          <aside className="rounded-2xl bg-slate-50 p-6">
            <h2 className="text-lg font-bold">Exam settings</h2>
            <label className="mt-5 block text-sm font-semibold"><Languages className="mr-2 inline" size={17} />Default language
              <select className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3" value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
                <option value="en">English</option><option value="hi">हिन्दी</option>
              </select>
            </label>
            <label className="mt-5 block text-sm font-semibold"><AlertTriangle className="mr-2 inline" size={17} />Negative marking
              <select className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3" value={negativeMarking} onChange={(event) => setNegativeMarking(event.target.value as NegativeMarking)}>
                <option value="none">None · Official Phase-I</option><option value="quarter">¼ of question marks</option>
              </select>
            </label>
            <label className="mt-5 flex gap-3 text-sm leading-5">
              <input className="mt-1" type="checkbox" checked={strictOmnibus} onChange={(event) => setStrictOmnibus(event.target.checked)} />
              <span><b>Strict omnibus mode</b><br /><span className="text-slate-500">Hide subject tags during the exam.</span></span>
            </label>
            <div className="mt-8 space-y-3">
              <button disabled={!accepted} className="btn-primary w-full py-3" onClick={() => onStart({ language, negativeMarking, strictOmnibus })}>Start exam</button>
              <button className="btn-secondary w-full" onClick={onBack}>Return to dashboard</button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return <div className="rounded-xl border border-slate-200 p-4"><span className="text-saffron">{icon}</span><b className="mt-3 block text-lg">{value}</b><span className="text-xs text-slate-500">{label}</span></div>;
}
