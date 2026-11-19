import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Attempt, Paper, SUBJECTS, UserId } from '../types/exam';
import { resultForAttempt } from '../utils/scoring';
import { useSubjectLabel, useTranslation } from '../uiLanguage';

interface Props {
  attempts: Attempt[];
  papers: Paper[];
  userId?: UserId;
  userName?: string;
}

export default function ComparisonView({
  attempts,
  papers,
  userId,
  userName = 'Candidate',
}: Props) {
  const t = useTranslation();
  const subjectLabel = useSubjectLabel();
  const recent = attempts
    .filter(
      (attempt) =>
        attempt.userId === userId &&
        (attempt.sessionPaper ||
          papers.some((paper) => paper.paperId === attempt.paperId)),
    )
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 2);
  const result = (attempt?: Attempt) => {
    const paper =
      attempt?.sessionPaper ??
      papers.find((item) => item.paperId === attempt?.paperId);
    return attempt && paper ? resultForAttempt(attempt, paper) : undefined;
  };
  const latestResult = result(recent[0]);
  const previousResult = result(recent[1]);
  const chartData = SUBJECTS.map((subject) => ({
    subject: subjectLabel(subject),
    latest:
      latestResult?.subjects.find((row) => row.subject === subject)?.accuracy ??
      0,
    previous:
      previousResult?.subjects.find((row) => row.subject === subject)
        ?.accuracy ?? 0,
  }));

  return (
    <section>
      <p className="dashboard-kicker">
        {t('Your progress, side by side', 'अपने प्रयासों की तुलना')}
      </p>
      <h2 className="mt-2 text-2xl font-bold">
        {userName} · {t('Attempt Comparison', 'प्रयासों की तुलना')}
      </h2>
      <p className="dashboard-muted mt-2 text-sm">
        {t(
          'Compare your two most recent completed tests. Each profile’s results stay private.',
          'अपने दो नवीनतम पूरे टेस्ट की तुलना करें। हर प्रोफ़ाइल के रिज़ल्ट निजी रहते हैं।',
        )}
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {recent.map((attempt, index) => (
          <div
            key={attempt.attemptId}
            className="rounded-xl border border-slate-200 p-5"
          >
            <p className="dashboard-kicker">
              {index === 0
                ? t('Latest attempt', 'नवीनतम प्रयास')
                : t('Previous attempt', 'पिछला प्रयास')}
            </p>
            <h3 className="mt-2 font-bold">{attempt.paperTitle}</h3>
            <p className="dashboard-muted mt-2 text-sm">
              <strong className="text-slate-900">
                {(attempt.maxScore > 0
                  ? (attempt.totalScore / attempt.maxScore) * 100
                  : 0
                ).toFixed(1)}{' '}
                / 100
              </strong>{' '}
              · {new Date(attempt.timestamp).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
      {recent.length < 2 ? (
        <p className="dashboard-muted mt-6 text-sm">
          {t(
            'Complete two tests to see a comparison.',
            'तुलना देखने के लिए दो टेस्ट पूरे करें।',
          )}
        </p>
      ) : (
        <div className="mt-7">
          <h3 className="text-sm font-bold">
            {t('Subject accuracy (%)', 'विषयवार सटीकता (%)')}
          </h3>
          <div className="mt-5 h-[350px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ left: -15, right: 12, bottom: 60 }}
              >
                <CartesianGrid
                  stroke="var(--dash-border)"
                  vertical={false}
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="subject"
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                  height={100}
                  tick={{ fontSize: 10, fill: 'var(--dash-muted)' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: 'var(--dash-muted)' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--dash-solid)',
                    borderColor: 'var(--dash-border)',
                    borderRadius: 10,
                    color: 'var(--dash-text)',
                  }}
                />
                <Legend />
                <Bar
                  dataKey="latest"
                  name={t('Latest attempt', 'नवीनतम प्रयास')}
                  fill="#5d90f5"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="previous"
                  name={t('Previous attempt', 'पिछला प्रयास')}
                  fill="#a78bfa"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}
