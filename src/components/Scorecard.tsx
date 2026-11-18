import { useSubjectLabel, useTranslation } from '../uiLanguage';
import { BarChart3, CheckCircle2, Clock3, Eye, Home, Printer, ShieldCheck, Target, XCircle } from 'lucide-react';
import { Attempt, Paper } from '../types/exam';
import { formatDuration, resultForAttempt } from '../utils/scoring';

interface Props {
  attempt: Attempt;
  paper: Paper;
  onReview: () => void;
  onDashboard: () => void;
}

const CUTOFFS = [
  { label: 'ST', value: 58 },
  { label: 'SC', value: 62 },
  { label: 'EWS', value: 68 },
  { label: 'OBC', value: 72 },
  { label: 'GEN', value: 75 },
];

export default function Scorecard({ attempt, paper, onReview, onDashboard }: Props) {
  const t = useTranslation();
  const subjectLabel = useSubjectLabel();
  const result = resultForAttempt(attempt, paper);
  const wrongQuestions = paper.questions.filter((question) => {
    const choice = attempt.responses[String(question.id)]?.selectedIndex;
    return choice !== undefined && choice !== question.correctIndex;
  });
  const guesses = paper.questions.filter((question) => {
    const response = attempt.responses[String(question.id)];
    return response?.guessed && response.selectedIndex !== undefined;
  });
  const correctGuesses = guesses.filter((question) => attempt.responses[String(question.id)].selectedIndex === question.correctIndex).length;
  const inSafeZone = result.percentage >= 75;

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="no-print flex justify-start">
          <button onClick={onDashboard} className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
              <Home className="h-4 w-4" /> {t("Dashboard", "डैशबोर्ड")}
            </button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">{t("Official-style scorecard", "परीक्षा का परिणाम")}</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">{paper.title}</h1>
              <p className="mt-1 text-xs text-slate-500">
                {t("Submitted", "सबमिट किया गया")} {new Date(attempt.timestamp).toLocaleString()}
                {attempt.submittedByTimer ? t(' · Auto-submitted at 00:00', ' · 00:00 पर अपने आप सबमिट हुआ') : ''}
                {attempt.tabSwitchCount ? ` · ${t('Focus switches', 'स्क्रीन बदली')} · ${attempt.tabSwitchCount}` : ''}
              </p>
            </div>
            <div className="rounded-2xl bg-blue-50 px-6 py-4 text-right">
              <p className="text-xs font-bold uppercase text-blue-700">{t("Total Score", "कुल अंक")}</p>
              <p className="text-3xl font-extrabold text-blue-900">{result.score} / {result.maxScore}</p>
              <p className="text-xs font-semibold text-blue-700">{result.percentage}%</p>
            </div>
          </div>

          {/* Expected Cutoff Bar */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                <ShieldCheck className={`h-4 w-4 ${inSafeZone ? 'text-emerald-600' : 'text-amber-600'}`} />
                Practice Cutoff Reference ({inSafeZone ? t('Safe Zone', 'लक्ष्य पूरा') : t('Needs Improvement', 'और अभ्यास चाहिए')})
              </span>
              <span className="text-xs font-semibold text-slate-600">{t("Your Score:", "आपके अंक")} {result.percentage}%</span>
            </div>
            <div className="relative mt-3 h-4 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full transition-all ${inSafeZone ? 'bg-emerald-600' : result.percentage >= 62 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, Math.max(0, result.percentage))}%` }}
              />
              {CUTOFFS.map((marker) => (
                <span key={marker.label} className="absolute inset-y-0 w-px bg-slate-900" style={{ left: `${marker.value}%` }} title={`${marker.label} ${marker.value}%`} />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] font-semibold text-slate-600">
              {CUTOFFS.map((c) => (
                <span key={c.label} className={result.percentage >= c.value ? 'text-emerald-700' : 'text-slate-500'}>
                  {c.label}: {c.value}% {result.percentage >= c.value ? '✓' : ''}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <Metric icon={<BarChart3 className="h-4 w-4" />} label={t("Questions", "सवाल")} value={String(result.total)} color="text-slate-900" />
            <Metric icon={<Target className="h-4 w-4" />} label={t("Attempted", "हल किए")} value={String(result.attempted)} color="text-blue-700" />
            <Metric icon={<CheckCircle2 className="h-4 w-4" />} label={t("Correct", "सही")} value={String(result.correct)} color="text-emerald-700" />
            <Metric icon={<XCircle className="h-4 w-4" />} label={t("Wrong", "गलत")} value={String(result.wrong)} color="text-red-600" />
            <Metric icon={<Clock3 className="h-4 w-4" />} label={t("Skipped", "छूटे")} value={String(result.skipped)} color="text-slate-600" />
            <Metric icon={<Target className="h-4 w-4" />} label={t("Accuracy", "सही जवाब (%)")} value={`${result.accuracy}%`} color="text-violet-700" />
            <Metric icon={<Clock3 className="h-4 w-4" />} label={t("Time taken", "लगा समय")} value={formatDuration(attempt.timeTakenSeconds)} color="text-slate-900" />
          </div>

          {guesses.length > 0 && <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            {t('Guessed answers', 'अंदाज़े से दिए जवाब')} · {correctGuesses}/{guesses.length} {t('correct', 'सही')}
          </p>}
          <div className="mt-8 overflow-x-auto">
            <h2 className="mb-3 text-base font-bold text-slate-900">{t("Subject-wise performance", "विषयवार प्रदर्शन")}</h2>
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
                  <th className="p-3">{t("Subject", "विषय")}</th>
                  <th className="p-3">{t("Total", "कुल")}</th>
                  <th className="p-3">{t("Correct", "सही")}</th>
                  <th className="p-3">{t("Wrong", "गलत")}</th>
                  <th className="p-3">{t("Skipped", "छूटे")}</th>
                  <th className="p-3">{t("Accuracy", "सही जवाब (%)")}</th>
                  <th className="p-3 text-right">{t("Score", "अंक")}</th>
                </tr>
              </thead>
              <tbody>
                {result.subjects.map((row) => (
                  <tr key={subjectLabel(row.subject)} className={`border-b border-slate-100 ${row.subject === 'Rajasthan GK' ? 'bg-amber-50/60 font-semibold' : ''}`}>
                    <td className="p-3">
                      {subjectLabel(row.subject)}
                      {row.subject === 'Rajasthan GK' && row.maxScore === 46 && (
                        <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">46 MARKS</span>
                      )}
                    </td>
                    <td className="p-3">{row.total}</td>
                    <td className="p-3 text-emerald-700">{row.correct}</td>
                    <td className="p-3 text-red-600">{row.wrong}</td>
                    <td className="p-3 text-slate-500">{row.skipped}</td>
                    <td className="p-3">{row.accuracy}%</td>
                    <td className="p-3 text-right font-bold">{row.score} / {row.maxScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="hidden print:block print:mt-8">
            <h2 className="text-lg font-bold">{t("Incorrect Answers Review", "गलत जवाबों की समीक्षा")}</h2>
            {!wrongQuestions.length && <p>{t("No incorrect answers.", "कोई गलत जवाब नहीं है।")}</p>}
            {wrongQuestions.map((question) => {
              const choice = attempt.responses[String(question.id)].selectedIndex!;
              return (
                <article key={question.id} className="break-inside-avoid border-b py-3 text-sm">
                  <h3 className="font-semibold">{question.question_en}</h3>
                  <p lang="hi">{question.question_hi}</p>
                  <p>{t("Your answer:", "आपका जवाब")} {question.options_en[choice]} / {question.options_hi[choice]}</p>
                  <p>{t("Correct answer:", "सही जवाब")} {question.options_en[question.correctIndex]} / {question.options_hi[question.correctIndex]}</p>
                  <p>{question.explanation_en}</p>
                  <p lang="hi">{question.explanation_hi}</p>
                </article>
              );
            })}
          </section>

          <div className="no-print mt-8 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3">
              <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                <Printer className="h-4 w-4" /> {t("Print / Save as PDF", "प्रिंट करें या PDF सेव करें")}
              </button>
              <button onClick={onReview} className="flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800">
                <Eye className="h-4 w-4" /> {t("View detailed paper review", "सवालों की समीक्षा देखें")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, color }: { icon: JSX.Element; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
      <div className={`flex items-center justify-center gap-1 text-lg font-extrabold ${color}`}>{icon}{value}</div>
      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{label}</p>
    </div>
  );
}
