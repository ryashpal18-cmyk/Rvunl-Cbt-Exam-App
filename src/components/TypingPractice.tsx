import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Lock, RotateCcw, Timer, Trophy } from 'lucide-react';
import { TypingAttempt, UserId } from '../types/exam';
import { getTypingAttempts, saveTypingAttempt } from '../services/userExtras';

interface Props {
  userId: UserId;
  userName: string;
}

const ENGLISH_PASSAGES = [
  'Rajasthan Rajya Vidyut Utpadan Nigam Limited conducts competitive examinations for Junior Assistant and Commercial Assistant posts to recruit efficient administrative personnel across power generation stations. Accuracy and consistent speed in keyboard typing play a decisive role in the second phase skill test. Candidates should maintain steady posture, keep their eyes on the source passage rather than the keys, and avoid unnecessary corrections when backspace is restricted.',
  'Modern office administration relies on clear written communication, accurate record keeping, and timely processing of official correspondence. Developing a reliable rhythm between forty and fifty words per minute with ninety-five percent accuracy ensures strong performance in government typing assessments without accumulating penalty deductions.',
];

const HINDI_PASSAGES = [
  'राजस्थान राज्य विद्युत उत्पादन निगम लिमिटेड द्वारा कनिष्ठ सहायक एवं वाणिज्यिक सहायक पदों की भर्ती के लिए आयोजित द्वितीय चरण की टंकण परीक्षा में गति और शुद्धता दोनों का विशेष महत्व होता है। अभ्यर्थियों को नियमित अभ्यास के माध्यम से अपनी उंगलियों की स्थिति और लय को स्थिर रखना चाहिए ताकि बिना देखे सटीक टाइपिंग की जा सके।',
  'सरकारी कार्यालयों में दैनिक पत्राचार, अभिलेख संधारण तथा जनसेवा से जुड़े कार्यों के निष्पादन के लिए हिंदी यूनिकोड एवं मंगल फॉन्ट में कुशल टंकण आवश्यक है। एकाग्रता बनाए रखते हुए गलतियों को कम करना ही उच्च शुद्धता और बेहतर नेट गति प्राप्त करने का सबसे प्रभावी उपाय है।',
];

