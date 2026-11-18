import { AppLanguage } from './uiLanguage';
import { useEffect, useState } from 'react';
import {
  Attempt,
  DraftExamState,
  ExamConfig,
  Language,
  Paper,
  Question,
  QuestionResponse,
  StoredState,
  ThemeMode,
  UserId,
} from './types/exam';
import { loadBuiltInPapers } from './data/builtInPapers';
import * as storage from './services/storage';
import { getUserTheme, loadExamDraft, setUserTheme } from './services/userExtras';
import { calculateScore } from './utils/scoring';
import Dashboard from './components/Dashboard';
import ExamScreen from './components/ExamScreen';
import InstructionsModal from './components/InstructionsModal';
import PaperReview from './components/PaperReview';
import ProfileSelector from './components/ProfileSelector';
import Scorecard from './components/Scorecard';

type Screen =
  | { name: 'profile' }
  | { name: 'dashboard' }
  | { name: 'instructions'; paper: Paper }
  | { name: 'exam'; attemptId: string; paper: Paper; config: ExamConfig; draft?: DraftExamState | null }
  | { name: 'scorecard'; attempt: Attempt; paper: Paper }
  | { name: 'review'; attempt: Attempt; paper: Paper };

const builtInPapers = loadBuiltInPapers();

const SKIP_OPTION_SHUFFLE_RE = /no error|all of these|none of these|उपरोक्त सभी|इनमें से कोई नहीं/i;

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildSessionPaper(base: Paper, config: ExamConfig): Paper {
  let questions: Question[] = base.questions.map((q) => ({ ...q, source: q.source ?? { title: base.title, year: base.year } }));
  if (config.shuffleQuestions) {
    questions = shuffleArray(questions);
  }
  if (config.shuffleOptions) {
    questions = questions.map((q) => {
      const hasFixedOption = [...q.options_en, ...q.options_hi].some((o) => SKIP_OPTION_SHUFFLE_RE.test(o));
      if (hasFixedOption) return q;
      const order = shuffleArray([0, 1, 2, 3, 4]);
      const options_en = order.map((idx) => q.options_en[idx]) as [string, string, string, string, string];
      const options_hi = order.map((idx) => q.options_hi[idx]) as [string, string, string, string, string];
      const correctIndex = order.indexOf(q.correctIndex);
      return {
        ...q, options_en, options_hi, correctIndex,
        optionExplanations_en: q.optionExplanations_en && order.map((idx) => q.optionExplanations_en![idx]),
        optionExplanations_hi: q.optionExplanations_hi && order.map((idx) => q.optionExplanations_hi![idx]),
      };
    });
  }
  return { ...base, questions };
}

function enterFullscreen(): void {
  void document.documentElement.requestFullscreen?.().catch(() => undefined);
}

