import { clearExamDraft, exportUserExtrasJson, importUserExtrasJson } from './userExtras';
import { Attempt, Paper, ProfileRecord, StoredState, UserId } from '../types/exam';

const STORAGE_KEY = 'rvunl-cbt-browser-data';
const ADMIN_PIN_KEY = 'rvunl-admin-pin-hash';
const DEFAULT_ADMIN_PIN_HASH = '3865e98e8d3fe3316c6b8cb24219bf0847bdd11b9f9b1940dda302111134c297';
const defaultState = (): StoredState => ({
  profiles: [
    { id: 'monika', name: 'Monika', pinConfigured: false, builtIn: true },
    { id: 'shivani', name: 'Shivani', pinConfigured: false, builtIn: true },
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

async function pinHash(pin: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function verifyBrowserAdmin(pin: string): Promise<boolean> {
  if (!/^\d{4}$/.test(pin)) return false;
  return await pinHash(pin) === (localStorage.getItem(ADMIN_PIN_KEY) ?? DEFAULT_ADMIN_PIN_HASH);
}

function downloadBrowserFile(fileName: string, data: Uint8Array, type: string): void {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = fileName; link.click();
  URL.revokeObjectURL(url);
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

export async function updateAdminPin(currentPin: string, newPin: string): Promise<void> {
  if (window.rvunlAPI) return window.rvunlAPI.changeAdminPin(currentPin, newPin);
  if (!(await verifyBrowserAdmin(currentPin))) throw new Error('Incorrect admin PIN.');
  localStorage.setItem(ADMIN_PIN_KEY, await pinHash(newPin));
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

export async function createProfile(name: string, adminPin: string): Promise<ProfileRecord> {
  if (window.rvunlAPI) return window.rvunlAPI.addProfile(name, adminPin);
  if (!(await verifyBrowserAdmin(adminPin))) throw new Error('Incorrect admin PIN.');
  const state = browserLoad();
  if (state.profiles.some((profile) => profile.name.toLowerCase() === name.trim().toLowerCase())) throw new Error('A profile with this name already exists.');
  const profile = { id: `student-${crypto.randomUUID().slice(0, 8)}`, name: name.trim(), pinConfigured: false, builtIn: false };
  browserSave({ ...state, profiles: [...state.profiles, profile] });
  return profile;
}

export async function removeProfile(userId: UserId, adminPin: string): Promise<number> {
  if (window.rvunlAPI) return window.rvunlAPI.deleteProfile(userId, adminPin);
  if (!(await verifyBrowserAdmin(adminPin))) throw new Error('Incorrect admin PIN.');
  const state = browserLoad();
  const profile = state.profiles.find((item) => item.id === userId);
  if (!profile || profile.builtIn) throw new Error('This profile cannot be deleted.');
  const count = state.attempts.filter((attempt) => attempt.userId === userId).length;
  browserSave({ ...state, profiles: state.profiles.filter((item) => item.id !== userId), attempts: state.attempts.filter((attempt) => attempt.userId !== userId) });
  return count;
}

export async function exportBackup(adminPin: string): Promise<boolean> {
  if (window.rvunlAPI) {
    const { profiles } = await window.rvunlAPI.loadState();
    return window.rvunlAPI.exportBackup(adminPin, profiles.map(({ id }) => exportUserExtrasJson(id)));
  }
  if (!(await verifyBrowserAdmin(adminPin))) throw new Error('Incorrect admin PIN.');
  const data = new TextEncoder().encode(JSON.stringify({ format: 'rvunl-cbt-backup', version: 1, exportedAt: new Date().toISOString(), ...browserLoad(), pins: {}, extras: browserLoad().profiles.map(({ id }) => exportUserExtrasJson(id)) }, null, 2));
  downloadBrowserFile(`rvunl-cbt-backup-${new Date().toISOString().slice(0, 10)}.json`, data, 'application/json');
  return true;
}

export async function importBackup(adminPin: string): Promise<StoredState | null> {
  if (window.rvunlAPI) {
    const before = await window.rvunlAPI.loadState();
    const restored = await window.rvunlAPI.importBackup(adminPin);
    if (!restored) return null;
    for (const { id } of [...before.profiles, ...restored.state.profiles]) clearExamDraft(id);
    if (restored.extras) {
      const byUser = new Map(restored.extras.map((raw) => [JSON.parse(raw).userId, raw]));
      for (const { id } of restored.state.profiles) {
        importUserExtrasJson(id, byUser.get(id) ?? JSON.stringify({ userId: id, theme: 'light', bookmarks: [], typingAttempts: [] }));
      }
    }
    return restored.state;
  }
  throw new Error('Backup restore is available in the installed Windows app.');
}

export async function saveAdminExport(fileName: string, data: Uint8Array, kind: 'csv' | 'pdf', adminPin: string): Promise<boolean> {
  if (window.rvunlAPI) return window.rvunlAPI.saveExportFile(fileName, Array.from(data), kind, adminPin);
  if (!(await verifyBrowserAdmin(adminPin))) throw new Error('Incorrect admin PIN.');
  downloadBrowserFile(fileName, data, kind === 'pdf' ? 'application/pdf' : 'text/csv');
  return true;
}

export async function updatePin(userId: UserId, pin: string | null): Promise<void> {
  if (window.rvunlAPI) return window.rvunlAPI.setPin(userId, pin);
  const state = browserLoad();
  const key = `rvunl-pin-${userId}`;
  if (pin === null) localStorage.removeItem(key);
  else localStorage.setItem(key, await pinHash(pin));
  browserSave({ ...state, profiles: state.profiles.map((profile) => profile.id === userId ? { ...profile, pinConfigured: pin !== null } : profile) });
}

export async function checkPin(userId: UserId, pin: string): Promise<boolean> {
  if (window.rvunlAPI) return window.rvunlAPI.verifyPin(userId, pin);
  const key = `rvunl-pin-${userId}`;
  const stored = localStorage.getItem(key);
  if (!stored || !/^\d{4}$/.test(pin)) return false;
  const hash = await pinHash(pin);
  if (stored === hash) return true;
  if (stored !== pin) return false;
  localStorage.setItem(key, hash);
  return true;
}


export async function saveProfileExport(data: Uint8Array, fileName: string): Promise<void> {
  downloadBrowserFile(fileName, data, 'application/json');
}
