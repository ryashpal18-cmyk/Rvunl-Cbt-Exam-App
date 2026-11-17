import type { Attempt, Paper, ProfileRecord, StoredState, UpdateStatus, UserId } from './types/exam';

declare global {
  interface Window {
    rvunlAPI?: {
      loadState: () => Promise<StoredState>;
      saveAttempt: (attempt: Attempt) => Promise<void>;
      setPin: (userId: UserId, pin: string | null) => Promise<void>;
      verifyPin: (userId: UserId, pin: string) => Promise<boolean>;

      verifyAdminPin: (pin: string) => Promise<boolean>;
      changeAdminPin: (currentPin: string, newPin: string) => Promise<void>;
      savePapers: (papers: Paper[], pin: string) => Promise<number>;
      deletePapers: (paperIds: string[], pin: string) => Promise<number>;
      resetAttempts: (target: UserId | 'all', pin: string) => Promise<number>;
      addProfile: (name: string, pin: string) => Promise<ProfileRecord>;
      deleteProfile: (userId: UserId, pin: string) => Promise<number>;
      exportBackup: (pin: string, extras: string[]) => Promise<boolean>;
      importBackup: (pin: string) => Promise<{ state: StoredState; extras?: string[] } | null>;
      saveExportFile: (fileName: string, data: number[], kind: 'csv' | 'pdf', pin: string) => Promise<boolean>;

      getAppVersion: () => Promise<string>;
      checkForUpdates: () => Promise<void>;
      downloadUpdate: () => Promise<void>;
      installUpdate: () => Promise<void>;
      onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;
    };
  }
}

export {};
