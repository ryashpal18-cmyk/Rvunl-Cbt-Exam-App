import { practiceStorageKey, readPracticeState, validatePracticeState } from './practiceState';
import { BookmarkedQuestion, DraftExamState, Question, ThemeMode, TypingAttempt, UserId } from '../types/exam';

const KEY = (suffix: string, userId: UserId) => `rvunl_v2_${suffix}_${userId}`;

export function getUserTheme(userId: UserId): ThemeMode {
  const v = localStorage.getItem(KEY('theme', userId));
  return v === 'dark' || v === 'warm' ? v : 'light';
}

export function setUserTheme(userId: UserId, theme: ThemeMode): void {
  localStorage.setItem(KEY('theme', userId), theme);
}

export function getBookmarks(userId: UserId): BookmarkedQuestion[] {
  try {
    const raw = localStorage.getItem(KEY('bookmarks', userId));
    return raw ? (JSON.parse(raw) as BookmarkedQuestion[]) : [];
  } catch {
    return [];
  }
}

export function isQuestionBookmarked(userId: UserId, paperId: string, questionId: number): boolean {
  const key = `${paperId}::${questionId}`;
  return getBookmarks(userId).some((b) => b.key === key);
}

export function toggleBookmark(userId: UserId, paperId: string, paperTitle: string, question: Question): BookmarkedQuestion[] {
  const key = `${paperId}::${question.id}`;
  const current = getBookmarks(userId);
  const exists = current.some((b) => b.key === key);
  const next = exists
    ? current.filter((b) => b.key !== key)
    : [{ key, paperId, paperTitle, question, savedAt: new Date().toISOString() }, ...current];
  localStorage.setItem(KEY('bookmarks', userId), JSON.stringify(next));
  return next;
}

export function getTypingAttempts(userId: UserId): TypingAttempt[] {
  try {
    const raw = localStorage.getItem(KEY('typing', userId));
    return raw ? (JSON.parse(raw) as TypingAttempt[]) : [];
  } catch {
    return [];
  }
}

export function saveTypingAttempt(attempt: TypingAttempt): TypingAttempt[] {
  const current = getTypingAttempts(attempt.userId);
  const next = [attempt, ...current].slice(0, 100);
  localStorage.setItem(KEY('typing', attempt.userId), JSON.stringify(next));
  return next;
}

export function saveExamDraft(draft: DraftExamState): void {
  localStorage.setItem(KEY('draft', draft.userId), JSON.stringify(draft));
}

export function loadExamDraft(userId: UserId): DraftExamState | null {
  try {
    const raw = localStorage.getItem(KEY('draft', userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftExamState;
    if (parsed?.userId !== userId || !parsed.paper?.questions?.length || !Number.isFinite(parsed.remainingSeconds) || parsed.remainingSeconds < 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearExamDraft(userId: UserId): void {
  localStorage.removeItem(KEY('draft', userId));
}

export function exportUserExtrasJson(userId: UserId): string {
  return JSON.stringify({
    version: 3,
    userId,
    theme: getUserTheme(userId),
    bookmarks: getBookmarks(userId),
    typingAttempts: getTypingAttempts(userId),
    practice: readPracticeState(userId),
    draft: loadExamDraft(userId),
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

export function importUserExtrasJson(userId: UserId, raw: string): void {
  const data = JSON.parse(raw) as {
    userId?: UserId;
    theme?: ThemeMode;
    bookmarks?: BookmarkedQuestion[];
    typingAttempts?: TypingAttempt[];
    practice?: unknown;
    draft?: DraftExamState | null;
  };
  if (data.userId !== userId) throw new Error('This backup belongs to a different profile.');
  if (data.practice !== undefined) validatePracticeState(data.practice);
  if (data.draft !== undefined && data.draft !== null &&
      (data.draft.userId !== userId || !Array.isArray(data.draft.paper?.questions) ||
       !data.draft.paper.questions.length || !Number.isFinite(data.draft.remainingSeconds) || data.draft.remainingSeconds < 0)) {
    throw new Error('Invalid saved exam in backup.');
  }
  if (data.theme === 'light' || data.theme === 'dark' || data.theme === 'warm') setUserTheme(userId, data.theme);
  if (Array.isArray(data.bookmarks)) localStorage.setItem(KEY('bookmarks', userId), JSON.stringify(data.bookmarks));
  if (data.practice !== undefined) localStorage.setItem(practiceStorageKey(userId), JSON.stringify(data.practice));
  if (data.draft === null) clearExamDraft(userId);
  else if (data.draft !== undefined) saveExamDraft(data.draft);
  if (Array.isArray(data.typingAttempts)) localStorage.setItem(KEY('typing', userId), JSON.stringify(data.typingAttempts.filter((attempt) => attempt?.userId === userId)));
}
