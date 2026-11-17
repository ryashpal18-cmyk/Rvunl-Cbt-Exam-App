import { useEffect, useState } from 'react';
import {
  Attempt,
  DraftExamState,
  ExamConfig,
  Paper,
  Question,
  QuestionResponse,
  StoredState,
  ThemeMode,
  UserId,
} from './types/exam';
import { loadBuiltInPapers } from './data/builtInPapers';
import { storage } from './services/storage';
import { getUserTheme, setUserTheme } from './services/userExtras';
import { scoreExam } from './utils/scoring';
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
  | { name: 'exam'; paper: Paper; config: ExamConfig; draft?: DraftExamState | null }
  | { name: 'scorecard'; attempt: Attempt; paper: Paper }
  | { name: 'review'; attempt: Attempt; paper: Paper };

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
  let questions: Question[] = base.questions.map((q) => ({ ...q }));
  if (config.shuffleQuestions) {
    questions = shuffleArray(questions);
  }
  if (config.shuffleOptions) {
    questions = questions.map((q) => {
      const hasFixedOption = q.options_en.some((o) => SKIP_OPTION_SHUFFLE_RE.test(o));
      if (hasFixedOption) return q;
      const order = shuffleArray([0, 1, 2, 3, 4]);
      const options_en = order.map((idx) => q.options_en[idx]) as [string, string, string, string, string];
      const options_hi = order.map((idx) => q.options_hi[idx]) as [string, string, string, string, string];
      const correctIndex = order.indexOf(q.correctIndex);
      return { ...q, options_en, options_hi, correctIndex };
    });
  }
  return { ...base, questions };
}

export default function App() {
  const [state, setState] = useState<StoredState | null>(null);
  const [userId, setUserId] = useState<UserId | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [screen, setScreen] = useState<Screen>({ name: 'profile' });

  const builtInPapers = loadBuiltInPapers();

  const reload = async () => {
    const next = await storage.loadState(builtInPapers);
    setState(next);
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

  const themeClass = theme === 'dark' ? 'theme-dark' : theme === 'warm' ? 'theme-warm' : '';

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm font-semibold text-slate-600">
        Loading RVUNL CBT Engine...
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeClass}`}>
      {screen.name === 'profile' || !userId || !currentProfile ? (
        <ProfileSelector
          profiles={state.profiles}
          onVerifyPin={(id, pin) => storage.verifyProfilePin(id, pin)}
          onSelect={handleSelectProfile}
        />
      ) : null}

      {screen.name === 'dashboard' && userId && currentProfile && (
        <Dashboard
          userId={userId}
          userName={currentProfile.name}
          profiles={state.profiles}
          attempts={state.attempts}
          papers={state.papers}
          theme={theme}
          onThemeChange={handleThemeChange}
          onStart={(paperId) => {
            const paper = state.papers.find((p) => p.paperId === paperId);
            if (paper) setScreen({ name: 'instructions', paper });
          }}
          onStartVirtualPaper={(paper) => setScreen({ name: 'instructions', paper })}
          onResumeDraft={(draft) => setScreen({ name: 'exam', paper: draft.paper, config: draft.config, draft })}
          onOpenAttempt={(attempt) => {
            const paper = attempt.sessionPaper ?? state.papers.find((p) => p.paperId === attempt.paperId);
            if (paper) setScreen({ name: 'scorecard', attempt, paper });
          }}
          onLogout={() => {
            setUserId(null);
            setTheme('light');
            setScreen({ name: 'profile' });
          }}
          onVerifyAdminPin={(pin) => storage.verifyAdminPin(pin)}
          onChangeAdminPin={(oldPin, newPin) => storage.changeAdminPin(oldPin, newPin)}
          onImportPapers={async (papers) => {
            await storage.addPapers(papers);
            await reload();
          }}
          onDeletePapers={async (ids) => {
            await storage.deletePapers(ids);
            await reload();
          }}
          onResetResults={async (target) => {
            await storage.resetResults(target);
            await reload();
          }}
          onAddProfile={async (name, pin) => {
            const created = await storage.addProfile(name, pin);
            await reload();
            return created;
          }}
          onDeleteProfile={async (id) => {
            await storage.deleteProfile(id);
            await reload();
          }}
          onExportBackup={() => storage.exportBackup()}
          onImportBackup={async (json) => {
            await storage.importBackup(json);
            await reload();
          }}
          onSaveExport={(data, defaultName) => storage.saveExportFile(data, defaultName)}
        />
      )}

      {screen.name === 'instructions' && (
        <InstructionsModal
          paper={screen.paper}
          onCancel={() => setScreen({ name: 'dashboard' })}
          onBegin={(config) => {
            const sessionPaper = buildSessionPaper(screen.paper, config);
            setScreen({ name: 'exam', paper: sessionPaper, config, draft: null });
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
          onSubmit={async (responses: Record<string, QuestionResponse>, timeTakenSeconds, submittedByTimer, tabSwitchCount) => {
            const summary = scoreExam(screen.paper, responses, screen.config.negativeMarking);
            const attempt: Attempt = {
              attemptId: `att_${Date.now()}`,
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
            await storage.saveAttempt(attempt);
            await reload();
            setScreen({ name: 'scorecard', attempt, paper: screen.paper });
          }}
        />
      )}

      {screen.name === 'scorecard' && (
        <Scorecard
          attempt={screen.attempt}
          paper={screen.paper}
          onReview={() => setScreen({ name: 'review', attempt: screen.attempt, paper: screen.paper })}
          onDashboard={() => setScreen({ name: 'dashboard' })}
        />
      )}

      {screen.name === 'review' && userId && (
        <PaperReview
          userId={userId}
          attempt={screen.attempt}
          paper={screen.paper}
          onBack={() => setScreen({ name: 'scorecard', attempt: screen.attempt, paper: screen.paper })}
        />
      )}
    </div>
  );
}
