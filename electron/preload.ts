import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('rvunlAPI', {
  loadState: () => ipcRenderer.invoke('storage:load'),
  saveAttempt: (attempt: unknown) => ipcRenderer.invoke('attempt:save', attempt),
  savePaper: (paper: unknown) => ipcRenderer.invoke('paper:save', paper),
  deletePaper: (paperId: string) => ipcRenderer.invoke('paper:delete', paperId),
  setPin: (userId: string, pin: string | null) => ipcRenderer.invoke('profile:set-pin', userId, pin),
  verifyPin: (userId: string, pin: string) => ipcRenderer.invoke('profile:verify-pin', userId, pin),
});
