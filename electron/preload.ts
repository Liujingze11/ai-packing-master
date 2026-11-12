import { contextBridge, ipcRenderer } from 'electron';
import type { Dataset } from '../src/lib/types';
import type { RecommendPayload } from './llm-client';
import type { Settings } from './settings';

contextBridge.exposeInMainWorld('packingAPI', {
  recommend: (payload: RecommendPayload): Promise<string> =>
    ipcRenderer.invoke('llm:recommend', payload),
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  setSettings: (s: Settings): Promise<void> => ipcRenderer.invoke('settings:set', s),
  importCsv: (): Promise<Dataset | null> => ipcRenderer.invoke('import:csv'),
});
