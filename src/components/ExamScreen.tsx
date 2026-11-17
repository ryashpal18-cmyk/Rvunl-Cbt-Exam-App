import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bookmark, ChevronLeft, ChevronRight, Clock3, Eraser, Languages, NotebookPen, Send, X } from 'lucide-react';
import { DraftExamState, ExamConfig, Paper, QuestionResponse, UserId } from '../types/exam';
import { clearExamDraft, saveExamDraft } from '../services/userExtras';
import QuestionPalette from './QuestionPalette';

interface Props {
  userId: UserId;
  userName: string;
  paper: Paper;
  config: ExamConfig;
  initialDraft?: DraftExamState | null;
  onSubmit: (responses: Record<string, QuestionResponse>, timeTakenSeconds: number, submittedByTimer: boolean, tabSwitchCount: number) => Promise<void>;
}

export default function ExamScreen({ userId, userName, paper, config, initialDraft, onSubmit }: Props) {
  const totalSeconds = paper.durationMinutes * 60;
  const [currentIndex, setCurrentIndex] = useState(initialDraft?.currentIndex ?? 0);
  const [language, setLanguage] = useState(config.language);
  const [responses, setResponses] = useState<Record<string, QuestionResponse>>(() => {
    if (initialDraft?.responses) return initialDraft.responses;
    const firstId = String(paper.questions[0].id);
    return { [firstId]: { visited: true, markedForReview: false, timeSpentSec: 0 } };
  });
  const initialRemaining = initialDraft?.remainingSeconds ?? totalSeconds;
  const [remaining, setRemaining] = useState(initialRemaining);
  const [showSubmit, setShowSubmit] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);
  const submission = useRef<Parameters<Props['onSubmit']> | null>(null);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [scratchText, setScratchText] = useState('');
  const [tabSwitchCount, setTabSwitchCount] = useState(initialDraft?.tabSwitchCount ?? 0);
  const [focusWarning, setFocusWarning] = useState(false);

  const enteredAt = useRef(Date.now());
  const deadline = useRef(Date.now() + initialRemaining * 1000);
  const submitted = useRef(false);
  const responsesRef = useRef(responses);
  responsesRef.current = responses;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const tabSwitchRef = useRef(tabSwitchCount);
  tabSwitchRef.current = tabSwitchCount;

  useEffect(() => {
    let lostFocus = false;
    const checkFocus = () => {
      const unfocused = document.hidden || !document.hasFocus();
      if (unfocused && !lostFocus && !submitted.current) {
        tabSwitchRef.current += 1;
        setTabSwitchCount(tabSwitchRef.current);
        setFocusWarning(true);
      }
      lostFocus = unfocused;
    };
    window.addEventListener('blur', checkFocus);
    window.addEventListener('focus', checkFocus);
    document.addEventListener('visibilitychange', checkFocus);
    return () => {
      window.removeEventListener('blur', checkFocus);
      window.removeEventListener('focus', checkFocus);
      document.removeEventListener('visibilitychange', checkFocus);
    };
  }, []);

  const withCurrentTime = useCallback((base: Record<string, QuestionResponse>, index: number) => {
    const qId = String(paper.questions[index].id);
    const elapsed = Math.max(0, Math.round((Date.now() - enteredAt.current) / 1000));
    enteredAt.current = Date.now();
    const prev = base[qId] ?? { visited: true, markedForReview: false, timeSpentSec: 0 };
    return { ...base, [qId]: { ...prev, visited: true, timeSpentSec: prev.timeSpentSec + elapsed } };
  }, [paper.questions]);

  const saveSubmission = useCallback(async () => {
    if (!submission.current) return;
    setSaving(true);
    setSaveError(false);
    try {
      await onSubmit(...submission.current);
      clearExamDraft(userId);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    } catch {
      setSaveError(true);
      setSaving(false);
    }
  }, [onSubmit, userId]);

  const submitExam = useCallback((byTimer: boolean) => {
    if (submitted.current) return;
    submitted.current = true;
    const finalized = withCurrentTime(responsesRef.current, currentIndexRef.current);
    const timeTaken = Math.min(totalSeconds, Math.max(1, totalSeconds - Math.round((deadline.current - Date.now()) / 1000)));
    submission.current = [finalized, timeTaken, byTimer, tabSwitchRef.current];
    setShowSubmit(false);
    void saveSubmission();
  }, [saveSubmission, totalSeconds, withCurrentTime]);

  // Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
      const secs = Math.max(0, Math.round((deadline.current - Date.now()) / 1000));
      setRemaining(secs);
      if (secs === 0) submitExam(true);
    }, 500);
    return () => clearInterval(timer);
  }, [submitExam]);

  const persistDraft = useCallback((snapshot: Record<string, QuestionResponse>, index: number) => {
    if (submitted.current) return;
    saveExamDraft({
      userId, paper, config, responses: snapshot, currentIndex: index,
      remainingSeconds: Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)),
      tabSwitchCount: tabSwitchRef.current,
      lastSavedAt: new Date().toISOString(),
    });
  }, [config, paper, userId]);

  useEffect(() => {
    const save = () => {
      if (submitted.current) return;
      const snapshot = withCurrentTime(responsesRef.current, currentIndexRef.current);
      responsesRef.current = snapshot;
      setResponses(snapshot);
      persistDraft(snapshot, currentIndexRef.current);
    };
    const timer = setInterval(save, 5000);
    const onPageHide = () => persistDraft(responsesRef.current, currentIndexRef.current);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [persistDraft, withCurrentTime]);

  const setAnswer = useCallback((selectedIndex?: number) => {
    const index = currentIndexRef.current;
    const id = String(paper.questions[index].id);
    const current = responsesRef.current;
    const next = { ...current, [id]: { ...current[id], selectedIndex } };
    responsesRef.current = next;
    setResponses(next);
    persistDraft(next, index);
  }, [paper.questions, persistDraft]);

  const navigate = useCallback((target: number, changes?: Partial<QuestionResponse>) => {
    const nextIdx = Math.max(0, Math.min(paper.questions.length - 1, target));
    const updated = withCurrentTime(responsesRef.current, currentIndexRef.current);
    const curId = String(paper.questions[currentIndexRef.current].id);
    if (changes) {
      updated[curId] = { ...updated[curId], ...changes };
    }
    const targetId = String(paper.questions[nextIdx].id);
    updated[targetId] = { ...(updated[targetId] ?? { markedForReview: false, timeSpentSec: 0 }), visited: true };
    responsesRef.current = updated;
    currentIndexRef.current = nextIdx;
    setResponses(updated);
    setCurrentIndex(nextIdx);
    persistDraft(updated, nextIdx);
  }, [paper.questions, persistDraft, withCurrentTime]);

  // Keyboard shortcuts (disabled in Strict Mouse-Only Mode)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (submitted.current || document.activeElement?.tagName === 'TEXTAREA') return;
      if (showSubmit) return;
      if (config.mouseOnly) {
        if (/^[1-5]$|^Arrow|^Enter$|^ $|^m$/i.test(e.key)) e.preventDefault();
        return;
      }
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        setAnswer(Number(e.key) - 1);
      } else if (e.key === 'Enter') {
        if (currentIndexRef.current < paper.questions.length - 1) navigate(currentIndexRef.current + 1);
      } else if (e.key === 'm' || e.key === 'M') {
        const qId = String(paper.questions[currentIndexRef.current].id);
        const cur = responsesRef.current[qId]?.markedForReview ?? false;
        navigate(Math.min(paper.questions.length - 1, currentIndexRef.current + 1), { markedForReview: !cur });
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [setAnswer, config.mouseOnly, navigate, paper.questions, showSubmit]);

  const question = paper.questions[currentIndex];
  const resp = responses[String(question.id)];
  const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secs = String(remaining % 60).padStart(2, '0');
  const timerCls = remaining <= 120 ? 'bg-red-600' : remaining <= 600 ? 'bg-amber-500' : 'bg-slate-800';

  const summaryCounts = paper.questions.reduce(
    (acc, q) => {
      const r = responses[String(q.id)];
      if (!r?.visited) acc.notVisited += 1;
      else if (r.selectedIndex !== undefined) acc.answered += 1;
      else acc.notAnswered += 1;
      if (r?.markedForReview) acc.marked += 1;
      return acc;
    },
    { answered: 0, notAnswered: 0, marked: 0, notVisited: 0 }
  );

  const qText = language === 'hi' ? question.question_hi : question.question_en;
  const opts = language === 'hi' ? question.options_hi : question.options_en;

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">RVUNL Phase-I CBT</span>
          <h1 className="text-sm font-bold text-slate-900 md:text-base">{paper.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowScratchpad((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold ${showScratchpad ? 'border-blue-700 bg-blue-50 text-blue-800' : 'border-slate-300 bg-white text-slate-700'}`}
          >
            <NotebookPen className="h-4 w-4" /> Rough Pad
          </button>
          <div className="hidden text-right sm:block">
            <p className="text-[11px] text-slate-500">Candidate</p>
            <p className="text-sm font-bold text-slate-800">{userName}</p>
          </div>
          <div className={`flex items-center gap-1.5 rounded-xl px-4 py-2 font-mono text-base font-bold text-white ${timerCls}`}>
            <Clock3 className="h-4 w-4" /> {mins}:{secs}
          </div>
        </div>
      </header>

      {focusWarning && (
        <div className="flex items-center justify-between bg-amber-100 px-6 py-2 text-xs font-semibold text-amber-900">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            Exam Focus Warning: Please stay inside the exam window (switches recorded: {tabSwitchCount}).
          </span>
          <button onClick={() => setFocusWarning(false)} className="rounded p-0.5 hover:bg-amber-200"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="grid flex-1 overflow-hidden lg:grid-cols-4">
        <main className="flex flex-col overflow-hidden bg-white lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-6 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-900">Question {currentIndex + 1} of {paper.questions.length}</span>
              {!config.strictOmnibus && (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800">{question.subject}</span>
              )}
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">+{question.marks.toFixed(1)} marks</span>
            </div>
            <button
              type="button"
              onClick={() => setLanguage((l) => (l === 'en' ? 'hi' : 'en'))}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Languages className="h-4 w-4" /> {language === 'en' ? 'हिन्दी में देखें' : 'View in English'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <p className="text-base font-semibold leading-relaxed text-slate-900 md:text-lg">{qText}</p>
            {resp?.markedForReview && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">
                <Bookmark className="h-3.5 w-3.5" /> Marked for review
              </p>
            )}
            <div className="mt-6 space-y-3">
              {opts.map((opt, idx) => {
                const selected = resp?.selectedIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAnswer(idx)}
                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${selected ? 'border-blue-700 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${selected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-sm font-medium text-slate-800 md:text-base">{opt}</span>
                    </div>
                    {!config.mouseOnly && <span className="text-[11px] font-semibold text-slate-400">Key {idx + 1}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => navigate(currentIndex - 1)}
                className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                type="button"
                onClick={() => setAnswer()}
                className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Eraser className="h-4 w-4" /> Clear response
              </button>
              <button
                type="button"
                onClick={() => navigate(currentIndex < paper.questions.length - 1 ? currentIndex + 1 : currentIndex, { markedForReview: !resp?.markedForReview })}
                className="flex items-center gap-1 rounded-xl border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-100"
              >
                <Bookmark className="h-4 w-4" /> {resp?.markedForReview ? 'Unmark & Next' : 'Mark for Review & Next'}
              </button>
            </div>
            <div className="flex gap-2">
              {currentIndex < paper.questions.length - 1 && (
                <button
                  type="button"
                  onClick={() => navigate(currentIndex + 1)}
                  className="flex items-center gap-1 rounded-xl bg-blue-700 px-5 py-2 text-sm font-bold text-white hover:bg-blue-800"
                >
                  Save &amp; Next <ChevronRight className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowSubmit(true)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700"
              >
                <Send className="h-4 w-4" /> Submit exam
              </button>
            </div>
          </footer>
        </main>

        <div className="hidden h-full flex-col overflow-hidden lg:flex">
          {showScratchpad ? (
            <div className="flex h-full flex-col border-l border-slate-200 bg-amber-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-900">Digital Rough Pad</h3>
                <button onClick={() => setScratchText('')} className="text-xs font-semibold text-amber-800 hover:underline">Clear</button>
              </div>
              <textarea
                value={scratchText}
                onChange={(e) => setScratchText(e.target.value)}
                placeholder="Type Maths / Reasoning rough calculations here (auto-cleared on submit)..."
                className="flex-1 resize-none rounded-xl border border-amber-200 bg-white p-3 font-mono text-sm text-slate-800 focus:outline-none"
              />
            </div>
          ) : (
            <QuestionPalette questions={paper.questions} responses={responses} currentIndex={currentIndex} onSelect={(idx) => navigate(idx)} />
          )}
        </div>
      </div>

      {(saving || saveError) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div role="dialog" aria-modal="true" aria-label="Save exam result" className="rounded-xl bg-white p-5">
            {saving ? <p role="status">Saving your result…</p> : <>
              <p role="alert">Your result could not be saved. Your answers are still here.</p>
              <button autoFocus className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-white" onClick={() => void saveSubmission()}>Retry saving</button>
            </>}
          </div>
        </div>
      )}

      {showSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="submit-heading" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="submit-heading" className="text-xl font-bold text-slate-900">Confirm Exam Submission</h2>
            <p className="mt-1 text-sm text-slate-600">Review your attempt summary before final submission:</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-emerald-50 p-3 font-semibold text-emerald-900">Answered: {summaryCounts.answered}</div>
              <div className="rounded-xl bg-red-50 p-3 font-semibold text-red-900">Not Answered (Visited): {summaryCounts.notAnswered}</div>
              <div className="rounded-xl bg-violet-50 p-3 font-semibold text-violet-900">Marked for Review: {summaryCounts.marked}</div>
              <div className="rounded-xl bg-slate-100 p-3 font-semibold text-slate-800">Not Visited: {summaryCounts.notVisited}</div>
            </div>
            <div className="mt-6 flex gap-3">
              <button autoFocus onClick={() => setShowSubmit(false)} className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                Return to Exam
              </button>
              <button onClick={() => submitExam(false)} className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
                Confirm &amp; Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
