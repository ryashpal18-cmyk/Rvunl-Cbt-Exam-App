import { useTranslation } from '../uiLanguage';
import { useState } from 'react';
import { AlertCircle, RotateCcw, Star } from 'lucide-react';
import { Attempt, Paper, Question, UserId } from '../types/exam';
import { getBookmarks, toggleBookmark } from '../services/userExtras';

interface Props {
  userId: UserId;
  attempts: Attempt[];
  papers: Paper[];
  onPractice: (paper: Paper) => void;
}

export default function MistakeBank({ userId, attempts, papers, onPractice }: Props) {
  const t = useTranslation();
  const [bookmarks, setBookmarks] = useState(() => getBookmarks(userId));
  const mistakes = new Map<string, { paper: Paper; question: Question }>();
  for (const attempt of attempts) {
    if (attempt.userId !== userId) continue;
    const paper = attempt.sessionPaper ?? papers.find((item) => item.paperId === attempt.paperId);
    if (!paper) continue;
    for (const question of paper.questions) {
      const selected = attempt.responses[String(question.id)]?.selectedIndex;
      if (selected === undefined || selected === question.correctIndex) continue;
      const key = `${paper.paperId}::${question.id}`;
      if (!mistakes.has(key)) mistakes.set(key, { paper, question });
    }
  }
  const practice = () => {
    const questions = Array.from(mistakes.values(), ({ question }, index) => ({ ...question, id: index + 1 }));
    onPractice({
      paperId: `mistakes-${crypto.randomUUID()}`,
      title: 'Personal Mistake Bank Practice',
      durationMinutes: Math.max(10, Math.ceil(questions.length * 0.85)),
      questions,
    });
  };

  return (
    <section>
      <h2 className="text-2xl font-bold">{t("Mistake Bank", "गलत सवाल")}</h2>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-5">
        <div className="flex items-center gap-2"><AlertCircle className="text-red-600" /> {mistakes.size} unique questions to revisit</div>
        <button disabled={!mistakes.size} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={practice}>
          <RotateCcw size={16} /> {t("Start mini-test", "छोटा टेस्ट शुरू करें")}
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {!mistakes.size && <p className="rounded-xl border bg-white p-5 text-slate-600">{t("Incorrect answers appear here after you complete a test.", "टेस्ट पूरा होने के बाद गलत सवाल यहाँ दिखेंगे।")}</p>}
        {Array.from(mistakes, ([key, { paper, question }]) => {
          const starred = bookmarks.some((item) => item.key === key);
          return (
            <article key={key} className="flex items-start justify-between gap-3 rounded-xl border bg-white p-4">
              <div>
                <p className="font-semibold">{question.question_en}</p>
                <p lang="hi" className="mt-1">{question.question_hi}</p>
                <p className="mt-1 text-xs text-slate-500">{question.subject}</p>
              </div>
              <button
                aria-label={starred ? 'Remove bookmark' : 'Bookmark question'}
                aria-pressed={starred}
                className="rounded-md p-2 text-amber-700 hover:bg-amber-50"
                onClick={() => setBookmarks(toggleBookmark(userId, paper.paperId, paper.title, question))}
              >
                <Star size={18} fill={starred ? 'currentColor' : 'none'} />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
