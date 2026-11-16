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
  const counts = questions.reduce((totals, question) => {
    const response = responses[String(question.id)];
    if (response?.selectedIndex !== undefined) totals.answered += 1;
    if (response?.markedForReview) totals.review += 1;
    return totals;
  }, { answered: 0, review: 0 });

  return (
    <aside className="flex h-full flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-5">
        <h2 className="font-bold">Question palette</h2>
        <p className="mt-1 text-xs text-slate-500">{counts.answered} answered · {counts.review} marked</p>
      </div>
      <div className="grid flex-1 auto-rows-min grid-cols-5 gap-2 overflow-y-auto p-5">
        {questions.map((question, index) => (
          <button
            aria-label={`Question ${index + 1}`}
            aria-current={index === currentIndex ? 'step' : undefined}
            className={`relative h-11 rounded-lg text-sm font-bold transition ${statusClass(responses[String(question.id)])} ${index === currentIndex ? 'outline outline-2 outline-offset-2 outline-saffron' : ''}`}
            key={question.id}
            onClick={() => onSelect(index)}
          >{index + 1}</button>
        ))}
      </div>
      <div className="border-t border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">Click any number to open that question.</div>
    </aside>
  );
}
