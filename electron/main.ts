import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'node:path';
import { deletePapers, publicState, resetAttempts, saveAttempt, savePapers, setPin, verifyAdminPin, verifyPin } from './db';

let mainWindow: BrowserWindow | null = null;

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
  if (developmentUrl) {
    void mainWindow.loadURL(developmentUrl);
  } else {
    void mainWindow.loadFile(join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  ipcMain.handle('storage:load', () => publicState());
  ipcMain.handle('attempt:save', (_event, attempt) => saveAttempt(attempt));
  ipcMain.handle('admin:verify-pin', (_event, pin) => verifyAdminPin(pin));
  ipcMain.handle('admin:papers-save', (_event, papers, pin) => savePapers(papers, pin));
  ipcMain.handle('admin:papers-delete', (_event, paperIds, pin) => deletePapers(paperIds, pin));
  ipcMain.handle('admin:attempts-reset', (_event, target, pin) => resetAttempts(target, pin));
  ipcMain.handle('profile:set-pin', (_event, userId, pin) => setPin(userId, pin));
  ipcMain.handle('profile:verify-pin', (_event, userId, pin) => verifyPin(userId, pin));
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
