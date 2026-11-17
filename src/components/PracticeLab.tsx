import { FormEvent, useMemo, useState } from 'react';
import { Attempt, DIFFICULTIES, Difficulty, Paper, SUBJECTS } from '../types/exam';
import { bankQuestions, BankQuestion, normalizeSearch, questionTopic, shuffled, syllabusTopics, topicKey } from '../utils/questionBank';
import { useSubjectLabel, useTranslation } from '../uiLanguage';

interface TestRow { topic: string; count: number }
interface Preset { name: string; rows: TestRow[]; minutes: number; difficulty: Difficulty | '' }
interface Goal { count: number; accuracy: number; since: string }
interface PracticeState { checked: string[]; goals: Record<string, Goal>; presets: Preset[] }

const inputClass = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';
const buttonClass = 'rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40';
const sectionClass = 'space-y-4 rounded-2xl border border-slate-200 bg-white p-5';

export default function PracticeLab({ userId, papers, attempts, onStart }: {
  userId: string; papers: Paper[]; attempts: Attempt[]; onStart: (paper: Paper) => void;
}) {
  const t = useTranslation();
  const subjectLabel = useSubjectLabel();
  const storageKey = `rvunl-practice-v1-${userId}`;
  const [saved, setSaved] = useState<PracticeState>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? 'null') ?? { checked: [], goals: {}, presets: [] }; }
    catch { return { checked: [], goals: {}, presets: [] }; }
  });
  const questions = useMemo(() => bankQuestions(papers), [papers]);
  const topics = useMemo(() => syllabusTopics(papers), [papers]);
  const [subject, setSubject] = useState('Mathematics');
  const [query, setQuery] = useState('');
  const [rowTopic, setRowTopic] = useState('');
  const [count, setCount] = useState(10);
  const [rows, setRows] = useState<TestRow[]>([]);
  const [minutes, setMinutes] = useState(15);
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [name, setName] = useState('');
  const [goalCount, setGoalCount] = useState(30);
  const [goalAccuracy, setGoalAccuracy] = useState(80);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [panel, setPanel] = useState<'build' | 'search' | 'syllabus'>('build');

  const save = (value: PracticeState) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
      setSaved(value);
    } catch {
      setStatus(t('Could not save practice settings.', 'अभ्यास सेटिंग सेव नहीं हुई।'));
    }
  };

  const groups = useMemo(() => {
    const result = new Map<string, BankQuestion[]>();
    for (const question of questions) {
      const key = topicKey(question.subject, question.topic);
      const group = result.get(key) ?? [];
      group.push(question);
      result.set(key, group);
    }
    return result;
  }, [questions]);

  const available = (key: string) => (groups.get(key) ?? []).filter((question) => !difficulty || question.difficulty === difficulty);
  const currentTopics = topics.filter((item) => item.subject === subject);
  const activeTopic = currentTopics.find((item) => topicKey(item.subject, item.topic) === rowTopic) ?? currentTopics[0];
  const activeKey = activeTopic ? topicKey(activeTopic.subject, activeTopic.topic) : '';

  const goalProgress = useMemo(() => {
    const result = new Map<string, { total: number; correct: number }>();
    const papersById = new Map(papers.map((paper) => [paper.paperId, paper]));
    for (const attempt of attempts) {
      if (attempt.userId !== userId) continue;
      const paper = attempt.sessionPaper ?? papersById.get(attempt.paperId);
      for (const question of paper?.questions ?? []) {
        const key = topicKey(question.subject, questionTopic(question));
        const goal = saved.goals[key];
        const response = attempt.responses[String(question.id)];
        if (!goal || attempt.timestamp < goal.since || response?.selectedIndex === undefined) continue;
        const progress = result.get(key) ?? { total: 0, correct: 0 };
        progress.total += 1;
        if (response.selectedIndex === question.correctIndex) progress.correct += 1;
        result.set(key, progress);
      }
    }
    return result;
  }, [attempts, papers, saved.goals, userId]);

  const start = (picked: BankQuestion[], title: string) => {
    if (!picked.length || !Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
      setStatus(t('Choose questions and set a time from 1 to 180 minutes.', 'सवाल चुनें और 1 से 180 मिनट का समय रखें।'));
      return;
    }
    onStart({
      paperId: crypto.randomUUID(), title, category: 'Subject Practice', durationMinutes: minutes,
      questions: picked.map(({ key: _key, ...question }, index) => ({ ...question, id: index + 1 })),
    });
  };

  const search = normalizeSearch(query);
  const results = questions.filter((q) => (!difficulty || q.difficulty === difficulty)
    && normalizeSearch([q.question_en, q.question_hi, q.topic, q.subject].join(' ')).includes(search));
  const picked = questions.filter((q) => selected.includes(q.key) && (!difficulty || q.difficulty === difficulty));
  const activeRows = rows.length ? rows : activeKey ? [{ topic: activeKey, count }] : [];
  const shortage = activeRows.some((row) => !Number.isInteger(row.count) || row.count < 1 || row.count > available(row.topic).length);
  const changePanel = (next: typeof panel) => { setPanel(next); setStatus(''); };
  const addRow = () => {
    if (!activeKey || !Number.isInteger(count) || count < 1) return;
    setRows([...rows.filter((row) => row.topic !== activeKey), { topic: activeKey, count }]);
  };
  const savePreset = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || shortage || !activeRows.length || !Number.isInteger(minutes) || minutes < 1 || minutes > 180) return;
    save({ ...saved, presets: [...saved.presets.filter((p) => p.name !== name.trim()), { name: name.trim(), rows: activeRows, minutes, difficulty }] });
    setName('');
  };
  const saveGoal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeKey) return;
    save({ ...saved, goals: { ...saved.goals, [activeKey]: { count: goalCount, accuracy: goalAccuracy, since: new Date().toISOString() } } });
  };

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2">
        {([
          ['build', t('Build a test', 'टेस्ट बनाएँ')],
          ['search', t('Search questions', 'सवाल खोजें')],
          ['syllabus', t('Syllabus & goals', 'सिलेबस और लक्ष्य')],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" aria-pressed={panel === id} className={panel === id ? buttonClass : inputClass} onClick={() => changePanel(id)}>{label}</button>
        ))}
      </nav>
      {status && <p role="status" className="text-sm font-semibold text-amber-800">{status}</p>}
      {panel !== 'syllabus' && <div className={sectionClass}>
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-sm">{t('Minutes', 'मिनट')}<input className={inputClass} type="number" min="1" max="180" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label>
          <label className="flex flex-col gap-1 text-sm">{t('Difficulty', 'कठिनाई')}<select className={inputClass} value={difficulty} onChange={(event) => { setDifficulty(event.target.value as Difficulty | ''); setPage(0); }}>
            <option value="">{t('Any', 'सभी')}</option>
            {DIFFICULTIES.map((value, index) => <option key={value} value={value}>{t(value, ['आसान', 'मध्यम', 'कठिन'][index])}</option>)}
          </select></label>
        </div>
      </div>}
      {panel !== 'search' && <div className={sectionClass}>
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-sm">{t('Subject', 'विषय')}<select className={inputClass} value={subject} onChange={(event) => { setSubject(event.target.value); setRowTopic(''); }}>
            {SUBJECTS.map((value) => <option key={value} value={value}>{subjectLabel(value)}</option>)}
          </select></label>
          <label className="flex flex-col gap-1 text-sm">{t('Topic', 'टॉपिक')}<select className={inputClass} value={activeKey} onChange={(event) => setRowTopic(event.target.value)}>
            {currentTopics.map((item) => <option key={item.topic} value={topicKey(item.subject, item.topic)}>{item.topic}</option>)}
          </select></label>
          {panel === 'build' && <>
            <label className="flex flex-col gap-1 text-sm">{t('Questions', 'सवाल')}<input className={inputClass} type="number" min="1" value={count} onChange={(event) => setCount(Number(event.target.value))} /></label>
            <button type="button" className={`${inputClass} self-end`} disabled={!activeKey || count < 1} onClick={addRow}>{t('Add topic', 'टॉपिक जोड़ें')}</button>
          </>}
        </div>
        {panel === 'build' ? <>
          <div className="space-y-2 text-sm">{activeRows.map((row) => {
            const topic = topics.find((item) => topicKey(item.subject, item.topic) === row.topic);
            const have = available(row.topic).length;
            return <div key={row.topic} className="flex flex-wrap items-center gap-3">
              <span>{topic?.topic ?? row.topic} · {t('Requested', 'चाहिए')} {row.count} · {t('Available', 'उपलब्ध')} {have}</span>
              {have < row.count && <strong className="text-amber-800">{row.count - have} {t('more needed', 'और चाहिए')}</strong>}
              {rows.length > 0 && <button className="text-blue-700 underline" onClick={() => setRows(rows.filter((item) => item.topic !== row.topic))}>{t('Remove', 'हटाएँ')}</button>}
            </div>;
          })}</div>
          <button type="button" className={buttonClass} disabled={shortage || !activeRows.length}
            onClick={() => start(activeRows.flatMap((row) => shuffled(available(row.topic)).slice(0, row.count)), t('Custom practice test', 'अपना अभ्यास टेस्ट'))}>
            {t('Start practice', 'अभ्यास शुरू करें')}
          </button>
          <form className="flex flex-wrap gap-2" onSubmit={savePreset}>
            <input className={inputClass} required maxLength={60} aria-label={t('Preset name', 'सेटिंग का नाम')} placeholder={t('Preset name', 'सेटिंग का नाम')} value={name} onChange={(event) => setName(event.target.value)} />
            <button className={inputClass} disabled={shortage || !activeRows.length}>{t('Save test settings', 'टेस्ट सेटिंग सेव करें')}</button>
          </form>
          {saved.presets.map((preset) => <div className="flex gap-3 text-sm" key={preset.name}>
            <span>{preset.name}</span>
            <button className="text-blue-700 underline" onClick={() => { setRows(preset.rows); setMinutes(preset.minutes); setDifficulty(preset.difficulty); }}>{t('Load', 'खोलें')}</button>
            <button className="text-blue-700 underline" onClick={() => save({ ...saved, presets: saved.presets.filter((item) => item.name !== preset.name) })}>{t('Delete', 'हटाएँ')}</button>
          </div>)}
        </> : <>
          <form className="flex flex-wrap items-end gap-3" onSubmit={saveGoal}>
            <label className="flex flex-col gap-1 text-sm">{t('Questions target', 'सवालों का लक्ष्य')}<input required min="1" max="5000" type="number" className={inputClass} value={goalCount} onChange={(event) => setGoalCount(Number(event.target.value))} /></label>
            <label className="flex flex-col gap-1 text-sm">{t('Accuracy target (%)', 'सही जवाब का लक्ष्य (%)')}<input required min="1" max="100" type="number" className={inputClass} value={goalAccuracy} onChange={(event) => setGoalAccuracy(Number(event.target.value))} /></label>
            <button className={buttonClass} disabled={!activeKey}>{t('Save goal', 'लक्ष्य सेव करें')}</button>
          </form>
          <ul className="divide-y divide-slate-100">
            {currentTopics.map(({ topic, subject: topicSubject }) => {
              const key = topicKey(topicSubject, topic);
              const goal = saved.goals[key];
              const progress = goalProgress.get(key) ?? { total: 0, correct: 0 };
              const accuracy = progress.total ? Math.round(progress.correct / progress.total * 100) : 0;
              return <li key={key} className="space-y-1 py-3 text-sm">
                <label className="flex gap-2"><input type="checkbox" checked={saved.checked.includes(key)} onChange={(event) => save({
                  ...saved, checked: event.target.checked ? [...saved.checked, key] : saved.checked.filter((item) => item !== key),
                })} />{topic}</label>
                <p className="pl-5 text-slate-600">{groups.get(key)?.length ?? 0} {t('questions available', 'सवाल उपलब्ध')}</p>
                {goal && <p className="pl-5 text-slate-700">{t('Goal', 'लक्ष्य')} · {progress.total}/{goal.count} · {accuracy}%/{goal.accuracy}% {progress.total >= goal.count && accuracy >= goal.accuracy && t('· Completed', '· पूरा हुआ')}</p>}
              </li>;
            })}
          </ul>
        </>}
      </div>}
      {panel === 'search' && <div className={sectionClass}>
        <label className="block text-sm">{t('Search in Hindi or English', 'हिंदी या अंग्रेज़ी में खोजें')}
          <input className={`${inputClass} mt-1 block w-full`} type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm">{results.length} {t('matches', 'मिले')} · {picked.length} {t('selected', 'चुने')}</p>
          <button type="button" className={buttonClass} disabled={!picked.length} onClick={() => start(picked, t('Selected questions', 'चुने हुए सवाल'))}>{t('Start selected test', 'चुने सवालों का टेस्ट')}</button>
          {picked.length > 0 && <button className={inputClass} onClick={() => setSelected([])}>{t('Clear selection', 'चुनाव हटाएँ')}</button>}
        </div>
        <ul className="divide-y divide-slate-100">
          {results.slice(page * 20, (page + 1) * 20).map((question) => (
            <li key={question.key} className="py-3">
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" checked={selected.includes(question.key)} onChange={(event) => setSelected(event.target.checked ? [...selected, question.key] : selected.filter((key) => key !== question.key))} />
                <span>
                  <span className="block text-sm font-semibold" lang="hi">{question.question_hi}</span>
                  <span className="block text-sm">{question.question_en}</span>
                  <span className="text-xs text-slate-600">{subjectLabel(question.subject)} · {question.topic}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <button className={inputClass} disabled={!page} onClick={() => setPage(page - 1)}>{t('Previous', 'पिछला')}</button>
          <button className={inputClass} disabled={(page + 1) * 20 >= results.length} onClick={() => setPage(page + 1)}>{t('Next', 'अगला')}</button>
        </div>
      </div>}
    </div>
  );
}
