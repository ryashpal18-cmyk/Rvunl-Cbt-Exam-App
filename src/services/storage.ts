import { Attempt, Paper, StoredState, UserId } from '../types/exam';

const STORAGE_KEY = 'rvunl-cbt-browser-data';
const defaultState = (): StoredState => ({
  profiles: [
    { id: 'monika', name: 'Monika', pinConfigured: false },
    { id: 'shivani', name: 'Shivani', pinConfigured: false },
  ],
  attempts: [],
  papers: [],
});

function browserLoad(): StoredState {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as StoredState;
    return parsed?.profiles && parsed?.attempts && parsed?.papers ? parsed : defaultState();
  } catch {
    return defaultState();
  }
}

function browserSave(state: StoredState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function loadState(): Promise<StoredState> {
  return window.rvunlAPI ? window.rvunlAPI.loadState() : browserLoad();
}

export async function persistAttempt(attempt: Attempt): Promise<void> {
  if (window.rvunlAPI) return window.rvunlAPI.saveAttempt(attempt);
  const state = browserLoad();
  browserSave({ ...state, attempts: [attempt, ...state.attempts.filter((item) => item.attemptId !== attempt.attemptId)] });
}

export async function persistPaper(paper: Paper): Promise<void> {
  if (window.rvunlAPI) return window.rvunlAPI.savePaper(paper);
  const state = browserLoad();
  browserSave({ ...state, papers: [paper, ...state.papers.filter((item) => item.paperId !== paper.paperId)] });
}

export async function removePaper(paperId: string): Promise<void> {
  if (window.rvunlAPI) return window.rvunlAPI.deletePaper(paperId);
  const state = browserLoad();
  browserSave({ ...state, papers: state.papers.filter((paper) => paper.paperId !== paperId) });
}

export async function updatePin(userId: UserId, pin: string | null): Promise<void> {
  if (window.rvunlAPI) return window.rvunlAPI.setPin(userId, pin);
  const state = browserLoad();
  const key = `rvunl-pin-${userId}`;
  if (pin === null) localStorage.removeItem(key);
  else localStorage.setItem(key, pin);
  browserSave({ ...state, profiles: state.profiles.map((profile) => profile.id === userId ? { ...profile, pinConfigured: pin !== null } : profile) });
}

export async function checkPin(userId: UserId, pin: string): Promise<boolean> {
  if (window.rvunlAPI) return window.rvunlAPI.verifyPin(userId, pin);
  return localStorage.getItem(`rvunl-pin-${userId}`) === pin;
}
