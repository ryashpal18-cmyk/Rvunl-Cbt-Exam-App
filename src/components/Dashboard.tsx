import { subjectPracticePapers } from '../data/subjectPractice';
import { bankQuestions, shuffled } from '../utils/questionBank';
import PracticeLab from './PracticeLab';
import ComparisonView from './ComparisonView';
import { useSubjectLabel, useTranslation } from '../uiLanguage';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  Bookmark,
  CheckCircle2,
  Clock3,
  Download,
  Flame,
  Keyboard,
  LogOut,
  Menu,
  X,
  ArrowUpRight,
  Moon,
  Play,
  Settings,
  Shuffle,
  Sparkles,
  Sun,
  TrendingUp,
  Upload,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Attempt,
  DraftExamState,
  Paper,
  Question,
  SUBJECTS,
  Subject,
  ThemeMode,
  UserId,
} from '../types/exam';
import {
  dailyScore,
  formatDuration,
  localDateKey,
  resultForAttempt,
} from '../utils/scoring';
import {
  clearExamDraft,
  exportUserExtrasJson,
  getBookmarks,
  importUserExtrasJson,
  loadExamDraft,
  toggleBookmark,
} from '../services/userExtras';
import AdminPanel from './AdminPanel';
import MistakeBank from './MistakeBank';
import TypingPractice from './TypingPractice';
import UpdateManager from './UpdateManager';

interface Props {
  userId: UserId;
  userName: string;
  attempts: Attempt[];
  papers: Paper[];
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onStart: (paperId: string) => void;
  onStartVirtualPaper: (paper: Paper) => void;
  onResumeDraft: (draft: DraftExamState) => void;
  onOpenAttempt: (attempt: Attempt) => void;
  onLogout: () => void;
  admin: React.ComponentProps<typeof AdminPanel>;
  onSaveExport: (data: Uint8Array, defaultName: string) => Promise<void>;
}

type Tab =
  | 'practice'
  | 'papers'
  | 'history'
  | 'bookmarks'
  | 'typing'
  | 'mistakes'
  | 'compare'
  | 'settings';

const SURPRISE_QUOTA: Record<Subject, { count: number; marks: number }> = {
  'Rajasthan GK': { count: 23, marks: 2 },
  'World, India & Everyday Science': { count: 7, marks: 2 },
  'Reasoning & Mental Ability': { count: 10, marks: 1 },
  'Hindi General': { count: 10, marks: 1 },
  'English General': { count: 10, marks: 1 },
  Mathematics: { count: 10, marks: 1 },
};

