import { AlertCircle, RotateCcw } from 'lucide-react';
import { Attempt, Paper, Question, UserId } from '../types/exam';

interface Props { userId: UserId; attempts: Attempt[]; papers: Paper[]; onPractice: (paper: Paper) => void; }

export default function MistakeBank({ userId, attempts, papers, onPractice }: Props) {
  const mistakes = new Map<string, Question>();
  attempts.filter((attempt) => attempt.userId === userId).forEach((attempt) => {
    const paper = papers.find((item) => item.paperId === attempt.paperId);
    paper?.questions.forEach((question) => {
      const selected = attempt.responses[String(question.id)]?.selectedIndex;
      if (selected !== undefined && selected !== question.correctIndex) mistakes.set(`${paper.paperId}:${question.id}`, question);
    });
  });
  const questions = Array.from(mistakes.values()).map((question, index) => ({ ...question, id: index + 1 }));
  const practice = () => onPractice({ paperId: `mistakes-${userId}-${Date.now()}`, title: 'Personal Mistake Bank Practice', durationMinutes: Math.max(10, Math.ceil(questions.length * 0.85)), questions });

  return <section><p className="eyebrow">Personal revision</p><h2 className="mt-2 text-3xl font-bold">Mistake Bank</h2><p className="mt-2 text-slate-600">Every incorrectly answered question is collected here for this profile only.</p>
    <div className="card mt-7 flex items-center justify-between p-7"><div className="flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-50 text-red-600"><AlertCircle size={30} /></span><div><b className="text-3xl">{questions.length}</b><p className="text-sm text-slate-500">unique questions to revisit</p></div></div><button disabled={!questions.length} className="btn-primary flex items-center gap-2" onClick={practice}><RotateCcw size={18} /> Start mini-test</button></div>
    <div className="mt-6 space-y-3">{questions.slice(0, 12).map((question, index) => <div className="card flex gap-4 p-4" key={`${question.id}-${index}`}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-sm font-bold text-red-700">{index + 1}</span><div><p className="font-semibold">{question.question_en}</p><p className="mt-1 text-xs text-slate-500">{question.subject}</p></div></div>)}{questions.length > 12 && <p className="text-center text-sm text-slate-500">And {questions.length - 12} more questions. Start the mini-test to practice all.</p>}{!questions.length && <div className="card p-12 text-center text-slate-500">Complete a mock test. Incorrect answers will appear here automatically.</div>}</div>
  </section>;
}
