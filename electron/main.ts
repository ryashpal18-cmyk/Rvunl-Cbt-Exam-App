import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { addProfile, changeAdminPin, createBackup, deletePapers, deleteProfile, publicState, resetAttempts, restoreBackup, saveAttempt, savePapers, setPin, verifyAdminPin, verifyPin } from './db';

let mainWindow: BrowserWindow | null = null;

function sendUpdateStatus(status: Record<string, unknown>): void {
  mainWindow?.webContents.send('update:status', status);
}

function configureAutoUpdater(): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.on('checking-for-update', () => sendUpdateStatus({ state: 'checking', message: 'Checking for a new version…' }));
  autoUpdater.on('update-available', (info) => sendUpdateStatus({ state: 'available', message: `Version ${info.version} is available.`, version: info.version }));
  autoUpdater.on('update-not-available', (info) => sendUpdateStatus({ state: 'not-available', message: 'You already have the latest version.', version: info.version }));
  autoUpdater.on('download-progress', (progress) => sendUpdateStatus({ state: 'downloading', message: `Downloading update… ${Math.round(progress.percent)}%`, percent: progress.percent }));
  autoUpdater.on('update-downloaded', (info) => sendUpdateStatus({ state: 'downloaded', message: `Version ${info.version} is ready to install.`, version: info.version }));
  autoUpdater.on('error', (error) => sendUpdateStatus({ state: 'error', message: error.message || 'Update check failed.' }));
}

function validateBackupExtras(value: unknown): asserts value is string[] {
  if (!Array.isArray(value)) throw new Error('Invalid profile extras in backup.');
  const ids = new Set<string>();
  for (const raw of value) {
    if (typeof raw !== 'string') throw new Error('Invalid profile extras in backup.');
    const extra = JSON.parse(raw);
    if (typeof extra?.userId !== 'string' || ids.has(extra.userId) ||
        !Array.isArray(extra.bookmarks) || !Array.isArray(extra.typingAttempts)) {
      throw new Error('Invalid or duplicate profile extras in backup.');
    }
    ids.add(extra.userId);
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#f3f6fa',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });

  const developmentUrl = process.env.VITE_DEV_SERVER_URL;
  if (developmentUrl) void mainWindow.loadURL(developmentUrl);
  else void mainWindow.loadFile(join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  configureAutoUpdater();
  ipcMain.handle('storage:load', () => publicState());
  ipcMain.handle('attempt:save', (_event, attempt) => saveAttempt(attempt));
  ipcMain.handle('profile:set-pin', (_event, userId, pin) => setPin(userId, pin));
  ipcMain.handle('profile:verify-pin', (_event, userId, pin) => verifyPin(userId, pin));

  ipcMain.handle('admin:verify-pin', (_event, pin) => verifyAdminPin(pin));
  ipcMain.handle('admin:change-pin', (_event, currentPin, newPin) => changeAdminPin(currentPin, newPin));
  ipcMain.handle('admin:papers-save', (_event, papers, pin) => savePapers(papers, pin));
  ipcMain.handle('admin:papers-delete', (_event, paperIds, pin) => deletePapers(paperIds, pin));
  ipcMain.handle('admin:attempts-reset', (_event, target, pin) => resetAttempts(target, pin));
  ipcMain.handle('admin:profile-add', (_event, name, pin) => addProfile(name, pin));
  ipcMain.handle('admin:profile-delete', (_event, userId, pin) => deleteProfile(userId, pin));
  ipcMain.handle('admin:backup-export', async (_event, pin, extras: string[]) => {
    const backup = createBackup(pin);
    validateBackupExtras(extras);
    const result = await dialog.showSaveDialog(mainWindow!, { title: 'Save RVUNL CBT backup', defaultPath: `rvunl-cbt-backup-${new Date().toISOString().slice(0, 10)}.json`, filters: [{ name: 'RVUNL Backup', extensions: ['json'] }] });
    if (result.canceled || !result.filePath) return false;
    writeFileSync(result.filePath, JSON.stringify({ ...backup, extras }, null, 2), 'utf8');
    return true;
  });
  ipcMain.handle('admin:backup-import', async (_event, pin) => {
    if (!verifyAdminPin(pin)) throw new Error('Incorrect admin PIN.');
    const result = await dialog.showOpenDialog(mainWindow!, { title: 'Restore RVUNL CBT backup', properties: ['openFile'], filters: [{ name: 'RVUNL Backup', extensions: ['json'] }] });
    if (result.canceled || !result.filePaths[0]) return null;
    const value = JSON.parse(readFileSync(result.filePaths[0], 'utf8')) as unknown;
    const extras = (value as { extras?: unknown } | null)?.extras;
    if (extras !== undefined) validateBackupExtras(extras);
    restoreBackup(value, pin);
    return { state: publicState(), extras };
  });
  ipcMain.handle('admin:file-save', async (_event, fileName, data, kind, pin) => {
    if (!verifyAdminPin(pin)) throw new Error('Incorrect admin PIN.');
    if (typeof fileName !== 'string' || !Array.isArray(data) || (kind !== 'csv' && kind !== 'pdf')) throw new Error('Invalid export request.');
    const extension = kind === 'pdf' ? 'pdf' : 'csv';
    const result = await dialog.showSaveDialog(mainWindow!, { title: `Save ${extension.toUpperCase()} report`, defaultPath: basename(fileName), filters: [{ name: extension.toUpperCase(), extensions: [extension] }] });
    if (result.canceled || !result.filePath) return false;
    writeFileSync(result.filePath, Buffer.from(data));
    return true;
  });

  ipcMain.handle('app:get-version', () => app.getVersion());
  ipcMain.handle('update:check', async () => {
    if (!app.isPackaged || process.platform !== 'win32' || process.env.PORTABLE_EXECUTABLE_FILE) {
      sendUpdateStatus({ state: 'not-available', message: 'Update checks are available in the installed Windows app.', version: app.getVersion() });
      return;
    }
    await autoUpdater.checkForUpdates();
  });
  ipcMain.handle('update:download', () => autoUpdater.downloadUpdate());
  ipcMain.handle('update:install', () => autoUpdater.quitAndInstall(false, true));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
