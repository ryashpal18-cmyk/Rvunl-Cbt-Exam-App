import type { Attempt, Paper, StoredState, UserId } from './types/exam';

declare global {
  interface Window {
    rvunlAPI?: {
      loadState: () => Promise<StoredState>;
      saveAttempt: (attempt: Attempt) => Promise<void>;
      verifyAdminPin: (pin: string) => Promise<boolean>;
      savePapers: (papers: Paper[], pin: string) => Promise<number>;
      deletePapers: (paperIds: string[], pin: string) => Promise<number>;
      resetAttempts: (target: UserId | 'all', pin: string) => Promise<number>;
      setPin: (userId: UserId, pin: string | null) => Promise<void>;
      verifyPin: (userId: UserId, pin: string) => Promise<boolean>;
    };
  }
}

export {};
