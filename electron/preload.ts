import { contextBridge, ipcRenderer } from 'electron';
import type { RecommendPayload } from './llm-client';

const notImplemented =
  (name: string) =>
  (..._args: unknown[]): Promise<never> =>
    Promise.reject(new Error(`${name} 尚未实现`));

contextBridge.exposeInMainWorld('packingAPI', {
  recommend: (payload: RecommendPayload): Promise<string> =>
    ipcRenderer.invoke('llm:recommend', payload),
  getSettings: notImplemented('getSettings'),
  setSettings: notImplemented('setSettings'),
  importCsv: notImplemented('importCsv'),
});
