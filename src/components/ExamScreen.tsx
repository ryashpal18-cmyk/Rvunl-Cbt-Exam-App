import { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark, ChevronLeft, ChevronRight, Clock3, Eraser, Languages, Send } from 'lucide-react';
import { ExamConfig, Paper, QuestionResponse, UserId } from '../types/exam';
import QuestionPalette from './QuestionPalette';

interface Props {
  userId: UserId;
  userName: string;
  paper: Paper;
  config: ExamConfig;
  onSubmit: (responses: Record<string, QuestionResponse>, timeTakenSeconds: number, submittedByTimer: boolean) => void;
}

const responseFor = (response?: QuestionResponse): QuestionResponse => response ?? ({ markedForReview: false, visited: false, timeSpentSec: 0 });

export default function ExamScreen({ userName, paper, config, onSubmit }: Props) {
  const totalSeconds = paper.durationMinutes * 60;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [language, setLanguage] = useState(config.language);
  const [responses, setResponses] = useState<Record<string, QuestionResponse>>(() => ({
    [String(paper.questions[0].id)]: { markedForReview: false, visited: true, timeSpentSec: 0 },
  }));
  const [remaining, setRemaining] = useState(totalSeconds);
  const [showSubmit, setShowSubmit] = useState(false);
  const enteredAt = useRef(Date.now());
  const deadline = useRef(Date.now() + totalSeconds * 1000);
  const submitted = useRef(false);
  const responsesRef = useRef(responses);
  responsesRef.current = responses;
  const question = paper.questions[currentIndex];
  const response = responseFor(responses[String(question.id)]);

  const withCurrentTime = useCallback((source: Record<string, QuestionResponse>) => {
    const elapsed = Math.max(0, Math.round((Date.now() - enteredAt.current) / 1000));
    const id = String(paper.questions[currentIndex].id);
    return { ...source, [id]: { ...responseFor(source[id]), visited: true, timeSpentSec: responseFor(source[id]).timeSpentSec + elapsed } };
  }, [currentIndex, paper.questions]);

  const submitExam = useCallback((byTimer: boolean) => {
    if (submitted.current) return;
    submitted.current = true;
    const finalResponses = withCurrentTime(responsesRef.current);
    onSubmit(finalResponses, Math.min(totalSeconds, Math.max(0, Math.round((Date.now() - (deadline.current - totalSeconds * 1000)) / 1000))), byTimer);
  }, [onSubmit, totalSeconds, withCurrentTime]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) {
        window.clearInterval(timer);
        submitExam(true);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [submitExam]);

  const navigate = useCallback((target: number, changes?: Partial<QuestionResponse>) => {
    const bounded = Math.max(0, Math.min(paper.questions.length - 1, target));
    const elapsed = Math.max(0, Math.round((Date.now() - enteredAt.current) / 1000));
    setResponses((previous) => {
      const currentId = String(paper.questions[currentIndex].id);
      const targetId = String(paper.questions[bounded].id);
      const current = responseFor(previous[currentId]);
      return {
        ...previous,
        [currentId]: { ...current, ...changes, visited: true, timeSpentSec: current.timeSpentSec + elapsed },
        [targetId]: { ...responseFor(previous[targetId]), visited: true },
      };
    });
    setCurrentIndex(bounded);
    enteredAt.current = Date.now();
  }, [currentIndex, paper.questions]);

  const chooseOption = useCallback((selectedIndex: number) => {
    const id = String(paper.questions[currentIndex].id);
    setResponses((previous) => ({ ...previous, [id]: { ...responseFor(previous[id]), selectedIndex, visited: true } }));
  }, [currentIndex, paper.questions]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (showSubmit) return;
      if (['1', '2', '3', '4', '5'].includes(event.key)) chooseOption(Number(event.key) - 1);
      else if (event.key === 'Enter') navigate(currentIndex + 1);
      else if (event.key.toLowerCase() === 'm') navigate(currentIndex + 1, { markedForReview: true });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [chooseOption, currentIndex, navigate, showSubmit]);

  const timerStyle = remaining <= 120 ? 'bg-red-600' : remaining <= 600 ? 'bg-amber-500' : 'bg-slate-800';
  const timerText = `${Math.floor(remaining / 60).toString().padStart(2, '0')}:${(remaining % 60).toString().padStart(2, '0')}`;
  const options = language === 'hi' ? question.options_hi : question.options_en;
  const labels = ['A', 'B', 'C', 'D', 'E'];

  return (
    <main className="flex h-screen min-h-[700px] flex-col overflow-hidden bg-slate-100">
      <header className="flex h-20 shrink-0 items-center gap-5 bg-navy px-6 text-white shadow-md">
        <div className="min-w-0 flex-1"><p className="text-xs uppercase tracking-wider text-blue-200">RVUNL Phase-I Mock</p><h1 className="truncate text-lg font-bold">{paper.title}</h1></div>
        <div className="border-l border-white/20 pl-5 text-right"><p className="text-xs text-blue-200">Candidate</p><p className="font-bold">{userName}</p></div>
        <div className={`flex min-w-36 items-center justify-center gap-2 rounded-xl px-5 py-3 text-xl font-extrabold tabular-nums ${timerStyle}`}><Clock3 size={21} /> {timerText}</div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,3fr)_minmax(280px,1fr)]">
        <section className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-7 py-4">
            <div><p className="text-sm font-semibold text-slate-500">Question {currentIndex + 1} of {paper.questions.length}</p><div className="mt-1 flex items-center gap-2">{!config.strictOmnibus && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-navy">{question.subject}</span>}<span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-saffron">+{question.marks.toFixed(1)} marks</span></div></div>
            <button className="btn-secondary flex items-center gap-2" onClick={() => setLanguage((current) => current === 'en' ? 'hi' : 'en')}><Languages size={18} /> {language === 'en' ? 'हिन्दी' : 'English'}</button>
          </div>
          <div className="flex-1 overflow-y-auto p-7">
            <article className="card min-h-full p-7">
              <p className="text-xl font-semibold leading-9 text-slate-900">{language === 'hi' ? question.question_hi : question.question_en}</p>
              <div className="mt-8 space-y-3">
                {options.map((option, index) => {
                  const selected = response.selectedIndex === index;
                  return (
                    <label className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition ${selected ? 'border-navy bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`} key={index}>
                      <input className="sr-only" type="radio" name={`question-${question.id}`} checked={selected} onChange={() => chooseOption(index)} />
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold ${selected ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600'}`}>{labels[index]}</span>
                      <span className="text-base leading-7">{option}</span>
                      <span className="ml-auto text-xs text-slate-400">Key {index + 1}</span>
                    </label>
                  );
                })}
              </div>
              {response.markedForReview && <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-violet-700"><Bookmark size={17} fill="currentColor" /> Marked for review</p>}
            </article>
          </div>
          <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
            <div className="flex gap-2">
              <button className="btn-secondary flex items-center gap-2" disabled={currentIndex === 0} onClick={() => navigate(currentIndex - 1)}><ChevronLeft size={18} /> Previous</button>
              <button className="btn-secondary flex items-center gap-2" onClick={() => { const id = String(question.id); setResponses((previous) => ({ ...previous, [id]: { ...responseFor(previous[id]), selectedIndex: undefined } })); }}><Eraser size={18} /> Clear response</button>
            </div>
            <div className="flex gap-2">
              <button className="rounded-lg bg-violet-700 px-4 py-2.5 font-semibold text-white hover:bg-violet-800" onClick={() => navigate(currentIndex + 1, { markedForReview: !response.markedForReview })}><Bookmark className="mr-2 inline" size={17} />{response.markedForReview ? 'Unmark & Next' : 'Mark for Review & Next'}</button>
              {currentIndex < paper.questions.length - 1 ? <button className="btn-primary flex items-center gap-2" onClick={() => navigate(currentIndex + 1)}>Save & Next <ChevronRight size={18} /></button> : <button className="btn-primary flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800" onClick={() => setShowSubmit(true)}><Send size={18} /> Submit exam</button>}
            </div>
          </footer>
        </section>
        <QuestionPalette questions={paper.questions} responses={responses} currentIndex={currentIndex} onSelect={(index) => navigate(index)} />
      </div>

      {showSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-6">
          <div className="card w-full max-w-md p-7 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-saffron"><Send /></div>
            <h2 className="mt-4 text-2xl font-bold">Submit this exam?</h2>
            <p className="mt-2 text-slate-600">You answered {Object.values(responses).filter((item) => item.selectedIndex !== undefined).length} of {paper.questions.length} questions. You cannot change answers after submission.</p>
            <div className="mt-6 flex gap-3"><button className="btn-secondary flex-1" onClick={() => setShowSubmit(false)}>Continue exam</button><button className="btn-primary flex-1" onClick={() => submitExam(false)}>Submit now</button></div>
          </div>
        </div>
      )}
    </main>
  );
}
