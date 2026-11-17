import { useMemo, useRef, useState } from 'react';
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
  Moon,
  Play,
  Settings,
  Shuffle,
  Sparkles,
  Sun,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Attempt,
  DraftExamState,
  Paper,
  ProfileRecord,
  Question,
  SUBJECTS,
  Subject,
  ThemeMode,
  UserId,
} from '../types/exam';
import { formatDuration, resultForAttempt } from '../utils/scoring';
import {
  clearExamDraft,
  exportUserExtrasJson,
  getBookmarks,
  importUserExtrasJson,
  loadExamDraft,
  toggleBookmark,
} from '../services/userExtras';
import AdminPanel from './AdminPanel';
import ComparisonView from './ComparisonView';
import Importer from './Importer';
import MistakeBank from './MistakeBank';
import TypingPractice from './TypingPractice';
import UpdateManager from './UpdateManager';

interface Props {
  userId: UserId;
  userName: string;
  profiles: ProfileRecord[];
  attempts: Attempt[];
  papers: Paper[];
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onStart: (paperId: string) => void;
  onStartVirtualPaper: (paper: Paper) => void;
  onResumeDraft: (draft: DraftExamState) => void;
  onOpenAttempt: (attempt: Attempt) => void;
  onLogout: () => void;
  onVerifyAdminPin: (pin: string) => Promise<boolean>;
  onChangeAdminPin: (oldPin: string, newPin: string) => Promise<boolean>;
  onImportPapers: (papers: Paper[]) => Promise<void>;
  onDeletePapers: (paperIds: string[]) => Promise<void>;
  onResetResults: (targetUserId?: string) => Promise<void>;
  onAddProfile: (name: string, pin: string) => Promise<ProfileRecord>;
  onDeleteProfile: (id: string) => Promise<void>;
  onExportBackup: () => Promise<string>;
  onImportBackup: (json: string) => Promise<void>;
  onSaveExport: (data: Uint8Array, defaultName: string) => Promise<void>;
}

type Tab = 'papers' | 'history' | 'bookmarks' | 'typing' | 'mistakes' | 'compare' | 'settings';

const SURPRISE_QUOTA: Record<Subject, { count: number; marks: number }> = {
  'Rajasthan GK': { count: 23, marks: 2 },
  'World, India & Everyday Science': { count: 7, marks: 2 },
  'Reasoning & Mental Ability': { count: 10, marks: 1 },
  'Hindi General': { count: 10, marks: 1 },
  'English General': { count: 10, marks: 1 },
  'Mathematics': { count: 10, marks: 1 },
};

