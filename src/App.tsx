import { useEffect, useMemo, useState } from 'react';
import Dashboard from './components/Dashboard';
import ExamScreen from './components/ExamScreen';
import InstructionsModal from './components/InstructionsModal';
import PaperReview from './components/PaperReview';
import ProfileSelector from './components/ProfileSelector';
import Scorecard from './components/Scorecard';
import samplePaper from './data/sample_paper_01.json';
import { Attempt, ExamConfig, Paper, ProfileRecord, QuestionResponse, StoredState, UserId } from './types/exam';
import { calculateScore } from './utils/scoring';
import { checkAdminPin, checkPin, createProfile, exportBackup, importBackup, loadState, persistAttempt, persistPapers, removePapers, removeProfile, resetStoredAttempts, saveAdminExport, updateAdminPin, updatePin } from './services/storage';

type View = 'profiles' | 'dashboard' | 'instructions' | 'exam' | 'scorecard' | 'review';
const builtInPaper = samplePaper as unknown as Paper;

export default function App() {
  const [state, setState] = useState<StoredState | null>(null);
  const [loadError, setLoadError] = useState('');
  const [userId, setUserId] = useState<UserId | null>(null);
  const [view, setView] = useState<View>('profiles');
  const [paper, setPaper] = useState<Paper | null>(null);
  const [config, setConfig] = useState<ExamConfig | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const papers = useMemo(() => [builtInPaper, ...(state?.papers ?? []).filter((item) => item.paperId !== builtInPaper.paperId)], [state?.papers]);
  const profile = state?.profiles.find((item) => item.id === userId);

  useEffect(() => { void loadState().then(setState).catch((error: unknown) => setLoadError(error instanceof Error ? error.message : 'Could not open local storage.')); }, []);
  const refresh = async () => setState(await loadState());
  const login = async (id: UserId, pin?: string) => { const record = state?.profiles.find((item) => item.id === id); if (record?.pinConfigured && (!pin || !(await checkPin(id, pin)))) return false; setUserId(id); setView('dashboard'); return true; };
  const setPin = async (id: UserId, pin: string | null, currentPin?: string) => { const record = state?.profiles.find((item) => item.id === id); if (record?.pinConfigured && (!currentPin || !(await checkPin(id, currentPin)))) return false; await updatePin(id, pin); await refresh(); return true; };
  const selectPaper = (selected: Paper) => { setPaper(selected); setAttempt(null); setView('instructions'); };
  const startExam = (selectedConfig: ExamConfig) => { setConfig(selectedConfig); setView('exam'); };
  const submitExam = async (responses: Record<string, QuestionResponse>, timeTakenSeconds: number, submittedByTimer: boolean) => {
    if (!paper || !config || !userId) return;
    const result = calculateScore(paper, responses, config.negativeMarking);
    const created: Attempt = { attemptId: `att_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`, userId, paperId: paper.paperId, paperTitle: paper.title, timestamp: new Date().toISOString(), timeTakenSeconds, totalScore: result.score, maxScore: result.maxScore, negativeMarking: config.negativeMarking, responses, submittedByTimer };
    if (!paper.paperId.startsWith('mistakes-')) { await persistAttempt(created); setState((previous) => previous ? { ...previous, attempts: [created, ...previous.attempts] } : previous); }
    setAttempt(created); setView('scorecard');
  };
  const openAttempt = (selected: Attempt) => { const selectedPaper = papers.find((item) => item.paperId === selected.paperId); if (!selectedPaper) return; setPaper(selectedPaper); setAttempt(selected); setView('scorecard'); };
  const importPapers = async (newPapers: Paper[], adminPin: string) => { const count = await persistPapers(newPapers, adminPin); const unique = Array.from(new Map(newPapers.map((item) => [item.paperId, item])).values()); setState((previous) => previous ? { ...previous, papers: [...unique, ...previous.papers.filter((item) => !new Set(unique.map((paperItem) => paperItem.paperId)).has(item.paperId))] } : previous); return count; };
  const deletePapers = async (ids: string[], adminPin: string) => { const count = await removePapers(ids, adminPin); const selected = new Set(ids); setState((previous) => previous ? { ...previous, papers: previous.papers.filter((item) => !selected.has(item.paperId)) } : previous); return count; };
  const resetResults = async (target: UserId | 'all', adminPin: string) => { const count = await resetStoredAttempts(target, adminPin); setState((previous) => previous ? { ...previous, attempts: target === 'all' ? [] : previous.attempts.filter((item) => item.userId !== target) } : previous); return count; };
  const addStudent = async (name: string, adminPin: string) => { const created = await createProfile(name, adminPin); setState((previous) => previous ? { ...previous, profiles: [...previous.profiles, created] } : previous); return created; };
  const deleteStudent = async (id: UserId, adminPin: string) => { const count = await removeProfile(id, adminPin); setState((previous) => previous ? { ...previous, profiles: previous.profiles.filter((item) => item.id !== id), attempts: previous.attempts.filter((item) => item.userId !== id) } : previous); return count; };
  const restore = async (adminPin: string) => { const restored = await importBackup(adminPin); if (!restored) return false; setState(restored); if (userId && !restored.profiles.some((item) => item.id === userId)) { setUserId(null); setView('profiles'); } return true; };
  const dashboard = () => { setPaper(null); setAttempt(null); setConfig(null); setView('dashboard'); };

  if (loadError) return <div className="flex min-h-screen items-center justify-center bg-red-50 p-8"><div className="card max-w-lg p-8 text-center"><h1 className="text-2xl font-bold text-red-800">Local storage could not be opened</h1><p className="mt-3 text-red-700">{loadError}</p><button className="btn-primary mt-6" onClick={() => window.location.reload()}>Try again</button></div></div>;
  if (!state) return <div className="flex min-h-screen items-center justify-center bg-canvas"><div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-navy" /></div>;
  if (view === 'profiles' || !userId || !profile) return <ProfileSelector profiles={state.profiles as ProfileRecord[]} onLogin={login} onSetPin={setPin} />;
  if (view === 'dashboard') return <Dashboard userId={userId} userName={profile.name} profiles={state.profiles} attempts={state.attempts} papers={papers} onStart={selectPaper} onOpenAttempt={openAttempt} onVerifyAdminPin={checkAdminPin} onChangeAdminPin={updateAdminPin} onImportPapers={importPapers} onDeletePapers={deletePapers} onResetResults={resetResults} onAddProfile={addStudent} onDeleteProfile={deleteStudent} onExportBackup={exportBackup} onImportBackup={restore} onSaveExport={saveAdminExport} onLogout={() => { setUserId(null); setView('profiles'); }} />;
  if (view === 'instructions' && paper) return <InstructionsModal paper={paper} onBack={dashboard} onStart={startExam} />;
  if (view === 'exam' && paper && config) return <ExamScreen userId={userId} userName={profile.name} paper={paper} config={config} onSubmit={(responses, time, byTimer) => void submitExam(responses, time, byTimer)} />;
  if (view === 'scorecard' && paper && attempt) return <Scorecard attempt={attempt} paper={paper} onReview={() => setView('review')} onDashboard={dashboard} />;
  if (view === 'review' && paper && attempt) return <PaperReview attempt={attempt} paper={paper} onBack={() => setView('scorecard')} />;
  return null;
}
