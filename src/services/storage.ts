import { Attempt, Paper, StoredState, UserId } from '../types/exam';

const STORAGE_KEY = 'rvunl-cbt-browser-data';
const ADMIN_PIN_HASH = '3865e98e8d3fe3316c6b8cb24219bf0847bdd11b9f9b1940dda302111134c297';
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

async function verifyBrowserAdmin(pin: string): Promise<boolean> {
  if (!/^\d{4}$/.test(pin)) return false;
  const bytes = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return hash === ADMIN_PIN_HASH;
}

export async function loadState(): Promise<StoredState> {
  return window.rvunlAPI ? window.rvunlAPI.loadState() : browserLoad();
}

export async function persistAttempt(attempt: Attempt): Promise<void> {
  if (window.rvunlAPI) return window.rvunlAPI.saveAttempt(attempt);
  const state = browserLoad();
  browserSave({ ...state, attempts: [attempt, ...state.attempts.filter((item) => item.attemptId !== attempt.attemptId)] });
}

export async function checkAdminPin(pin: string): Promise<boolean> {
  return window.rvunlAPI ? window.rvunlAPI.verifyAdminPin(pin) : verifyBrowserAdmin(pin);
}

export async function persistPapers(papers: Paper[], adminPin: string): Promise<number> {
  if (window.rvunlAPI) return window.rvunlAPI.savePapers(papers, adminPin);
  if (!(await verifyBrowserAdmin(adminPin))) throw new Error('Incorrect admin PIN.');
  const state = browserLoad();
  const uniquePapers = Array.from(new Map(papers.map((paper) => [paper.paperId, paper])).values());
  const ids = new Set(uniquePapers.map((paper) => paper.paperId));
  browserSave({ ...state, papers: [...uniquePapers, ...state.papers.filter((paper) => !ids.has(paper.paperId))] });
  return uniquePapers.length;
}

export async function removePapers(paperIds: string[], adminPin: string): Promise<number> {
  if (window.rvunlAPI) return window.rvunlAPI.deletePapers(paperIds, adminPin);
  if (!(await verifyBrowserAdmin(adminPin))) throw new Error('Incorrect admin PIN.');
  const state = browserLoad();
  const ids = new Set(paperIds);
  const remaining = state.papers.filter((paper) => !ids.has(paper.paperId));
  browserSave({ ...state, papers: remaining });
  return state.papers.length - remaining.length;
}

export async function resetStoredAttempts(target: UserId | 'all', adminPin: string): Promise<number> {
  if (window.rvunlAPI) return window.rvunlAPI.resetAttempts(target, adminPin);
  if (!(await verifyBrowserAdmin(adminPin))) throw new Error('Incorrect admin PIN.');
  const state = browserLoad();
  const attempts = target === 'all' ? [] : state.attempts.filter((attempt) => attempt.userId !== target);
  browserSave({ ...state, attempts });
  return state.attempts.length - attempts.length;
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
