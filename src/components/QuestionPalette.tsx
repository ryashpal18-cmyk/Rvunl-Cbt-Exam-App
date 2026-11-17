import { useTranslation } from '../uiLanguage';
import { Bookmark, SkipForward } from 'lucide-react';
import { Question, QuestionResponse } from '../types/exam';

interface Props {
  questions: Question[];
  responses: Record<string, QuestionResponse>;
  currentIndex: number;
  onSelect: (index: number) => void;
}

function statusClass(response?: QuestionResponse): string {
  if (!response?.visited) return 'border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100';
  if (response.markedForReview && response.selectedIndex !== undefined) return 'bg-violet-700 text-white ring-[3px] ring-inset ring-emerald-400';
  if (response.markedForReview) return 'bg-violet-700 text-white';
  if (response.selectedIndex !== undefined) return 'bg-emerald-600 text-white';
  return 'bg-red-600 text-white';
}

export default function QuestionPalette({ questions, responses, currentIndex, onSelect }: Props) {
  const t = useTranslation();
  const counts = questions.reduce((totals, question) => {
    const response = responses[String(question.id)];
    if (response?.selectedIndex !== undefined) totals.answered += 1;
    if (response?.markedForReview) totals.review += 1;
    return totals;
  }, { answered: 0, review: 0 });

  const jumpToNext = (predicate: (r?: QuestionResponse) => boolean) => {
    const n = questions.length;
    for (let offset = 1; offset <= n; offset += 1) {
      const idx = (currentIndex + offset) % n;
      if (predicate(responses[String(questions[idx].id)])) {
        onSelect(idx);
        return;
      }
    }
  };

  return (
    <aside className="flex h-full flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <h2 className="font-bold text-slate-900">{t("Question palette", "सवाल नंबर")}</h2>
        <p className="mt-1 text-xs text-slate-500">{counts.answered} {t('answered', 'जवाब दिए')} · {counts.review} {t('marked', 'चिह्नित')}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => jumpToNext((r) => r?.selectedIndex === undefined)}
            className="flex items-center justify-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-[11px] font-bold text-amber-900 hover:bg-amber-100"
          >
            <SkipForward className="h-3.5 w-3.5" /> {t("Next Unanswered", "अगला बाकी सवाल")}
          </button>
          <button
            type="button"
            onClick={() => jumpToNext((r) => Boolean(r?.markedForReview))}
            className="flex items-center justify-center gap-1 rounded-lg border border-violet-300 bg-violet-50 px-2 py-1.5 text-[11px] font-bold text-violet-900 hover:bg-violet-100"
          >
            <Bookmark className="h-3.5 w-3.5" /> {t("Next Marked", "अगला चिह्नित सवाल")}
          </button>
        </div>
      </div>

      <div className="grid flex-1 auto-rows-min grid-cols-5 gap-2 overflow-y-auto p-4">
        {questions.map((question, index) => (
          <button
            aria-label={`${t('Question', 'सवाल')} ${index + 1}`}
            aria-current={index === currentIndex ? 'step' : undefined}
            className={`relative h-10 rounded-lg text-sm font-bold transition ${statusClass(responses[String(question.id)])} ${index === currentIndex ? 'outline outline-2 outline-offset-2 outline-amber-500' : ''}`}
            key={question.id}
            onClick={() => onSelect(index)}
          >
            {index + 1}
          </button>
        ))}
      </div>
      <div className="border-t border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-500">
        {t("Click any number to open that question.", "सवाल खोलने के लिए उसका नंबर दबाएँ।")}
      </div>
    </aside>
  );
}
