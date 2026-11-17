import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('rvunlAPI', {
  loadState: () => ipcRenderer.invoke('storage:load'),
  saveAttempt: (attempt: unknown) => ipcRenderer.invoke('attempt:save', attempt),
  setPin: (userId: string, pin: string | null) => ipcRenderer.invoke('profile:set-pin', userId, pin),
  verifyPin: (userId: string, pin: string) => ipcRenderer.invoke('profile:verify-pin', userId, pin),

  verifyAdminPin: (pin: string) => ipcRenderer.invoke('admin:verify-pin', pin),
  changeAdminPin: (currentPin: string, newPin: string) => ipcRenderer.invoke('admin:change-pin', currentPin, newPin),
  savePapers: (papers: unknown[], pin: string) => ipcRenderer.invoke('admin:papers-save', papers, pin),
  deletePapers: (paperIds: string[], pin: string) => ipcRenderer.invoke('admin:papers-delete', paperIds, pin),
  resetAttempts: (target: string, pin: string) => ipcRenderer.invoke('admin:attempts-reset', target, pin),
  addProfile: (name: string, pin: string) => ipcRenderer.invoke('admin:profile-add', name, pin),
  deleteProfile: (userId: string, pin: string) => ipcRenderer.invoke('admin:profile-delete', userId, pin),
  exportBackup: (pin: string, extras: string[]) => ipcRenderer.invoke('admin:backup-export', pin, extras),
  importBackup: (pin: string) => ipcRenderer.invoke('admin:backup-import', pin),
  saveExportFile: (fileName: string, data: number[], kind: 'csv' | 'pdf', pin: string) => ipcRenderer.invoke('admin:file-save', fileName, data, kind, pin),

  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateStatus: (callback: (status: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: unknown) => callback(status);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },
});
