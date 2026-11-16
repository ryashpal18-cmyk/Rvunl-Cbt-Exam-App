import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Attempt, Paper, SUBJECTS } from '../types/exam';
import { resultForAttempt } from '../utils/scoring';

interface Props { attempts: Attempt[]; papers: Paper[]; }

export default function ComparisonView({ attempts, papers }: Props) {
  const latest = (userId: 'monika' | 'shivani') => attempts.find((attempt) => attempt.userId === userId && papers.some((paper) => paper.paperId === attempt.paperId));
  const monika = latest('monika'); const shivani = latest('shivani');
  const result = (attempt?: Attempt) => attempt ? resultForAttempt(attempt, papers.find((paper) => paper.paperId === attempt.paperId)!) : null;
  const monikaResult = result(monika); const shivaniResult = result(shivani);
  const chartData = SUBJECTS.map((subject) => ({
    subject: subject.replace('World, India & Everyday Science', 'World/India/Science').replace('Reasoning & Mental Ability', 'Reasoning'),
    Monika: monikaResult?.subjects.find((row) => row.subject === subject)?.accuracy ?? 0,
    Shivani: shivaniResult?.subjects.find((row) => row.subject === subject)?.accuracy ?? 0,
  }));

  return <section><p className="eyebrow">Shared device analytics</p><h2 className="mt-2 text-3xl font-bold">Monika vs. Shivani</h2><p className="mt-2 text-slate-600">Comparison uses each profile’s latest completed full mock.</p>
    <div className="mt-7 grid grid-cols-2 gap-5"><Summary name="Monika" attempt={monika} score={monikaResult?.score} accuracy={monikaResult?.accuracy} color="bg-cyan-700" /><Summary name="Shivani" attempt={shivani} score={shivaniResult?.score} accuracy={shivaniResult?.accuracy} color="bg-violet-600" /></div>
    <div className="card mt-6 p-6"><h3 className="font-bold">Subject accuracy (%)</h3><div className="mt-5 h-[350px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ left: 0, right: 20, bottom: 55 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="subject" angle={-25} textAnchor="end" interval={0} height={85} fontSize={11} /><YAxis domain={[0, 100]} /><Tooltip /><Legend /><Bar dataKey="Monika" fill="#0e7490" radius={[4,4,0,0]} /><Bar dataKey="Shivani" fill="#7c3aed" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div></div>
  </section>;
}

function Summary({ name, attempt, score, accuracy, color }: { name: string; attempt?: Attempt; score?: number; accuracy?: number; color: string }) {
  return <div className="card flex items-center gap-4 p-5"><span className={`flex h-14 w-14 items-center justify-center rounded-xl text-xl font-bold text-white ${color}`}>{name[0]}</span><div><h3 className="font-bold">{name}</h3>{attempt ? <p className="mt-1 text-sm text-slate-600"><b className="text-slate-900">{score}</b> marks · {accuracy}% accuracy · {Math.round(attempt.timeTakenSeconds / 60)} min</p> : <p className="mt-1 text-sm text-slate-500">No completed mock yet</p>}</div></div>;
}
