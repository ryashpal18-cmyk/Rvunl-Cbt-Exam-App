import { Attempt, ExamResult, NegativeMarking, Paper, QuestionResponse, SUBJECTS } from '../types/exam';

const roundScore = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateScore(
  paper: Paper,
  responses: Record<string, QuestionResponse>,
  negativeMarking: NegativeMarking,
): ExamResult {
  const subjectRows = SUBJECTS.map((subject) => {
    const questions = paper.questions.filter((question) => question.subject === subject);
    let correct = 0;
    let wrong = 0;
    let score = 0;

    for (const question of questions) {
      const response = responses[String(question.id)];
      if (response?.selectedIndex === undefined) continue;
      if (response.selectedIndex === question.correctIndex) {
        correct += 1;
        score += question.marks;
      } else {
        wrong += 1;
        if (negativeMarking === 'quarter') score -= question.marks * 0.25;
      }
    }

    const attempted = correct + wrong;
    return {
      subject,
      total: questions.length,
      attempted,
      correct,
      wrong,
      skipped: questions.length - attempted,
      score: roundScore(score),
      maxScore: questions.reduce((sum, question) => sum + question.marks, 0),
      accuracy: attempted ? roundScore((correct / attempted) * 100) : 0,
    };
  });

  const total = paper.questions.length;
  const attempted = subjectRows.reduce((sum, row) => sum + row.attempted, 0);
  const correct = subjectRows.reduce((sum, row) => sum + row.correct, 0);
  const wrong = subjectRows.reduce((sum, row) => sum + row.wrong, 0);
  const score = roundScore(subjectRows.reduce((sum, row) => sum + row.score, 0));
  const maxScore = paper.questions.reduce((sum, question) => sum + question.marks, 0);

  return {
    total,
    attempted,
    correct,
    wrong,
    skipped: total - attempted,
    score,
    maxScore,
    percentage: maxScore ? roundScore((score / maxScore) * 100) : 0,
    accuracy: attempted ? roundScore((correct / attempted) * 100) : 0,
    subjects: subjectRows.filter((row) => row.total > 0),
  };
}

export function resultForAttempt(attempt: Attempt, paper: Paper): ExamResult {
  return calculateScore(paper, attempt.responses, attempt.negativeMarking);
}

export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}
