import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Languages, MinusCircle, XCircle } from 'lucide-react';
import { Attempt, Language, Paper } from '../types/exam';

type Filter = 'all' | 'wrong' | 'skipped' | 'correct';

interface Props { attempt: Attempt; paper: Paper; onBack: () => void; }

export default function PaperReview({ attempt, paper, onBack }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [language, setLanguage] = useState<Language>('en');
  const filtered = useMemo(() => paper.questions.filter((question) => {
    const selected = attempt.responses[String(question.id)]?.selectedIndex;
    if (filter === 'skipped') return selected === undefined;
    if (filter === 'correct') return selected === question.correctIndex;
    if (filter === 'wrong') return selected !== undefined && selected !== question.correctIndex;
    return true;
  }), [attempt.responses, filter, paper.questions]);
  const labels = ['A', 'B', 'C', 'D', 'E'];
  const counts = {
    all: paper.questions.length,
    wrong: paper.questions.filter((question) => { const value = attempt.responses[String(question.id)]?.selectedIndex; return value !== undefined && value !== question.correctIndex; }).length,
    skipped: paper.questions.filter((question) => attempt.responses[String(question.id)]?.selectedIndex === undefined).length,
    correct: paper.questions.filter((question) => attempt.responses[String(question.id)]?.selectedIndex === question.correctIndex).length,
  };

  return (
    <main className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 flex items-center gap-5 bg-navy px-7 py-4 text-white shadow-md">
        <button className="rounded-lg p-2 hover:bg-white/10" onClick={onBack} aria-label="Back to scorecard"><ArrowLeft /></button>
        <div className="min-w-0 flex-1"><p className="text-xs text-blue-200">Detailed paper review</p><h1 className="truncate font-bold">{paper.title}</h1></div>
        <button className="flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2 font-semibold hover:bg-white/10" onClick={() => setLanguage((value) => value === 'en' ? 'hi' : 'en')}><Languages size={18} /> {language === 'en' ? 'हिन्दी' : 'English'}</button>
      </header>
      <section className="mx-auto max-w-5xl px-7 py-6">
        <nav className="card sticky top-[76px] z-10 mb-6 flex gap-2 p-3">
          {(['all', 'wrong', 'skipped', 'correct'] as Filter[]).map((item) => <button className={`rounded-lg px-4 py-2 text-sm font-bold capitalize ${filter === item ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-100'}`} key={item} onClick={() => setFilter(item)}>{item} ({counts[item]})</button>)}
        </nav>
        <div className="space-y-5">
          {filtered.map((question) => {
            const selected = attempt.responses[String(question.id)]?.selectedIndex;
            const isCorrect = selected === question.correctIndex;
            const options = language === 'hi' ? question.options_hi : question.options_en;
            return (
              <article className="card overflow-hidden" key={question.id}>
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3"><div className="flex items-center gap-2"><b>Question {question.id}</b><span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500">{question.subject} · {question.marks} mark{question.marks !== 1 ? 's' : ''}</span></div>{selected === undefined ? <Status icon={<MinusCircle />} text="Not attempted" style="text-slate-500" /> : isCorrect ? <Status icon={<CheckCircle2 />} text="Correct" style="text-emerald-700" /> : <Status icon={<XCircle />} text="Incorrect" style="text-red-700" />}</div>
                <div className="p-6"><p className="text-lg font-semibold leading-8">{language === 'hi' ? question.question_hi : question.question_en}</p><div className="mt-5 space-y-2">{options.map((option, index) => {
                  const correctOption = index === question.correctIndex;
                  const chosen = index === selected;
                  const style = correctOption ? 'border-emerald-500 bg-emerald-50' : chosen ? 'border-red-500 bg-red-50' : 'border-slate-200';
                  return <div className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 ${style}`} key={index}><span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${correctOption ? 'bg-emerald-600 text-white' : chosen ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{labels[index]}</span><span className="flex-1">{option}</span>{correctOption && <span className="text-xs font-bold text-emerald-700">CORRECT ANSWER</span>}{chosen && !correctOption && <span className="text-xs font-bold text-red-700">YOUR ANSWER</span>}{chosen && correctOption && <span className="text-xs font-bold text-emerald-700">YOUR ANSWER</span>}</div>;
                })}</div><div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-5"><h3 className="text-sm font-bold text-navy">Explanation / समाधान</h3><p className="mt-2 leading-7 text-slate-700">{language === 'hi' ? question.explanation_hi : question.explanation_en}</p></div></div>
              </article>
            );
          })}
          {!filtered.length && <div className="card p-12 text-center text-slate-500">No questions match this filter.</div>}
        </div>
      </section>
    </main>
  );
}

function Status({ icon, text, style }: { icon: React.ReactNode; text: string; style: string }) { return <span className={`flex items-center gap-2 text-sm font-bold ${style}`}>{icon}{text}</span>; }
