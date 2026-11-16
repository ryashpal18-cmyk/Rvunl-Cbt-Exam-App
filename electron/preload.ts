import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('rvunlAPI', {
  loadState: () => ipcRenderer.invoke('storage:load'),
  saveAttempt: (attempt: unknown) => ipcRenderer.invoke('attempt:save', attempt),
  verifyAdminPin: (pin: string) => ipcRenderer.invoke('admin:verify-pin', pin),
  savePapers: (papers: unknown[], pin: string) => ipcRenderer.invoke('admin:papers-save', papers, pin),
  deletePapers: (paperIds: string[], pin: string) => ipcRenderer.invoke('admin:papers-delete', paperIds, pin),
  resetAttempts: (target: string, pin: string) => ipcRenderer.invoke('admin:attempts-reset', target, pin),
  setPin: (userId: string, pin: string | null) => ipcRenderer.invoke('profile:set-pin', userId, pin),
  verifyPin: (userId: string, pin: string) => ipcRenderer.invoke('profile:verify-pin', userId, pin),
});
