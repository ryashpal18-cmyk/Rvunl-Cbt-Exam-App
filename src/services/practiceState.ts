import { DIFFICULTIES, Difficulty } from '../types/exam';

export interface TestRow { topic: string; count: number }
export interface Preset { name: string; rows: TestRow[]; minutes: number; difficulty: Difficulty | '' }
export interface Goal { count: number; accuracy: number; since: string }
export interface PracticeState { checked: string[]; goals: Record<string, Goal>; presets: Preset[] }

export const practiceStorageKey = (userId: string) => `rvunl-practice-v1-${userId}`;
export const emptyPracticeState = (): PracticeState => ({ checked: [], goals: {}, presets: [] });

export function validatePracticeState(value: unknown): asserts value is PracticeState {
  const data = value as PracticeState | null;
  if (!data || !Array.isArray(data.checked) || data.checked.some((item) => typeof item !== 'string') ||
      !data.goals || typeof data.goals !== 'object' || Array.isArray(data.goals) || !Array.isArray(data.presets)) {
    throw new Error('Invalid practice settings in backup.');
  }
  for (const goal of Object.values(data.goals)) {
    if (!goal || !Number.isInteger(goal.count) || goal.count < 1 || goal.count > 5000 ||
        !Number.isInteger(goal.accuracy) || goal.accuracy < 1 || goal.accuracy > 100 ||
        typeof goal.since !== 'string' || !Number.isFinite(Date.parse(goal.since))) {
      throw new Error('Invalid practice goal in backup.');
    }
  }
  for (const preset of data.presets) {
    if (!preset || typeof preset.name !== 'string' || !preset.name.trim() ||
        !Array.isArray(preset.rows) || !Number.isInteger(preset.minutes) ||
        preset.minutes < 1 || preset.minutes > 180 ||
        (preset.difficulty !== '' && !DIFFICULTIES.includes(preset.difficulty)) ||
        preset.rows.some((row) => !row || typeof row.topic !== 'string' || !Number.isInteger(row.count) || row.count < 1)) {
      throw new Error('Invalid saved test in backup.');
    }
  }
}

export function readPracticeState(userId: string): PracticeState {
  const raw = localStorage.getItem(practiceStorageKey(userId));
  if (!raw) return emptyPracticeState();
  const data: unknown = JSON.parse(raw);
  validatePracticeState(data);
  return data;
}
