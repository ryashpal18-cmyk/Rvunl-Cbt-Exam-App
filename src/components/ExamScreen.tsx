import { useSubjectLabel, useTranslation } from '../uiLanguage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bookmark, ChevronLeft, ChevronRight, Clock3, Eraser, Home, Languages, NotebookPen, Send, X } from 'lucide-react';
import { DraftExamState, ExamConfig, Paper, QuestionResponse, UserId } from '../types/exam';
import { clearExamDraft, saveExamDraft } from '../services/userExtras';
import QuestionPalette from './QuestionPalette';

interface Props {
  attemptId: string;
  onDashboard: () => void;
  userId: UserId;
  userName: string;
  paper: Paper;
  config: ExamConfig;
  initialDraft?: DraftExamState | null;
  onSubmit: (responses: Record<string, QuestionResponse>, timeTakenSeconds: number, submittedByTimer: boolean, tabSwitchCount: number) => Promise<void>;
}

export default function ExamScreen({ attemptId, userId, userName, paper, config, initialDraft, onSubmit, onDashboard }: Props) {
  const t = useTranslation();
  const subjectLabel = useSubjectLabel();
  const [pending, setPending] = useState<DraftExamState['pendingResponse'] | null>(initialDraft?.pendingResponse ?? null);
  const fullPaperDialog = useRef<HTMLDialogElement>(null);
  const [paletteHidden, setPaletteHidden] = useState(false);
  const [showFullPaper, setShowFullPaper] = useState(false);
  useEffect(() => {
    if (showFullPaper) fullPaperDialog.current?.showModal();
  }, [showFullPaper]);

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
  const [draftError, setDraftError] = useState(false);
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
    setShowFullPaper(false);
    void saveSubmission();
  }, [saveSubmission, totalSeconds, withCurrentTime]);

  // Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
      const secs = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setRemaining(secs);
      if (secs === 0) submitExam(true);
    }, 500);
    return () => clearInterval(timer);
  }, [submitExam]);

  const persistDraft = useCallback((snapshot: Record<string, QuestionResponse>, index: number, pendingResponse?: DraftExamState['pendingResponse']) => {
    try {
      saveExamDraft({
        attemptId, userId, paper, config, responses: snapshot, currentIndex: index, pendingResponse,
        remainingSeconds: Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)),
        tabSwitchCount: tabSwitchRef.current,
        lastSavedAt: new Date().toISOString(),
      });
      setDraftError(false);
      return true;
    } catch {
      setDraftError(true);
      return false;
    }
  }, [attemptId, config, paper, userId]);

  const returnToDashboard = () => {
    if (saving) return;
    if (!submitted.current && deadline.current <= Date.now()) {
      submitExam(true);
      return;
    }
    const index = currentIndexRef.current;
    const snapshot = submission.current?.[0] ?? withCurrentTime(responsesRef.current, index);
    responsesRef.current = snapshot;
    setResponses(snapshot);
    if (!persistDraft(snapshot, index, submitted.current ? undefined : pending ?? undefined)) return;
    submitted.current = true;
    onDashboard();
  };

  useEffect(() => {
    const save = () => {
      if (submitted.current) return;
      const snapshot = withCurrentTime(responsesRef.current, currentIndexRef.current);
      responsesRef.current = snapshot;
      setResponses(snapshot);
      persistDraft(snapshot, currentIndexRef.current);
    };
    const timer = setInterval(save, 5000);
    const onPageHide = () => { if (!submitted.current) persistDraft(responsesRef.current, currentIndexRef.current); };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [persistDraft, withCurrentTime]);

  const setAnswer = useCallback((selectedIndex?: number) => {
    if (submitted.current) return;
    if (config.saveAndNext) {
      setPending({ selectedIndex, guessed: false });
      return;
    }
    const index = currentIndexRef.current;
    const id = String(paper.questions[index].id);
    const current = responsesRef.current;
    const next = { ...current, [id]: { ...current[id], selectedIndex, guessed: false } };
    responsesRef.current = next;
    setResponses(next);
    persistDraft(next, index);
  }, [config.saveAndNext, paper.questions, persistDraft]);

  const navigate = useCallback((target: number, changes?: Partial<QuestionResponse>) => {
    if (submitted.current) return;
    setPending(null);
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

  const saveAndNavigate = useCallback((target: number, markedForReview?: boolean) => {
    const review = markedForReview === undefined ? {} : { markedForReview };
    navigate(target, { ...review, ...pending });
  }, [navigate, pending]);

  const toggleGuess = () => {
    const id = String(paper.questions[currentIndexRef.current].id);
    const current = responsesRef.current[id];
    if (pending) {
      if (pending.selectedIndex !== undefined) setPending({ ...pending, guessed: !pending.guessed });
      return;
    }
    if (current?.selectedIndex === undefined || submitted.current) return;
    const next = { ...responsesRef.current, [id]: { ...current, guessed: !current.guessed } };
    if (config.saveAndNext) {
      setPending({ selectedIndex: current.selectedIndex, guessed: !current.guessed });
      return;
    }
    responsesRef.current = next;
    setResponses(next);
    persistDraft(next, currentIndexRef.current);
  };

  // Keyboard shortcuts (disabled in Strict Mouse-Only Mode)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (submitted.current || document.activeElement?.tagName === 'TEXTAREA') return;
      if (showSubmit || showFullPaper) return;
      if (config.mouseOnly) {
        if (/^[1-5]$|^Arrow|^Enter$|^ $|^m$/i.test(e.key)) e.preventDefault();
        return;
      }
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        setAnswer(Number(e.key) - 1);
      } else if (e.key === 'Enter' && !(document.activeElement instanceof HTMLButtonElement)) {
        e.preventDefault();
        saveAndNavigate(currentIndexRef.current + 1);
      } else if (e.key === 'm' || e.key === 'M') {
        const qId = String(paper.questions[currentIndexRef.current].id);
        const cur = responsesRef.current[qId]?.markedForReview ?? false;
        e.preventDefault();
        saveAndNavigate(currentIndexRef.current + 1, !cur);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [config.mouseOnly, paper.questions, saveAndNavigate, setAnswer, showFullPaper, showSubmit]);

  const question = paper.questions[currentIndex];
  const resp = responses[String(question.id)];
  const shown = pending ?? resp;
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
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-bold text-blue-800" onClick={returnToDashboard}>
            <Home className="h-4 w-4" /> {t('Save & return to dashboard', 'सेव करके डैशबोर्ड पर लौटें')}
          </button>
          <button type="button" className="rounded-lg border px-3 py-1.5 text-xs font-bold" onClick={() => setShowFullPaper(true)}>
            {t('View full paper', 'पूरा पेपर देखें')}
          </button>
          <button type="button" className="rounded-lg border px-3 py-1.5 text-xs font-bold" aria-expanded={!paletteHidden} onClick={() => { setPaletteHidden(!paletteHidden); setShowScratchpad(false); }}>
            {paletteHidden ? t('Show question numbers', 'सवाल नंबर दिखाएँ') : t('Hide question numbers', 'सवाल नंबर छिपाएँ')}
          </button>
          <button
            type="button"
            onClick={() => setShowScratchpad((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold ${showScratchpad ? 'border-blue-700 bg-blue-50 text-blue-800' : 'border-slate-300 bg-white text-slate-700'}`}
          >
            <NotebookPen className="h-4 w-4" /> {t("Rough Pad", "रफ़ पेज")}
          </button>
          <div className="hidden text-right sm:block">
            <p className="text-[11px] text-slate-500">{t("Candidate", "अभ्यर्थी")}</p>
            <p className="text-sm font-bold text-slate-800">{userName}</p>
          </div>
          <div className={`flex items-center gap-1.5 rounded-xl px-4 py-2 font-mono text-base font-bold text-white ${timerCls}`}>
            <Clock3 className="h-4 w-4" /> {mins}:{secs}
          </div>
        </div>
      </header>

      {draftError && <p role="alert" className="bg-red-50 px-6 py-2 text-sm text-red-800">
        {t('The draft could not be saved. Try again before leaving.', 'अधूरा पेपर सेव नहीं हुआ। जाने से पहले फिर कोशिश करें।')}
      </p>}
      {focusWarning && (
        <div className="flex items-center justify-between bg-amber-100 px-6 py-2 text-xs font-semibold text-amber-900">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            {t('Stay inside the exam window. Focus switches', 'परीक्षा की विंडो में रहें। स्क्रीन बदली')} · {tabSwitchCount}
          </span>
          <button onClick={() => setFocusWarning(false)} className="rounded p-0.5 hover:bg-amber-200"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className={`grid flex-1 overflow-hidden ${!paletteHidden || showScratchpad ? 'lg:grid-cols-4' : 'grid-cols-1'}`}>
        <main className={`flex flex-col overflow-hidden bg-white ${!paletteHidden || showScratchpad ? 'lg:col-span-3' : ''}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-6 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-900">{t("Question", "सवाल")} {currentIndex + 1} / {paper.questions.length}</span>
              {!config.strictOmnibus && (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800">{subjectLabel(question.subject)}</span>
              )}
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">+{question.marks.toFixed(1)} {t('marks', 'अंक')}</span>
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
                <Bookmark className="h-3.5 w-3.5" /> {t("Marked for review", "समीक्षा के लिए चिह्नित")}
              </p>
            )}
            {config.saveAndNext && <p aria-live="polite" className="mt-3 text-sm text-slate-600">
              {pending ? t('Selection not saved. Use Save & Next to keep it.', 'अभी सेव नहीं हुआ। जवाब रखने के लिए सेव करके आगे बढ़ें।') :
                resp?.selectedIndex !== undefined ? t('Answer saved', 'जवाब सेव है') : t('No answer saved', 'कोई जवाब सेव नहीं है')}
            </p>}
            <div className="mt-6 space-y-3">
              {opts.map((opt, idx) => {
                const selected = shown?.selectedIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setAnswer(idx)}
                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${selected ? 'border-blue-700 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${selected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-sm font-medium text-slate-800 md:text-base">{opt}</span>
                    </div>
                    {!config.mouseOnly && <span className="text-[11px] font-semibold text-slate-400">{t("Key", "कुंजी")} {idx + 1}</span>}
                  </button>
                );
              })}
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" disabled={shown?.selectedIndex === undefined} checked={Boolean(shown?.guessed)} onChange={toggleGuess} />
              {t('Mark answer as a guess', 'जवाब को अंदाज़ा चिह्नित करें')}
            </label>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => navigate(currentIndex - 1)}
                className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> {t("Previous", "पिछला")}
              </button>
              <button
                type="button"
                onClick={() => setAnswer()}
                className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Eraser className="h-4 w-4" /> {t("Clear response", "जवाब हटाएँ")}
              </button>
              <button
                type="button"
                onClick={() => saveAndNavigate(currentIndex + 1, !resp?.markedForReview)}
                className="flex items-center gap-1 rounded-xl border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-100"
              >
                <Bookmark className="h-4 w-4" /> {resp?.markedForReview ? t('Unmark & Next', 'चिह्न हटाएँ और आगे बढ़ें') : t('Mark for Review & Next', 'समीक्षा के लिए चिह्नित करें और आगे बढ़ें')}
              </button>
            </div>
            <div className="flex gap-2">
              {(config.saveAndNext || currentIndex < paper.questions.length - 1) && (
                <button
                  type="button"
                  onClick={() => saveAndNavigate(currentIndex + 1)}
                  className="flex items-center gap-1 rounded-xl bg-blue-700 px-5 py-2 text-sm font-bold text-white hover:bg-blue-800"
                >
                  {currentIndex < paper.questions.length - 1 ? t('Save & Next', 'सेव करें और आगे बढ़ें') : t('Save answer', 'जवाब सेव करें')} <ChevronRight className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowSubmit(true)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700"
              >
                <Send className="h-4 w-4" /> {t("Submit exam", "परीक्षा सबमिट करें")}
              </button>
            </div>
          </footer>
        </main>

        {(!paletteHidden || showScratchpad) && <div className="hidden h-full flex-col overflow-hidden lg:flex">
          {showScratchpad ? (
            <div className="flex h-full flex-col border-l border-slate-200 bg-amber-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-900">{t("Digital Rough Pad", "डिजिटल रफ़ पेज")}</h3>
                <button onClick={() => setScratchText('')} className="text-xs font-semibold text-amber-800 hover:underline">{t("Clear", "साफ़ करें")}</button>
              </div>
              <textarea
                value={scratchText}
                onChange={(e) => setScratchText(e.target.value)}
                placeholder={t("Type Maths / Reasoning rough calculations here (auto-cleared on submit)...", "गणना यहाँ करें। सबमिट करने पर यह पेज खाली हो जाएगा।")}
                className="flex-1 resize-none rounded-xl border border-amber-200 bg-white p-3 font-mono text-sm text-slate-800 focus:outline-none"
              />
            </div>
          ) : (
            <QuestionPalette questions={paper.questions} responses={responses} currentIndex={currentIndex} onSelect={(idx) => navigate(idx)} />
          )}
        </div>}
      </div>

      {(saving || saveError) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div role="dialog" aria-modal="true" aria-label={t("Save exam result", "रिज़ल्ट सेव करें")} className="rounded-xl bg-white p-5">
            {saving ? <p role="status">{t("Saving your result…", "रिज़ल्ट सेव हो रहा है…")}</p> : <>
              <p role="alert">{t("Your result could not be saved. Your answers are still here.", "रिज़ल्ट सेव नहीं हुआ। आपके जवाब अभी मौजूद हैं।")}</p>
              <button autoFocus className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-white" onClick={() => void saveSubmission()}>{t("Retry saving", "दोबारा सेव करें")}</button>
              <button className="ml-2 mt-3 rounded-lg border px-4 py-2" onClick={returnToDashboard}>
                {t('Save draft & return', 'अधूरा पेपर सेव करके लौटें')}
              </button>
              {draftError && <p role="alert" className="mt-2 text-sm text-red-700">{t('Could not save the draft.', 'अधूरा पेपर सेव नहीं हुआ।')}</p>}
            </>}
          </div>
        </div>
      )}

      {showFullPaper && (
        <dialog ref={fullPaperDialog} onCancel={() => setShowFullPaper(false)}
          aria-label={t('Full paper', 'पूरा पेपर')}
          className="max-h-[85vh] w-[min(90vw,54rem)] overflow-y-auto rounded-xl bg-white p-5 backdrop:bg-slate-900/60">
          <div className="sticky -top-5 flex items-center justify-between bg-white py-3">
            <h2 className="text-xl font-bold">{t('Full paper', 'पूरा पेपर')}</h2>
            <button autoFocus className="rounded-lg border px-3 py-1" onClick={() => setShowFullPaper(false)}>{t('Close', 'बंद करें')}</button>
          </div>
          <ol className="divide-y divide-slate-200">
            {paper.questions.map((item, index) => (
              <li key={item.id} className="py-3">
                <button className="block text-left font-semibold text-blue-800 hover:underline" onClick={() => { setShowFullPaper(false); navigate(index); }}>
                  {index + 1}. {language === 'hi' ? item.question_hi : item.question_en}
                </button>
                <ol className="ml-6 list-[upper-alpha] text-sm text-slate-700">
                  {(language === 'hi' ? item.options_hi : item.options_en).map((option, optionIndex) => <li key={optionIndex}>{option}</li>)}
                </ol>
              </li>
            ))}
          </ol>
        </dialog>
      )}

      {showSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="submit-heading" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="submit-heading" className="text-xl font-bold text-slate-900">{t("Confirm Exam Submission", "परीक्षा सबमिट करने की पुष्टि")}</h2>
            <p className="mt-1 text-sm text-slate-600">{t("Review your attempt summary before final submission:", "सबमिट करने से पहले अपने जवाबों की स्थिति देखें।")}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-emerald-50 p-3 font-semibold text-emerald-900">{t("Answered:", "जवाब दिए")} {summaryCounts.answered}</div>
              <div className="rounded-xl bg-red-50 p-3 font-semibold text-red-900">{t("Not Answered (Visited):", "देखे, जवाब बाकी")} {summaryCounts.notAnswered}</div>
              <div className="rounded-xl bg-violet-50 p-3 font-semibold text-violet-900">{t("Marked for Review:", "समीक्षा के लिए चिह्नित")} {summaryCounts.marked}</div>
              <div className="rounded-xl bg-slate-100 p-3 font-semibold text-slate-800">{t("Not Visited:", "नहीं देखे")} {summaryCounts.notVisited}</div>
            </div>
            {pending && <p role="status" className="mt-3 text-sm text-amber-800">{t('The current change is not saved. Return to save it.', 'मौजूदा बदलाव सेव नहीं है। सेव करने के लिए परीक्षा पर लौटें।')}</p>}
            <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm">
              {paper.questions.map((item, index) => {
                const response = responses[String(item.id)];
                if (response?.selectedIndex !== undefined && !response.markedForReview) return null;
                return <li key={item.id}>
                  <button className="w-full rounded px-2 py-1 text-left text-blue-800 hover:bg-blue-50" onClick={() => { setShowSubmit(false); navigate(index); }}>
                    {t('Question', 'सवाल')} {index + 1} · {response?.markedForReview ? t('Marked for review', 'समीक्षा के लिए चिह्नित') : t('Unanswered', 'जवाब बाकी')}
                  </button>
                </li>;
              })}
            </ul>
            <div className="mt-6 flex gap-3">
              <button autoFocus onClick={() => setShowSubmit(false)} className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                {t("Return to Exam", "परीक्षा पर लौटें")}
              </button>
              <button onClick={() => submitExam(false)} className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
                {t("Confirm & Submit", "पुष्टि करके सबमिट करें")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
