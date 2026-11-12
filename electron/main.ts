import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { importCsvDialog } from './import-csv';
import { recommendHandler, setLlmConfigProvider, type RecommendPayload } from './llm-client';
import { loadSettings, mergeSettings, saveSettings, type Settings } from './settings';

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

ipcMain.handle('settings:get', () => loadSettings(app.getPath('userData')));

ipcMain.handle('settings:set', (_event, s: Settings) => {
  saveSettings(app.getPath('userData'), mergeSettings(s));
});

ipcMain.handle('import:csv', () => importCsvDialog());

setLlmConfigProvider(() => {
  const s = loadSettings(app.getPath('userData'));
  return { apiKey: s.apiKey, baseUrl: s.baseUrl, model: s.model };
});

void app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
