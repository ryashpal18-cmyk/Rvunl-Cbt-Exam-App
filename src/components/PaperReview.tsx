import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, Languages, MinusCircle, Star, XCircle } from 'lucide-react';
import { Attempt, Language, Paper, UserId } from '../types/exam';
import { getBookmarks, toggleBookmark } from '../services/userExtras';

type Filter = 'all' | 'wrong' | 'skipped' | 'correct';

interface Props {
  userId: UserId;
  attempt: Attempt;
  paper: Paper;
  onBack: () => void;
}

export default function PaperReview({ userId, attempt, paper, onBack }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [language, setLanguage] = useState<Language>('en');
  const [bookmarks, setBookmarks] = useState(() => new Set(getBookmarks(userId).map((b) => b.key)));

  const counts = useMemo(() => {
    const res = { all: paper.questions.length, wrong: 0, skipped: 0, correct: 0 };
    for (const q of paper.questions) {
      const r = attempt.responses[String(q.id)];
      if (r?.selectedIndex === undefined) res.skipped += 1;
      else if (r.selectedIndex === q.correctIndex) res.correct += 1;
      else res.wrong += 1;
    }
    return res;
  }, [attempt.responses, paper.questions]);

  const filtered = useMemo(() => {
    return paper.questions.filter((q) => {
      const r = attempt.responses[String(q.id)];
      if (filter === 'all') return true;
      if (filter === 'skipped') return r?.selectedIndex === undefined;
      if (filter === 'correct') return r?.selectedIndex === q.correctIndex;
      return r?.selectedIndex !== undefined && r.selectedIndex !== q.correctIndex;
    });
  }, [attempt.responses, filter, paper.questions]);

  const handleToggleBookmark = (q: (typeof paper.questions)[number]) => {
    const updated = toggleBookmark(userId, paper.paperId, paper.title, q);
    setBookmarks(new Set(updated.map((b) => b.key)));
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-12">
      <header className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" /> Back to scorecard
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Detailed paper review</h1>
              <p className="text-xs text-slate-500">{paper.title}</p>
            </div>
          </div>
          <button
            onClick={() => setLanguage((l) => (l === 'en' ? 'hi' : 'en'))}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Languages className="h-4 w-4" /> {language === 'en' ? 'हिन्दी में देखें' : 'View in English'}
          </button>
        </div>

        <nav className="mx-auto mt-3 flex max-w-5xl flex-wrap gap-2">
          {(['all', 'wrong', 'skipped', 'correct'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize ${filter === f ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              {f} ({counts[f]})
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto mt-6 max-w-5xl space-y-4 px-6">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">No questions match this filter.</div>
        ) : (
          filtered.map((q) => {
            const r = attempt.responses[String(q.id)];
            const chosen = r?.selectedIndex;
            const timeSec = r?.timeSpentSec ?? 0;
            const isStarred = bookmarks.has(`${paper.paperId}::${q.id}`);
            const qText = language === 'hi' ? q.question_hi : q.question_en;
            const opts = language === 'hi' ? q.options_hi : q.options_en;
            const exp = language === 'hi' ? q.explanation_hi : q.explanation_en;

            return (
              <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">Question {q.id}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">{q.subject} · {q.marks} mark(s)</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${timeSec > 90 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'}`}>
                      <Clock3 className="h-3 w-3" /> Time: {timeSec}s
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleBookmark(q)}
                      title="Bookmark question"
                      className={`no-print flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold ${isStarred ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                      <Star className={`h-3.5 w-3.5 ${isStarred ? 'fill-amber-400 text-amber-500' : ''}`} /> {isStarred ? 'Saved' : 'Bookmark'}
                    </button>
                    {chosen === undefined ? (
                      <Status icon={<MinusCircle className="h-4 w-4" />} text="Not attempted" style="bg-slate-100 text-slate-700" />
                    ) : chosen === q.correctIndex ? (
                      <Status icon={<CheckCircle2 className="h-4 w-4" />} text="Correct" style="bg-emerald-100 text-emerald-800" />
                    ) : (
                      <Status icon={<XCircle className="h-4 w-4" />} text="Incorrect" style="bg-red-100 text-red-800" />
                    )}
                  </div>
                </div>

                <p className="mt-4 text-base font-semibold text-slate-900">{qText}</p>
                <div className="mt-4 space-y-2">
                  {opts.map((opt, idx) => {
                    const isCorrect = idx === q.correctIndex;
                    const isChosen = idx === chosen;
                    let cls = 'border-slate-200 bg-white';
                    if (isCorrect) cls = 'border-emerald-400 bg-emerald-50';
                    else if (isChosen) cls = 'border-red-400 bg-red-50';
                    return (
                      <div key={idx} className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm ${cls}`}>
                        <span><strong>{String.fromCharCode(65 + idx)}.</strong> {opt}</span>
                        <div className="flex gap-2 text-[10px] font-bold uppercase">
                          {isCorrect && <span className="rounded bg-emerald-600 px-2 py-0.5 text-white">Correct Answer</span>}
                          {isChosen && <span className={`rounded px-2 py-0.5 text-white ${isCorrect ? 'bg-blue-700' : 'bg-red-600'}`}>Your Answer</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-slate-800">
                  <strong className="text-blue-900">{language === 'hi' ? 'व्याख्या: ' : 'Explanation: '}</strong>{exp}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Status({ icon, text, style }: { icon: JSX.Element; text: string; style: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${style}`}>{icon}{text}</span>;
}