function computeDailyStreak(userAttempts: Attempt[]): number {
  if (userAttempts.length === 0) return 0;
  const daySet = new Set(userAttempts.map((a) => new Date(a.timestamp).toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  const todayStr = cursor.toISOString().slice(0, 10);
  if (!daySet.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function Dashboard({
  userId,
  userName,
  profiles,
  attempts,
  papers,
  theme,
  onThemeChange,
  onStart,
  onStartVirtualPaper,
  onResumeDraft,
  onOpenAttempt,
  onLogout,
  onVerifyAdminPin,
  onChangeAdminPin,
  onImportPapers,
  onDeletePapers,
  onResetResults,
  onAddProfile,
  onDeleteProfile,
  onExportBackup,
  onImportBackup,
  onSaveExport,
}: Props) {
  const [tab, setTab] = useState<Tab>('papers');
  const [draft, setDraft] = useState<DraftExamState | null>(() => loadExamDraft(userId));
  const [bookmarks, setBookmarks] = useState(() => getBookmarks(userId));
  const [miniSubject, setMiniSubject] = useState<Subject>('Rajasthan GK');
  const [extrasMsg, setExtrasMsg] = useState<string | null>(null);
  const extrasInputRef = useRef<HTMLInputElement>(null);

  const userAttempts = useMemo(
    () => attempts.filter((a) => a.userId === userId).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [attempts, userId]
  );

  const paperMap = useMemo(() => new Map(papers.map((p) => [p.paperId, p])), [papers]);

  const latestByPaper = useMemo(() => {
    const map = new Map<string, Attempt>();
    for (const a of userAttempts) {
      if (!map.has(a.paperId)) map.set(a.paperId, a);
    }
    return map;
  }, [userAttempts]);

  const streakDays = useMemo(() => computeDailyStreak(userAttempts), [userAttempts]);

  const trendData = useMemo(() => {
    return [...userAttempts]
      .reverse()
      .slice(-15)
      .map((a, idx) => ({
        label: `#${idx + 1}`,
        score: a.totalScore,
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
        cur.total += sr.total;
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
    const seenText = new Set<string>();
    for (const p of papers) {
      for (const q of p.questions) {
        const key = `${q.subject}::${q.question_en.trim()}`;
        if (seenText.has(key)) continue;
        seenText.add(key);
        pool.get(q.subject)?.push(q);
      }
    }
    return pool;
  }, [papers]);

  const launchSurpriseMix = () => {
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

  const launchSubjectMiniTest = (subject: Subject) => {
    const quota = SURPRISE_QUOTA[subject];
    const available = [...(questionPoolBySubject.get(subject) ?? [])];
    for (let i = available.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    const picked = available.slice(0, quota.count).map((q, idx) => ({ ...q, id: idx + 1, marks: quota.marks }));
    if (picked.length === 0) return;
    const durationMinutes = Math.max(10, Math.round(picked.length * 1.1));
    const miniPaper: Paper = {
      paperId: `mini_${subject.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()}`,
      title: `${subject} Mini Test (${picked.length} Qs)`,
      durationMinutes,
      questions: picked,
      category: 'Subject Practice',
      difficulty: 'Medium',
    };
    onStartVirtualPaper(miniPaper);
  };

  const handleExportExtras = async () => {
    const json = exportUserExtrasJson(userId);
    await onSaveExport(new TextEncoder().encode(json), `${userName}_v2_extras_backup.json`);
    setExtrasMsg('Exported bookmarks, typing history, and theme backup.');
  };

  const handleImportExtras = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      importUserExtrasJson(userId, text);
      setBookmarks(getBookmarks(userId));
      setExtrasMsg('Restored bookmarks and typing history successfully.');
    } catch {
      setExtrasMsg('Invalid backup JSON file.');
    }
  };

  const navItems: Array<{ id: Tab; label: string; icon: typeof BookOpen }> = [
    { id: 'papers', label: `Mock Papers (${papers.length})`, icon: BookOpen },
    { id: 'history', label: `History (${userAttempts.length})`, icon: BarChart3 },
    { id: 'bookmarks', label: `Bookmarks (${bookmarks.length})`, icon: Bookmark },
    { id: 'typing', label: 'Typing (Phase-II)', icon: Keyboard },
    { id: 'mistakes', label: 'Mistake Bank', icon: Award },
    { id: 'compare', label: 'Compare', icon: Users },
    { id: 'settings', label: 'Settings & Backup', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">RVUNL Junior Assistant CBT</h1>
            <p className="text-xs text-slate-500">
              Candidate: <span className="font-bold text-blue-800">{userName}</span> · Phase-I OMNIBUS &amp; Phase-II Typing
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
              <Flame className="h-4 w-4 text-amber-600" />
              Daily Streak: {streakDays} {streakDays === 1 ? 'Day' : 'Days'}
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
              {(['light', 'dark', 'warm'] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onThemeChange(mode)}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 capitalize ${
                    theme === mode ? 'bg-blue-700 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode === 'light' && <Sun className="h-3.5 w-3.5" />}
                  {mode === 'dark' && <Moon className="h-3.5 w-3.5" />}
                  {mode === 'warm' && <Sparkles className="h-3.5 w-3.5" />}
                  {mode}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-3.5 w-3.5" /> Switch Profile
            </button>
          </div>
        </div>

        <div className="mx-auto mt-4 flex max-w-7xl flex-wrap gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                  tab === item.id ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {item.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-6">
        {draft && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase text-amber-800">Interrupted Exam Found</p>
              <p className="text-sm font-bold text-slate-900">
                {draft.paper.title} · {formatDuration(draft.remainingSeconds)} remaining
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
                Discard
              </button>
              <button
                type="button"
                onClick={() => onResumeDraft(draft)}
                className="rounded-lg bg-amber-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
              >
                Resume Interrupted Exam
              </button>
            </div>
          </div>
        )}

        {tab === 'papers' && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                      <Shuffle className="h-5 w-5 text-blue-700" />
                      Surprise Mix-Paper Generator
                    </h2>
                    <p className="mt-1 text-xs text-slate-600">
                      Builds a fresh 70-question, 100-mark OMNIBUS exam by sampling across all {papers.length} papers.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={launchSurpriseMix}
                    className="shrink-0 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                  >
                    Generate Surprise Mock
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-bold text-slate-900">Subject-Wise Mini Tests</h2>
                <p className="mt-1 text-xs text-slate-600">Practice a single subject under timed conditions.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <select
                    value={miniSubject}
                    onChange={(e) => setMiniSubject(e.target.value as Subject)}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s} ({SURPRISE_QUOTA[s].count} Qs)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => launchSubjectMiniTest(miniSubject)}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Start Mini Test
                  </button>
                </div>
              </div>
            </div>

            {weakSubjects.length > 0 && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                <h3 className="flex items-center gap-2 text-sm font-bold text-rose-900">
                  <AlertTriangle className="h-4 w-4" /> Focus Area Alerts (Below 60% in Last 5 Attempts)
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {weakSubjects.map((w) => (
                    <button
                      key={w.subject}
                      type="button"
                      onClick={() => launchSubjectMiniTest(w.subject)}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                    >
                      <span>{w.subject}: {w.accuracy}%</span>
                      <span className="rounded bg-rose-700 px-1.5 py-0.5 text-[10px] text-white">Practice Now</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Importer
              onImport={onImportPapers}
              onDownloadTemplate={(data) => onSaveExport(data, 'rvunl_paper_template.csv')}
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {papers.map((paper) => {
                const latest = latestByPaper.get(paper.paperId);
                return (
                  <div key={paper.paperId} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                          {paper.category ?? 'Full Mock'}
                        </span>
                        {latest ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" /> Completed · {latest.totalScore}/{latest.maxScore}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">
                            <Clock3 className="h-3 w-3" /> Pending
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 text-base font-bold text-slate-900">{paper.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {paper.questions.length} Questions · {paper.durationMinutes} Minutes
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onStart(paper.paperId)}
                      className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-800"
                    >
                      <Play className="h-3.5 w-3.5" /> Start Exam
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === 'history' && (
          <div className="space-y-6">
            {trendData.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
                  <TrendingUp className="h-5 w-5 text-blue-700" /> Score Trend ({userName})
                </h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="#1d4ed8" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-bold text-slate-900">Past Attempts</h2>
              {userAttempts.length === 0 ? (
                <p className="text-sm text-slate-500">No completed attempts yet.</p>
              ) : (
                <div className="space-y-2">
                  {userAttempts.map((a) => (
                    <div key={a.attemptId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{a.paperTitle}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(a.timestamp).toLocaleString()} · Time: {formatDuration(a.timeTakenSeconds)}
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
                          View Scorecard
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
            <h2 className="mb-4 text-base font-bold text-slate-900">Bookmarked Questions ({userName})</h2>
            {bookmarks.length === 0 ? (
              <p className="text-sm text-slate-500">No bookmarked questions yet. Star any question inside Paper Review.</p>
            ) : (
              <div className="space-y-4">
                {bookmarks.map((b) => (
                  <div key={b.key} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                          {b.question.subject} · {b.paperTitle}
                        </span>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{b.question.question_en}</p>
                        <p className="mt-1 text-xs text-slate-600">{b.question.question_hi}</p>
                        <p className="mt-2 text-xs font-bold text-emerald-700">
                          Correct Answer: ({String.fromCharCode(65 + b.question.correctIndex)}) {b.question.options_en[b.question.correctIndex]}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBookmarks(toggleBookmark(userId, b.paperId, b.paperTitle, b.question))}
                        className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'typing' && <TypingPractice userId={userId} userName={userName} />}

        {tab === 'mistakes' && <MistakeBank attempts={userAttempts} papers={papers} />}

        {tab === 'compare' && <ComparisonView profiles={profiles} attempts={attempts} papers={papers} />}

        {tab === 'settings' && (
          <div className="space-y-6">
            <UpdateManager />
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">Profile Extras Backup ({userName})</h3>
              <p className="mt-1 text-xs text-slate-500">
                Export or restore your bookmarks, typing history, and eye-comfort theme preference as JSON.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleExportExtras}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Download className="h-4 w-4" /> Export Extras (.json)
                </button>
                <button
                  type="button"
                  onClick={() => extrasInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Upload className="h-4 w-4" /> Import Extras (.json)
                </button>
                <input
                  ref={extrasInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => handleImportExtras(e.target.files?.[0])}
                />
              </div>
              {extrasMsg && <p className="mt-2 text-xs font-semibold text-emerald-700">{extrasMsg}</p>}
            </div>
            <AdminPanel
              profiles={profiles}
              papers={papers}
              onVerifyPin={onVerifyAdminPin}
              onChangePin={onChangeAdminPin}
              onDeletePapers={onDeletePapers}
              onResetResults={onResetResults}
              onAddProfile={onAddProfile}
              onDeleteProfile={onDeleteProfile}
              onExportBackup={onExportBackup}
              onImportBackup={onImportBackup}
            />
          </div>
        )}
      </main>
    </div>
  );
}