function computeDailyStreak(userAttempts: Attempt[]): number {
  if (userAttempts.length === 0) return 0;
  const localDay = (date: Date) => date.toLocaleDateString();
  const daySet = new Set(
    userAttempts.map((a) => localDay(new Date(a.timestamp))),
  );
  let streak = 0;
  const cursor = new Date();
  const todayStr = localDay(cursor);
  if (!daySet.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (daySet.has(localDay(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function Dashboard({
  userId,
  userName,
  attempts,
  papers,
  theme,
  onThemeChange,
  onStart,
  onStartVirtualPaper,
  onResumeDraft,
  onOpenAttempt,
  onLogout,
  admin,
  onSaveExport,
}: Props) {
  const t = useTranslation();
  const subjectLabel = useSubjectLabel();
  const [historyDay, setHistoryDay] = useState(() => localDateKey(new Date()));
  const [tab, setTab] = useState<Tab>('papers');
  const [draft, setDraft] = useState<DraftExamState | null>(() =>
    loadExamDraft(userId),
  );
  const [bookmarks, setBookmarks] = useState(() => getBookmarks(userId));
  const [miniSubject, setMiniSubject] = useState<Subject>('Rajasthan GK');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [extrasMsg, setExtrasMsg] = useState<string | null>(null);
  const extrasInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setExtrasMsg(null);
    setSidebarOpen(false);
  }, [userId]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [sidebarOpen]);

  useEffect(() => {
    setBookmarks(getBookmarks(userId));
    setDraft(loadExamDraft(userId));
  }, [tab, userId, attempts, papers]);

  const userAttempts = useMemo(
    () =>
      attempts
        .filter((a) => a.userId === userId)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [attempts, userId],
  );

  const profileDraft = draft?.userId === userId ? draft : null;
  const profileBookmarks = useMemo(
    () => getBookmarks(userId),
    [userId, bookmarks],
  );
  const scoreOutOf100 = (attempt: Attempt) =>
    attempt.maxScore > 0 ? (attempt.totalScore / attempt.maxScore) * 100 : 0;
  const averageScore = userAttempts.length
    ? userAttempts.reduce((sum, attempt) => sum + scoreOutOf100(attempt), 0) /
      userAttempts.length
    : 0;
  const bestScore = userAttempts.length
    ? Math.max(...userAttempts.map(scoreOutOf100))
    : 0;

  const today = localDateKey(new Date());
  const totalToday = dailyScore(userAttempts, today);
  const latestToday = userAttempts.find(
    (attempt) => localDateKey(new Date(attempt.timestamp)) === today,
  );
  const safeZone =
    latestToday !== undefined && scoreOutOf100(latestToday) >= 75;
  const selectedDayTotal =
    historyDay === today ? totalToday : dailyScore(userAttempts, historyDay);
  const paperMap = useMemo(
    () => new Map(papers.map((p) => [p.paperId, p])),
    [papers],
  );

  const latestByPaper = useMemo(() => {
    const map = new Map<string, Attempt>();
    for (const a of userAttempts) {
      if (!map.has(a.paperId)) map.set(a.paperId, a);
    }
    return map;
  }, [userAttempts]);

  const streakDays = useMemo(
    () => computeDailyStreak(userAttempts),
    [userAttempts],
  );

  const trendData = useMemo(() => {
    return [...userAttempts]
      .reverse()
      .slice(-15)
      .map((a, idx) => ({
        label: `#${idx + 1}`,
        score: a.maxScore
          ? Math.round((a.totalScore / a.maxScore) * 10000) / 100
          : 0,
        title: a.paperTitle,
      }));
  }, [userAttempts]);

  const weakSubjects = useMemo(() => {
    const lastFive = userAttempts.slice(0, 5);
    if (lastFive.length === 0) return [];
    const totals = new Map<Subject, { correct: number; total: number }>();
    for (const s of SUBJECTS) totals.set(s, { correct: 0, total: 0 });

    for (const a of lastFive) {
      const p = a.sessionPaper ?? paperMap.get(a.paperId);
      if (!p) continue;
      const res = resultForAttempt(a, p);
      for (const sr of res.subjects) {
        const cur = totals.get(sr.subject)!;
        cur.correct += sr.correct;
        cur.total += sr.attempted;
      }
    }

    return SUBJECTS.filter((s) => {
      const t = totals.get(s)!;
      return t.total > 0 && (t.correct / t.total) * 100 < 60;
    }).map((s) => {
      const t = totals.get(s)!;
      return { subject: s, accuracy: Math.round((t.correct / t.total) * 100) };
    });
  }, [paperMap, userAttempts]);

  const questionPoolBySubject = useMemo(() => {
    const pool = new Map<Subject, Question[]>();
    for (const s of SUBJECTS) pool.set(s, []);
    for (const question of bankQuestions(papers))
      pool.get(question.subject)?.push(question);
    return pool;
  }, [papers]);

  const practicePapers = useMemo(
    () => [...papers, ...subjectPracticePapers],
    [papers],
  );
  const subjectPracticePool = useMemo(
    () => bankQuestions(practicePapers),
    [practicePapers],
  );

  const canGenerateSurprise = SUBJECTS.every(
    (subject) =>
      (questionPoolBySubject.get(subject)?.length ?? 0) >=
      SURPRISE_QUOTA[subject].count,
  );

  const launchSurpriseMix = () => {
    if (profileDraft || !canGenerateSurprise) return;
    const selected: Question[] = [];
    let nextId = 1;
    for (const subject of SUBJECTS) {
      const quota = SURPRISE_QUOTA[subject];
      const available = [...(questionPoolBySubject.get(subject) ?? [])];
      for (let i = available.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
      }
      for (const q of available.slice(0, quota.count)) {
        selected.push({ ...q, id: nextId++, marks: quota.marks });
      }
    }
    if (selected.length === 0) return;
    const mixPaper: Paper = {
      paperId: `surprise_${Date.now()}`,
      title: `Surprise OMNIBUS Mix (${selected.length} Qs)`,
      durationMinutes: 60,
      questions: selected,
      category: 'Custom',
      difficulty: 'Hard',
    };
    onStartVirtualPaper(mixPaper);
  };

  const launchSubjectTest = (subject: Subject) => {
    if (profileDraft) return;
    const available = subjectPracticePool.filter(
      (question) => question.subject === subject,
    );
    const picked = shuffled(available)
      .slice(0, 50)
      .map((question, index) => ({ ...question, id: index + 1 }));
    onStartVirtualPaper({
      paperId: crypto.randomUUID(),
      title: `${subjectLabel(subject)} · ${picked.length} ${t('questions', 'सवाल')}`,
      durationMinutes: 50,
      questions: picked,
      category: 'Subject Practice',
    });
  };

  const handleExportExtras = async () => {
    const json = exportUserExtrasJson(userId);
    await onSaveExport(
      new TextEncoder().encode(json),
      `${userName}_v2_extras_backup.json`,
    );
    setExtrasMsg('Exported bookmarks, typing history, and theme backup.');
  };

  const handleImportExtras = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      importUserExtrasJson(userId, text);
      setBookmarks(getBookmarks(userId));
      setDraft(loadExamDraft(userId));
      setExtrasMsg('Restored bookmarks and typing history successfully.');
    } catch {
      setExtrasMsg('Invalid backup JSON file.');
    }
  };

  const navItems: Array<{ id: Tab; label: string; icon: typeof BookOpen }> = [
    {
      id: 'papers',
      label: `${t('Mock Papers', 'मॉक पेपर')} (${papers.length})`,
      icon: BookOpen,
    },
    { id: 'practice', label: t('Practice', 'अभ्यास'), icon: TrendingUp },
    {
      id: 'history',
      label: `${t('History', 'इतिहास')} (${userAttempts.length})`,
      icon: BarChart3,
    },
    {
      id: 'bookmarks',
      label: `${t('Bookmarks', 'बुकमार्क')} (${profileBookmarks.length})`,
      icon: Bookmark,
    },
    {
      id: 'typing',
      label: t('Typing (Phase-II)', 'टाइपिंग (चरण II)'),
      icon: Keyboard,
    },
    { id: 'mistakes', label: t('Mistake Bank', 'गलत सवाल'), icon: Award },
    { id: 'compare', label: t('Compare', 'तुलना'), icon: BarChart3 },
    {
      id: 'settings',
      label: t('Settings & Backup', 'सेटिंग और बैकअप'),
      icon: Settings,
    },
  ];

  const themeSwitcher = (location: string) => (
    <div
      className="dashboard-theme-switch"
      role="group"
      aria-label={`${t('Eye-comfort theme', 'आँखों के अनुकूल थीम')} · ${location}`}
    >
      {(['light', 'dark', 'warm'] as ThemeMode[]).map((mode) => {
        const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Sparkles;
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={theme === mode}
            onClick={() => onThemeChange(mode)}
          >
            <Icon size={14} aria-hidden="true" />
            <span>
              {mode === 'light'
                ? t('Light', 'लाइट')
                : mode === 'dark'
                  ? t('Dark', 'डार्क')
                  : t('Warm', 'वार्म')}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="dashboard-shell" data-theme={theme}>
      {sidebarOpen && (
        <button
          className="dashboard-backdrop lg:hidden"
          aria-label={t('Close navigation', 'नेविगेशन बंद करें')}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`dashboard-sidebar ${sidebarOpen ? 'is-open' : ''}`}
        aria-label={t('Dashboard navigation', 'डैशबोर्ड नेविगेशन')}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="dashboard-brand-icon">
              <BookOpen size={23} />
            </span>
            <h1 className="text-sm font-extrabold leading-6">
              RVUNL Junior
              <br />
              Assistant CBT
            </h1>
          </div>
          <button
            className="dashboard-icon-button lg:hidden"
            aria-label={t('Close navigation', 'नेविगेशन बंद करें')}
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="dashboard-profile mt-8">
          <span className="dashboard-avatar" aria-hidden="true">
            {userName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="dashboard-kicker">
              {t('Active profile', 'सक्रिय प्रोफ़ाइल')}
            </p>
            <p className="mt-1 truncate text-sm font-bold">
              {t('Candidate:', 'अभ्यर्थी:')} {userName}
            </p>
          </div>
          <span className="dashboard-streak">
            <Flame size={14} />
            {t('Daily Streak:', 'लगातार अभ्यास:')} {streakDays}{' '}
            {t('Days', 'दिन')}
          </span>
        </div>
        <p className="dashboard-kicker mb-3 mt-8">
          {t('Your workspace', 'आपका अभ्यास केंद्र')}
        </p>
        <nav
          className="space-y-1"
          aria-label={t('Main navigation', 'मुख्य नेविगेशन')}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={tab === item.id ? 'page' : undefined}
                className={`dashboard-nav-item ${tab === item.id ? 'is-active' : ''}`}
                onClick={() => {
                  setTab(item.id);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
                {tab === item.id && <span className="dashboard-active-dot" />}
              </button>
            );
          })}
        </nav>
        <div className="dashboard-sidebar-bottom">
          <p className="dashboard-kicker mb-3">
            {t('Eye comfort', 'आँखों का आराम')}
          </p>
          {themeSwitcher('sidebar')}
          <button
            type="button"
            onClick={onLogout}
            className="dashboard-secondary mt-3 w-full"
          >
            <LogOut size={16} />
            {t('Switch Profile', 'प्रोफ़ाइल बदलें')}
          </button>
          <p className="dashboard-muted mt-5 text-center text-[10px]">
            RVUNL · {t('Practice with purpose', 'लक्ष्य के साथ अभ्यास')}
          </p>
        </div>
      </aside>
      <div className="dashboard-workspace">
        <header className="dashboard-header">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="dashboard-icon-button lg:hidden"
              aria-expanded={sidebarOpen}
              aria-label={t('Open navigation', 'नेविगेशन खोलें')}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={21} />
            </button>
            <div>
              <p className="dashboard-kicker">
                {t('Your next milestone starts here', 'अगली सफलता की तैयारी')}
              </p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
                {t('Welcome back,', 'वापस स्वागत है,')} {userName}!
              </h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {themeSwitcher('header')}
            <button
              type="button"
              onClick={onLogout}
              className="dashboard-secondary"
            >
              <LogOut size={15} />
              {t('Switch Profile', 'प्रोफ़ाइल बदलें')}
            </button>
          </div>
        </header>
        <main className="dashboard-content" id="dashboard-main">
          {profileDraft && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
              <div>
                <p className="text-xs font-bold uppercase text-amber-800">
                  {t('Interrupted Exam Found', 'अधूरी परीक्षा मिली')}
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {profileDraft.paper.title} ·{' '}
                  {formatDuration(profileDraft.remainingSeconds)}{' '}
                  {t('remaining', 'बाकी')}
                </p>
                <p className="text-xs text-amber-900">
                  {t(
                    'Resume or discard this saved paper before starting another.',
                    'नया पेपर शुरू करने से पहले यह पेपर जारी रखें या हटाएँ।',
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearExamDraft(userId);
                    setDraft(null);
                  }}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900"
                >
                  {t('Discard', 'हटाएँ')}
                </button>
                <button
                  type="button"
                  onClick={() => onResumeDraft(profileDraft)}
                  className="rounded-lg bg-amber-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
                >
                  {t('Resume Interrupted Exam', 'अधूरी परीक्षा जारी रखें')}
                </button>
              </div>
            </div>
          )}

          {tab === 'practice' && (
            <PracticeLab
              userId={userId}
              papers={practicePapers}
              attempts={userAttempts}
              onStart={onStartVirtualPaper}
              disabled={Boolean(profileDraft)}
            />
          )}

          {tab === 'papers' && (
            <>
              <div className="grid gap-5 xl:grid-cols-2">
                <section className="glass-card dashboard-summary">
                  <div>
                    <p className="dashboard-kicker">
                      {t('The big picture', 'आपकी प्रगति')}
                    </p>
                    <h2 className="mt-2 text-lg font-bold">
                      {t('Overall Exam Summary', 'सभी परीक्षाओं का सारांश')}
                    </h2>
                    <p className="dashboard-muted mt-2 text-xs">
                      {t(
                        'Every attempt brings you closer.',
                        'हर प्रयास सफलता के करीब ले जाता है।',
                      )}
                    </p>
                    <dl className="mt-7 flex gap-8">
                      <div>
                        <dt className="dashboard-muted text-xs">
                          {t('Tests Taken', 'कुल टेस्ट')}
                        </dt>
                        <dd className="mt-1 text-3xl font-extrabold">
                          {userAttempts.length}
                        </dd>
                      </div>
                      <div>
                        <dt className="dashboard-muted text-xs">
                          {t('Best Score', 'सर्वश्रेष्ठ स्कोर')}
                        </dt>
                        <dd className="mt-1 text-3xl font-extrabold">
                          {bestScore.toFixed(1)}
                          <span className="dashboard-muted text-xs font-medium">
                            {' '}
                            /100
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div
                    className="dashboard-progress"
                    role="img"
                    aria-label={`${t('Average score', 'औसत स्कोर')} ${averageScore.toFixed(1)} / 100`}
                  >
                    <svg viewBox="0 0 160 160" aria-hidden="true">
                      <circle
                        className="dashboard-ring-track"
                        cx="80"
                        cy="80"
                        r="65"
                      />
                      <circle
                        className="dashboard-ring-value"
                        cx="80"
                        cy="80"
                        r="65"
                        pathLength="100"
                        strokeDasharray={`${Math.min(100, Math.max(0, averageScore))} 100`}
                      />
                    </svg>
                    <div>
                      <strong>{averageScore.toFixed(1)}</strong>
                      <span>{t('Avg / 100', 'औसत / 100')}</span>
                    </div>
                  </div>
                </section>
                <section className="glass-card p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="dashboard-kicker">
                        {new Date().toLocaleDateString(undefined, {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <h2 className="mt-2 text-lg font-bold">
                        {t(
                          "Today's Exam Performance",
                          'आज की परीक्षा का प्रदर्शन',
                        )}
                      </h2>
                    </div>
                    <span className="dashboard-card-icon">
                      <Award size={23} />
                    </span>
                  </div>
                  <dl className="mt-6 grid grid-cols-3 gap-3">
                    <div>
                      <dt className="dashboard-muted text-xs">
                        {t("Today's Tests", 'आज के टेस्ट')}
                      </dt>
                      <dd className="mt-2 text-3xl font-extrabold">
                        {totalToday.count}
                      </dd>
                    </div>
                    <div>
                      <dt className="dashboard-muted text-xs">
                        {t('Latest Score', 'नवीनतम स्कोर')}
                      </dt>
                      <dd className="mt-2 text-2xl font-extrabold">
                        {latestToday
                          ? scoreOutOf100(latestToday).toFixed(1)
                          : '—'}
                        <span className="dashboard-muted text-xs font-medium">
                          {' '}
                          /100
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="dashboard-muted text-xs">
                        {t('Time Taken', 'लगा समय')}
                      </dt>
                      <dd className="mt-2 text-xl font-extrabold">
                        {latestToday
                          ? formatDuration(latestToday.timeTakenSeconds)
                          : '—'}
                      </dd>
                    </div>
                  </dl>
                  <div className="dashboard-today-footer">
                    <span
                      className={
                        latestToday
                          ? safeZone
                            ? 'dashboard-badge is-success'
                            : 'dashboard-badge is-warning'
                          : 'dashboard-badge'
                      }
                    >
                      {latestToday ? (
                        safeZone ? (
                          <CheckCircle2 size={13} />
                        ) : (
                          <TrendingUp size={13} />
                        )
                      ) : (
                        <Clock3 size={13} />
                      )}
                      {latestToday
                        ? safeZone
                          ? t('Safe Zone', 'सुरक्षित स्तर')
                          : t('Needs Improvement', 'सुधार की ज़रूरत')
                        : t('No tests today', 'आज कोई टेस्ट नहीं')}
                    </span>
                    <span className="dashboard-muted text-xs">
                      {t("Today's total", 'आज का कुल स्कोर')}:{' '}
                      <b>
                        {totalToday.earned} / {totalToday.possible}
                      </b>
                    </span>
                  </div>
                </section>
              </div>
              <div className="grid gap-5 xl:grid-cols-3">
                <section className="glass-card flex flex-col p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold">
                      {t('Score Trend', 'अंकों की प्रगति')}
                    </h2>
                    <TrendingUp size={18} className="dashboard-accent" />
                  </div>
                  <p className="dashboard-muted mt-1 text-xs">
                    {t(
                      'Your last 15 attempts · out of 100',
                      'पिछले 15 प्रयास · 100 में से',
                    )}
                  </p>
                  <div
                    className="mt-4 h-40 min-w-0"
                    aria-label={t(
                      'Chronological score chart',
                      'समय के अनुसार स्कोर का चार्ट',
                    )}
                  >
                    {trendData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={trendData}
                          margin={{ top: 8, left: -25, right: 8, bottom: 0 }}
                        >
                          <CartesianGrid
                            vertical={false}
                            stroke="var(--dash-border)"
                            strokeDasharray="3 5"
                          />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 10, fill: 'var(--dash-muted)' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 10, fill: 'var(--dash-muted)' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              background: 'var(--dash-solid)',
                              color: 'var(--dash-text)',
                              border: '1px solid var(--dash-border)',
                              borderRadius: 12,
                            }}
                            formatter={(value) => [
                              `${Number(value).toFixed(1)} / 100`,
                              t('Score', 'स्कोर'),
                            ]}
                          />
                          <Line
                            type="monotone"
                            dataKey="score"
                            stroke="var(--dash-accent)"
                            strokeWidth={3}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="dashboard-chart-empty">
                        <TrendingUp size={28} />
                        <p>
                          {t(
                            'Complete your first test to see your trend.',
                            'पहला टेस्ट पूरा करने पर यहाँ प्रगति दिखेगी।',
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
                <section className="glass-card flex flex-col p-5">
                  <span className="dashboard-card-icon mb-4">
                    <Shuffle size={22} />
                  </span>
                  <h2 className="text-base font-bold">
                    {t('Surprise Mix-Paper', 'मिश्रित मॉक टेस्ट')}
                  </h2>
                  <p className="dashboard-muted mt-2 text-xs leading-5">
                    {t(
                      'A fresh challenge, mixed from your question bank.',
                      'आपके सवालों से हर बार एक नया मॉक टेस्ट।',
                    )}
                  </p>
                  <p className="dashboard-muted mb-4 mt-2 text-[11px]">
                    70 {t('Questions', 'सवाल')} · 100 {t('Marks', 'अंक')} · 60{' '}
                    {t('Min', 'मिनट')}
                  </p>
                  <button
                    type="button"
                    className="dashboard-primary mt-auto w-full"
                    disabled={Boolean(profileDraft) || !canGenerateSurprise}
                    onClick={launchSurpriseMix}
                  >
                    <Shuffle size={15} />
                    {t('Generate Surprise Mock', 'मिश्रित मॉक टेस्ट बनाएँ')}
                  </button>
                  {!canGenerateSurprise && (
                    <p className="dashboard-muted mt-2 text-xs">
                      {t(
                        'Import enough unique questions in all six subjects to generate a full mock.',
                        'पूरा मॉक बनाने के लिए सभी छह विषयों में पर्याप्त अलग सवाल इम्पोर्ट करें।',
                      )}
                    </p>
                  )}
                </section>
                <section className="glass-card flex flex-col p-5">
                  <span className="dashboard-card-icon mb-4">
                    <BookOpen size={22} />
                  </span>
                  <h2 className="text-base font-bold">
                    {t('Subject-Wise Mini Tests', 'विषयवार छोटे टेस्ट')}
                  </h2>
                  <p className="dashboard-muted mb-4 mt-2 text-xs">
                    {t(
                      'Build confidence, one subject at a time.',
                      'एक-एक विषय में अपनी तैयारी बेहतर करें।',
                    )}{' '}
                    50 {t('questions · 50 minutes', 'सवाल · 50 मिनट')}
                  </p>
                  <label className="sr-only" htmlFor="mini-subject">
                    {t('Choose a subject', 'विषय चुनें')}
                  </label>
                  <select
                    id="mini-subject"
                    value={miniSubject}
                    onChange={(event) =>
                      setMiniSubject(event.target.value as Subject)
                    }
                    className="dashboard-select mb-3"
                  >
                    {SUBJECTS.map((subject) => (
                      <option key={subject} value={subject}>
                        {subjectLabel(subject)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="dashboard-primary mt-auto w-full"
                    disabled={Boolean(profileDraft)}
                    onClick={() => launchSubjectTest(miniSubject)}
                  >
                    <Play size={15} />
                    {t('Start Mini Test', 'विषय का टेस्ट शुरू करें')}
                  </button>
                </section>
              </div>

              {weakSubjects.length > 0 && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-rose-900">
                    <AlertTriangle className="h-4 w-4" />{' '}
                    {t(
                      'Focus Area Alerts (Below 60% in Last 5 Attempts)',
                      'कमज़ोर विषय (पिछले 5 टेस्ट में 60% से कम)',
                    )}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {weakSubjects.map((w) => (
                      <button
                        key={w.subject}
                        type="button"
                        disabled={Boolean(profileDraft)}
                        onClick={() => launchSubjectTest(w.subject)}
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                      >
                        <span>
                          {subjectLabel(w.subject)} · {w.accuracy}%
                        </span>
                        <span className="rounded bg-rose-700 px-1.5 py-0.5 text-[10px] text-white">
                          {t('Practice Now', 'अभी अभ्यास करें')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="dashboard-kicker">
                    {t('Ready when you are', 'आपकी अगली परीक्षा')}
                  </p>
                  <h2 className="mt-2 text-xl font-extrabold">
                    {t('Available Mock Papers', 'उपलब्ध मॉक पेपर')}
                  </h2>
                </div>
                <span className="dashboard-badge">
                  {papers.length} {t('papers', 'पेपर')}
                </span>
              </div>
              {papers.length === 0 && (
                <div className="glass-card p-6">
                  <h3 className="font-bold">
                    {t(
                      'Your question bank starts here',
                      'यहाँ से सवालों का संग्रह बनाएँ',
                    )}
                  </h3>
                  <p className="dashboard-muted mt-2 text-sm">
                    {t(
                      'Open Settings & Backup to import your first paper.',
                      'पहला पेपर इम्पोर्ट करने के लिए सेटिंग और बैकअप खोलें।',
                    )}
                  </p>
                </div>
              )}
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {papers.map((paper) => {
                  const latest = latestByPaper.get(paper.paperId);
                  return (
                    <div
                      key={paper.paperId}
                      className="glass-card flex flex-col justify-between p-5"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="dashboard-paper-category">
                            {paper.category ?? 'Full Mock'}
                          </span>
                          {latest ? (
                            <span className="dashboard-badge is-success">
                              <CheckCircle2 className="h-3 w-3" />{' '}
                              {t('Completed', 'पूरा')} ·{' '}
                              {scoreOutOf100(latest).toFixed(1)}/100
                            </span>
                          ) : (
                            <span className="dashboard-badge">
                              <Clock3 className="h-3 w-3" />{' '}
                              {t('Pending', 'बाकी')}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-3 text-base font-bold text-slate-900">
                          {paper.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {paper.questions.length} {t('questions', 'सवाल')} ·{' '}
                          {paper.durationMinutes} {t('minutes', 'मिनट')}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={Boolean(profileDraft)}
                        onClick={() => onStart(paper.paperId)}
                        className="dashboard-primary mt-5 w-full"
                      >
                        <Play className="h-3.5 w-3.5" />{' '}
                        {latest
                          ? t('Retake Exam', 'फिर से परीक्षा दें')
                          : t('Start Exam', 'परीक्षा शुरू करें')}
                        <ArrowUpRight size={14} className="ml-auto" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === 'history' && (
            <div className="space-y-6">
              <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                <label className="text-sm font-semibold text-slate-700">
                  {t('Score date', 'स्कोर की तारीख')}
                  <input
                    type="date"
                    className="ml-2 rounded-lg border px-2 py-1"
                    value={historyDay}
                    max={today}
                    onChange={(event) =>
                      setHistoryDay(event.target.value || today)
                    }
                  />
                </label>
                <p className="text-sm text-slate-700">
                  {selectedDayTotal.count} {t('completed papers', 'पेपर पूरे')} ·{' '}
                  {t('Total score', 'कुल स्कोर')}{' '}
                  <strong>
                    {selectedDayTotal.earned} / {selectedDayTotal.possible}
                  </strong>
                </p>
              </section>
              {trendData.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
                    <TrendingUp className="h-5 w-5 text-blue-700" />{' '}
                    {t('Score trend', 'अंकों की प्रगति')} ({userName})
                  </h2>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#1d4ed8"
                          strokeWidth={2.5}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-base font-bold text-slate-900">
                  {t('Past Attempts', 'पिछले टेस्ट')}
                </h2>
                {userAttempts.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    {t('No completed attempts yet.', 'अभी कोई टेस्ट पूरा नहीं हुआ।')}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {userAttempts.map((a) => (
                      <div
                        key={a.attemptId}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {a.paperTitle}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(a.timestamp).toLocaleString()} · Time:{' '}
                            {formatDuration(a.timeTakenSeconds)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="rounded-lg bg-blue-50 px-3 py-1 text-sm font-extrabold text-blue-900">
                            {a.totalScore} / {a.maxScore}
                          </span>
                          <button
                            type="button"
                            onClick={() => onOpenAttempt(a)}
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            {t('View Scorecard', 'रिज़ल्ट देखें')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'bookmarks' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-bold text-slate-900">
                {t('Bookmarked questions', 'बुकमार्क किए सवाल')} ({userName})
              </h2>
              {profileBookmarks.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {t(
                    'No bookmarked questions yet. Star any question inside Paper Review.',
                    'अभी कोई सवाल बुकमार्क नहीं है। पेपर की समीक्षा से सवाल बुकमार्क करें।',
                  )}
                </p>
              ) : (
                <div className="space-y-4">
                  {profileBookmarks.map((b) => (
                    <div
                      key={b.key}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                            {subjectLabel(b.question.subject)} · {b.paperTitle}
                          </span>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {b.question.question_en}
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            {b.question.question_hi}
                          </p>
                          <p className="mt-2 text-xs font-bold text-emerald-700">
                            {t('Correct answer', 'सही जवाब')} · (
                            {String.fromCharCode(65 + b.question.correctIndex)}){' '}
                            {b.question.options_en[b.question.correctIndex]}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setBookmarks(
                              toggleBookmark(
                                userId,
                                b.paperId,
                                b.paperTitle,
                                b.question,
                              ),
                            )
                          }
                          className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {t('Remove', 'हटाएँ')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'compare' && (
            <div className="glass-card p-6">
              <ComparisonView
                attempts={userAttempts}
                papers={papers}
                userId={userId}
                userName={userName}
              />
            </div>
          )}

          {tab === 'typing' && (
            <TypingPractice userId={userId} userName={userName} />
          )}

          {tab === 'mistakes' && (
            <MistakeBank
              userId={userId}
              attempts={userAttempts}
              papers={papers}
              onPractice={onStartVirtualPaper}
              disabled={Boolean(profileDraft)}
            />
          )}

          {tab === 'settings' && (
            <div className="space-y-6">
              <UpdateManager />
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900">
                  {t('Profile extras backup', 'प्रोफ़ाइल का बैकअप')} ({userName})
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {t(
                    'Export or restore your bookmarks, typing history, and eye-comfort theme preference as JSON.',
                    'बुकमार्क, टाइपिंग इतिहास और थीम का JSON बैकअप लें या वापस लाएँ।',
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleExportExtras}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <Download className="h-4 w-4" />{' '}
                    {t('Export Extras (.json)', 'बैकअप निकालें (.json)')}
                  </button>
                  <button
                    type="button"
                    onClick={() => extrasInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Upload className="h-4 w-4" />{' '}
                    {t('Import Extras (.json)', 'बैकअप लाएँ (.json)')}
                  </button>
                  <input
                    ref={extrasInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => handleImportExtras(e.target.files?.[0])}
                  />
                </div>
                {extrasMsg && (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    {extrasMsg}
                  </p>
                )}
              </div>
              <AdminPanel {...admin} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
