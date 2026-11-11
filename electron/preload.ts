import { contextBridge, ipcRenderer } from 'electron';
import type { RecommendPayload } from './llm-client';
import type { Settings } from './settings';

const notImplemented =
  (name: string) =>
  (..._args: unknown[]): Promise<never> =>
    Promise.reject(new Error(`${name} 尚未实现`));

contextBridge.exposeInMainWorld('packingAPI', {
  recommend: (payload: RecommendPayload): Promise<string> =>
    ipcRenderer.invoke('llm:recommend', payload),
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  setSettings: (s: Settings): Promise<void> => ipcRenderer.invoke('settings:set', s),
  importCsv: notImplemented('importCsv'),
});