export default function TypingPractice({ userId, userName }: Props) {
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [durationMin, setDurationMin] = useState<5 | 10 | 15>(5);
  const [lockBackspace, setLockBackspace] = useState(false);
  const [passageIndex, setPassageIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [remainingSec, setRemainingSec] = useState(5 * 60);
  const [history, setHistory] = useState<TypingAttempt[]>(() => getTypingAttempts(userId));
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    setHistory(getTypingAttempts(userId));
  }, [userId]);

  const passage = useMemo(() => {
    const list = language === 'en' ? ENGLISH_PASSAGES : HINDI_PASSAGES;
    return list[passageIndex % list.length];
  }, [language, passageIndex]);

  const metrics = useMemo(() => {
    const refWords = passage.trim().split(/\s+/);
    const typedWords = typed.trim() ? typed.trim().split(/\s+/) : [];
    let errorWords = 0;
    for (let i = 0; i < typedWords.length; i += 1) {
      if (typedWords[i] !== refWords[i]) errorWords += 1;
    }
    const elapsedSec = Math.max(1, durationMin * 60 - remainingSec);
    const elapsedMin = elapsedSec / 60;
    const grossWpm = Math.round(typed.length / 5 / elapsedMin);
    const netWpm = Math.max(0, Math.round((typed.length / 5 - errorWords) / elapsedMin));
    const accuracy = typedWords.length === 0
      ? 100
      : Math.max(0, Math.round(((typedWords.length - errorWords) / typedWords.length) * 100));

    return { grossWpm, netWpm, accuracy, errorWords, typedWords, refWords };
  }, [durationMin, passage, remainingSec, typed]);

  const finishTest = () => {
    setRunning(false);
    setFinished(true);
    const record: TypingAttempt = {
      id: `typ_${Date.now()}`,
      userId,
      language,
      durationMinutes: durationMin,
      grossWpm: metrics.grossWpm,
      netWpm: metrics.netWpm,
      accuracy: metrics.accuracy,
      errorCount: metrics.errorWords,
      backspaceLocked: lockBackspace,
      timestamp: new Date().toISOString(),
    };
    setHistory(saveTypingAttempt(record));
  };

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running && remainingSec === 0) {
      finishTest();
    }
  });

  const resetTest = (nextDuration = durationMin) => {
    setRunning(false);
    setFinished(false);
    setTyped('');
    setRemainingSec(nextDuration * 60);
    startRef.current = null;
  };

  const handleInputChange = (val: string) => {
    if (finished) return;
    if (!running && val.length > 0) {
      setRunning(true);
      startRef.current = Date.now();
    }
    setTyped(val);
  };

  const mm = String(Math.floor(remainingSec / 60)).padStart(2, '0');
  const ss = String(remainingSec % 60).padStart(2, '0');

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Keyboard className="h-5 w-5 text-blue-700" />
              Phase-II Typing Practice ({userName})
            </h2>
            <p className="text-xs text-slate-500">
              RVUNL Phase-II Skill Test practice (English &amp; Hindi Unicode/Mangal). Metrics are saved per profile.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={language}
              disabled={running}
              onChange={(e) => {
                setLanguage(e.target.value as 'en' | 'hi');
                resetTest();
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              <option value="en">English Typing</option>
              <option value="hi">Hindi (Unicode / Mangal)</option>
            </select>
            <select
              value={durationMin}
              disabled={running}
              onChange={(e) => {
                const next = Number(e.target.value) as 5 | 10 | 15;
                setDurationMin(next);
                resetTest(next);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              <option value={5}>5 Minutes</option>
              <option value={10}>10 Minutes</option>
              <option value={15}>15 Minutes</option>
            </select>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={lockBackspace}
                disabled={running}
                onChange={(e) => setLockBackspace(e.target.checked)}
              />
              <Lock className="h-3.5 w-3.5 text-amber-600" /> Lock Backspace
            </label>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase text-slate-500">Timer</p>
            <p className="mt-0.5 flex items-center gap-1 font-mono text-lg font-extrabold text-slate-900">
              <Timer className="h-4 w-4 text-blue-700" /> {mm}:{ss}
            </p>
          </div>
          <div className="rounded-xl bg-blue-50 p-3">
            <p className="text-[11px] font-bold uppercase text-blue-700">Gross WPM</p>
            <p className="mt-0.5 text-lg font-extrabold text-blue-900">{metrics.grossWpm}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3">
            <p className="text-[11px] font-bold uppercase text-emerald-700">Net WPM</p>
            <p className="mt-0.5 text-lg font-extrabold text-emerald-900">{metrics.netWpm}</p>
          </div>
          <div className="rounded-xl bg-indigo-50 p-3">
            <p className="text-[11px] font-bold uppercase text-indigo-700">Accuracy</p>
            <p className="mt-0.5 text-lg font-extrabold text-indigo-900">{metrics.accuracy}%</p>
          </div>
          <div className="rounded-xl bg-rose-50 p-3">
            <p className="text-[11px] font-bold uppercase text-rose-700">Error Words</p>
            <p className="mt-0.5 text-lg font-extrabold text-rose-900">{metrics.errorWords}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-800">
          {metrics.refWords.map((word, idx) => {
            const typedWord = metrics.typedWords[idx];
            let cls = 'text-slate-800';
            if (typedWord !== undefined) {
              cls = typedWord === word ? 'text-emerald-700 font-semibold' : 'bg-rose-100 text-rose-800 underline';
            } else if (idx === metrics.typedWords.length) {
              cls = 'bg-blue-100 text-blue-900 font-semibold px-0.5 rounded';
            }
            return (
              <span key={idx} className={`mr-1.5 inline-block ${cls}`}>
                {word}
              </span>
            );
          })}
        </div>

        <textarea
          value={typed}
          disabled={finished}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (lockBackspace && (e.key === 'Backspace' || e.key === 'Delete')) {
              e.preventDefault();
            }
          }}
          rows={5}
          placeholder={language === 'en' ? 'Start typing the passage above to begin the timer...' : 'टाइमर शुरू करने के लिए ऊपर दिया गया गद्यांश यहाँ टाइप करें...'}
          className="mt-4 w-full rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPassageIndex((i) => i + 1);
                resetTest();
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Switch Passage
            </button>
            <button
              type="button"
              onClick={() => resetTest()}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          </div>
          {!finished && running && (
            <button
              type="button"
              onClick={finishTest}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Finish &amp; Save Score
            </button>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
            <Trophy className="h-4 w-4 text-amber-600" /> Recent Typing History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Language</th>
                  <th className="py-2 pr-3">Duration</th>
                  <th className="py-2 pr-3">Gross / Net WPM</th>
                  <th className="py-2 pr-3">Accuracy</th>
                  <th className="py-2 pr-3">Errors</th>
                  <th className="py-2">Mode</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map((h) => (
                  <tr key={h.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3 text-slate-600">{new Date(h.timestamp).toLocaleDateString()}</td>
                    <td className="py-2 pr-3 font-semibold">{h.language === 'en' ? 'English' : 'Hindi'}</td>
                    <td className="py-2 pr-3">{h.durationMinutes} min</td>
                    <td className="py-2 pr-3 font-bold text-blue-800">{h.grossWpm} / {h.netWpm}</td>
                    <td className="py-2 pr-3 font-semibold text-emerald-700">{h.accuracy}%</td>
                    <td className="py-2 pr-3 text-rose-700">{h.errorCount}</td>
                    <td className="py-2 text-slate-500">{h.backspaceLocked ? 'Backspace Locked' : 'Standard'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
