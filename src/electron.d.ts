import type { Attempt, Paper, StoredState, UserId } from './types/exam';

declare global {
  interface Window {
    rvunlAPI?: {
      loadState: () => Promise<StoredState>;
      saveAttempt: (attempt: Attempt) => Promise<void>;
      savePaper: (paper: Paper) => Promise<void>;
      deletePaper: (paperId: string) => Promise<void>;
      setPin: (userId: UserId, pin: string | null) => Promise<void>;
      verifyPin: (userId: UserId, pin: string) => Promise<boolean>;
    };
  }
}

export {};
