export const SUBJECTS = [
  'Rajasthan GK',
  'World, India & Everyday Science',
  'Reasoning & Mental Ability',
  'Hindi General',
  'English General',
  'Mathematics',
] as const;

export type Subject = (typeof SUBJECTS)[number];
export type Language = 'en' | 'hi';
export type NegativeMarking = 'none' | 'quarter';
export type UserId = 'monika' | 'shivani';

export interface Question {
  id: number;
  subject: Subject;
  marks: number;
  question_en: string;
  question_hi: string;
  options_en: [string, string, string, string, string];
  options_hi: [string, string, string, string, string];
  correctIndex: number;
  explanation_en: string;
  explanation_hi: string;
}

export interface Paper {
  paperId: string;
  title: string;
  durationMinutes: number;
  questions: Question[];
  imported?: boolean;
  importedAt?: string;
}

export interface QuestionResponse {
  selectedIndex?: number;
  markedForReview: boolean;
  visited: boolean;
  timeSpentSec: number;
}

export interface Attempt {
  attemptId: string;
  userId: UserId;
  paperId: string;
  paperTitle: string;
  timestamp: string;
  timeTakenSeconds: number;
  totalScore: number;
  maxScore: number;
  negativeMarking: NegativeMarking;
  responses: Record<string, QuestionResponse>;
  submittedByTimer: boolean;
}

export interface ProfileRecord {
  id: UserId;
  name: string;
  pinConfigured: boolean;
}

export interface StoredState {
  profiles: ProfileRecord[];
  attempts: Attempt[];
  papers: Paper[];
}

export interface ExamConfig {
  language: Language;
  negativeMarking: NegativeMarking;
  strictOmnibus: boolean;
}

export interface SubjectResult {
  subject: Subject;
  total: number;
  attempted: number;
  correct: number;
  wrong: number;
  skipped: number;
  score: number;
  maxScore: number;
  accuracy: number;
}

export interface ExamResult {
  total: number;
  attempted: number;
  correct: number;
  wrong: number;
  skipped: number;
  score: number;
  maxScore: number;
  percentage: number;
  accuracy: number;
  subjects: SubjectResult[];
}
