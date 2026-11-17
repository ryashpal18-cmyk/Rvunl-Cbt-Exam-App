export const SUBJECTS = [
  'Rajasthan GK',
  'World, India & Everyday Science',
  'Reasoning & Mental Ability',
  'Hindi General',
  'English General',
  'Mathematics',
] as const;

export const PAPER_CATEGORIES = ['Full Mock', 'Previous Year', 'Rajasthan GK', 'Subject Practice', 'Custom'] as const;
export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;

export type Subject = (typeof SUBJECTS)[number];
export type PaperCategory = (typeof PAPER_CATEGORIES)[number];
export type Difficulty = (typeof DIFFICULTIES)[number];
export type Language = 'en' | 'hi';
export type NegativeMarking = 'none' | 'quarter';
export type UserId = string;
export type ThemeMode = 'light' | 'dark' | 'warm';

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
  category?: PaperCategory;
  difficulty?: Difficulty;
  year?: number;
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
  tabSwitchCount?: number;
  sessionPaper?: Paper;
}

export interface ProfileRecord {
  id: UserId;
  name: string;
  pinConfigured: boolean;
  builtIn?: boolean;
}

export interface StoredState {
  profiles: ProfileRecord[];
  attempts: Attempt[];
  papers: Paper[];
}

export type UpdateState = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';

export interface UpdateStatus {
  state: UpdateState;
  message: string;
  version?: string;
  percent?: number;
}

export interface ExamConfig {
  language: Language;
  negativeMarking: NegativeMarking;
  strictOmnibus: boolean;
  mouseOnly?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
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

export interface BookmarkedQuestion {
  key: string;
  paperId: string;
  paperTitle: string;
  question: Question;
  savedAt: string;
}

export interface TypingAttempt {
  id: string;
  userId: UserId;
  language: 'en' | 'hi';
  durationMinutes: number;
  grossWpm: number;
  netWpm: number;
  accuracy: number;
  errorCount: number;
  backspaceLocked: boolean;
  timestamp: string;
}

export interface DraftExamState {
  userId: UserId;
  paper: Paper;
  config: ExamConfig;
  responses: Record<string, QuestionResponse>;
  currentIndex: number;
  remainingSeconds: number;
  tabSwitchCount: number;
  lastSavedAt: string;
}