export default function App() {
  const [uiLanguage, setUiLanguage] = useState<Language>(() => localStorage.getItem('rvunl-ui-language') === 'hi' ? 'hi' : 'en');
  const [state, setState] = useState<StoredState | null>(null);
  const [userId, setUserId] = useState<UserId | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [screen, setScreen] = useState<Screen>({ name: 'profile' });

  const reload = async () => {
    const next = await storage.loadState();
    const papers = new Map(builtInPapers.map((paper) => [paper.paperId, paper]));
    for (const paper of next.papers) if (!papers.has(paper.paperId)) papers.set(paper.paperId, paper);
    setState({ ...next, papers: [...papers.values()] });
  };

  useEffect(() => {
    reload();
  }, []);

  const currentProfile = state?.profiles.find((p) => p.id === userId) ?? null;

  const handleSelectProfile = (id: UserId) => {
    setUserId(id);
    setTheme(getUserTheme(id));
    setScreen({ name: 'dashboard' });
  };

  const handleThemeChange = (next: ThemeMode) => {
    setTheme(next);
    if (userId) setUserTheme(userId, next);
  };

  useEffect(() => {
    document.documentElement.lang = uiLanguage;
    localStorage.setItem('rvunl-ui-language', uiLanguage);
  }, [uiLanguage]);

  const openDashboard = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    setScreen({ name: 'dashboard' });
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen.name]);

  const themeClass = theme === 'dark' ? 'theme-dark' : theme === 'warm' ? 'theme-warm' : '';

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm font-semibold text-slate-600">
        Loading RVUNL CBT Engine...
      </div>
    );
  }

  return (
    <AppLanguage.Provider value={uiLanguage}>
    <div className={`min-h-screen ${themeClass}`}>
      {(screen.name === 'dashboard' || screen.name === 'profile') && (
        <div className="flex justify-end border-b border-slate-200 bg-white px-6 py-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            {uiLanguage === 'hi' ? 'ऐप की भाषा' : 'App language'}
            <select className="rounded border border-slate-300 bg-white px-2 py-1" value={uiLanguage} onChange={(event) => setUiLanguage(event.target.value as Language)}>
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
            </select>
          </label>
        </div>
      )}
      {screen.name === 'profile' || !userId || !currentProfile ? (
        <ProfileSelector
          profiles={state.profiles}
          onLogin={async (id, pin) => {
            if (state.profiles.find((profile) => profile.id === id)?.pinConfigured && !(await storage.checkPin(id, pin ?? ''))) return false;
            handleSelectProfile(id);
            return true;
          }}
          onSetPin={async (id, pin, currentPin) => {
            if (state.profiles.find((profile) => profile.id === id)?.pinConfigured && !(await storage.checkPin(id, currentPin ?? ''))) return false;
            await storage.updatePin(id, pin);
            await reload();
            return true;
          }}
        />
      ) : null}

      {screen.name === 'dashboard' && userId && currentProfile && (
        <Dashboard
          userId={userId}
          userName={currentProfile.name}
          attempts={state.attempts}
          papers={state.papers}
          theme={theme}
          onThemeChange={handleThemeChange}
          onStart={(paperId) => {
            const paper = state.papers.find((p) => p.paperId === paperId);
            if (paper && !loadExamDraft(userId)) setScreen({ name: 'instructions', paper });
          }}
          onStartVirtualPaper={(paper) => { if (!loadExamDraft(userId)) setScreen({ name: 'instructions', paper }); }}
          onResumeDraft={(draft) => { enterFullscreen(); setScreen({ name: 'exam', attemptId: draft.attemptId ?? crypto.randomUUID(), paper: draft.paper, config: draft.config, draft }); }}
          onOpenAttempt={(attempt) => {
            const paper = attempt.sessionPaper ?? state.papers.find((p) => p.paperId === attempt.paperId);
            if (paper) setScreen({ name: 'scorecard', attempt, paper });
          }}
          onLogout={() => {
            setUserId(null);
            setTheme('light');
            setScreen({ name: 'profile' });
          }}
          admin={{
            attempts: state.attempts,
            catalog: state.papers,
            papers: state.papers.filter((paper) => !builtInPapers.some((builtIn) => builtIn.paperId === paper.paperId)),
            profiles: state.profiles,
            onVerifyPin: storage.checkAdminPin,
            onChangePin: storage.updateAdminPin,
            onImport: async (papers, pin) => {
              const count = await storage.persistPapers(papers, pin);
              await reload();
              return count;
            },
            onDeletePapers: async (ids, pin) => {
              const count = await storage.removePapers(ids, pin);
              await reload();
              return count;
            },
            onResetResults: async (target, pin) => {
              const count = await storage.resetStoredAttempts(target, pin);
              await reload();
              return count;
            },
            onAddProfile: async (name, pin) => {
              const profile = await storage.createProfile(name, pin);
              await reload();
              return profile;
            },
            onDeleteProfile: async (id, pin) => {
              const count = await storage.removeProfile(id, pin);
              await reload();
              return count;
            },
            onExportBackup: storage.exportBackup,
            onImportBackup: async (pin) => {
              const restored = await storage.importBackup(pin);
              if (restored) {
                await reload();
                setTheme(getUserTheme(userId));
              }
              return Boolean(restored);
            },
            onSaveExport: storage.saveAdminExport,
          }}
          onSaveExport={storage.saveProfileExport}
        />
      )}

      {screen.name === 'instructions' && (
        <InstructionsModal
          paper={screen.paper}
          onBack={() => setScreen({ name: 'dashboard' })}
          onStart={(config) => {
            const sessionPaper = buildSessionPaper(screen.paper, config);
            enterFullscreen();
            setScreen({ name: 'exam', attemptId: crypto.randomUUID(), paper: sessionPaper, config, draft: null });
          }}
        />
      )}

      {screen.name === 'exam' && userId && currentProfile && (
        <ExamScreen
          userId={userId}
          userName={currentProfile.name}
          paper={screen.paper}
          config={screen.config}
          initialDraft={screen.draft}
          attemptId={screen.attemptId}
          onDashboard={openDashboard}
          onSubmit={async (responses: Record<string, QuestionResponse>, timeTakenSeconds, submittedByTimer, tabSwitchCount) => {
            const summary = calculateScore(screen.paper, responses, screen.config.negativeMarking);
            const attempt: Attempt = {
              attemptId: screen.attemptId,
              userId,
              paperId: screen.paper.paperId,
              paperTitle: screen.paper.title,
              timestamp: new Date().toISOString(),
              timeTakenSeconds,
              totalScore: summary.score,
              maxScore: summary.maxScore,
              negativeMarking: screen.config.negativeMarking,
              responses,
              submittedByTimer,
              tabSwitchCount,
              sessionPaper: screen.paper,
            };
            await storage.persistAttempt(attempt);
            setState((current) => current && ({
              ...current,
              attempts: [attempt, ...current.attempts.filter((item) => item.attemptId !== attempt.attemptId)],
            }));
            setScreen({ name: 'scorecard', attempt, paper: screen.paper });
          }}
        />
      )}

      {screen.name === 'scorecard' && (
        <Scorecard
          attempt={screen.attempt}
          paper={screen.paper}
          onReview={() => setScreen({ name: 'review', attempt: screen.attempt, paper: screen.paper })}
          onDashboard={openDashboard}
        />
      )}

      {screen.name === 'review' && userId && (
        <PaperReview
          userId={userId}
          attempt={screen.attempt}
          paper={screen.paper}
          onBack={() => setScreen({ name: 'scorecard', attempt: screen.attempt, paper: screen.paper })}
          onDashboard={openDashboard}
        />
      )}
    </div>
    </AppLanguage.Provider>
  );
}
