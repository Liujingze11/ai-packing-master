import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { recommendHandler, type RecommendPayload } from './llm-client';

function createWindow(): void {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'AI 装箱引擎',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  void win.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
}

ipcMain.handle('llm:recommend', (_event, payload: RecommendPayload) =>
  recommendHandler(payload),
);

void app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
