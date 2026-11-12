import { contextBridge, ipcRenderer } from 'electron';
import type { ImportCatalogResult } from '../src/lib/catalog-import';
import type { Catalog } from '../src/lib/types';
import type { RecommendMixedPayload, RecommendPayload } from './llm-client';
import type { Settings } from './settings';

contextBridge.exposeInMainWorld('packingAPI', {
  recommend: (payload: RecommendPayload): Promise<string> =>
    ipcRenderer.invoke('llm:recommend', payload),
  recommendMixed: (payload: RecommendMixedPayload): Promise<string> =>
    ipcRenderer.invoke('llm:recommendMixed', payload),
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  setSettings: (s: Settings): Promise<void> => ipcRenderer.invoke('settings:set', s),
  importCsv: (): Promise<ImportCatalogResult | null> => ipcRenderer.invoke('import:csv'),
  getCatalog: (): Promise<Catalog> => ipcRenderer.invoke('catalog:get'),
  saveCatalog: (c: Catalog): Promise<void> => ipcRenderer.invoke('catalog:save', c),
});
