/**
 * window.packingAPI 类型声明（Task 4/5/6 已全部收紧）。
 */
import type { BoxType, Dataset, HistoryRecord, Item, Settings } from './lib/types';

export interface RecommendPayload {
  item: Item;
  quantity: number;
  candidates: { box: BoxType; maxPerBox: number }[];
  history: HistoryRecord[];
}

export interface PackingAPIStub {
  recommend(payload: RecommendPayload): Promise<string>;
  getSettings(): Promise<Settings>;
  setSettings(settings: Settings): Promise<void>;
  importCsv(): Promise<Dataset | null>;
}

declare global {
  interface Window {
    packingAPI: PackingAPIStub;
  }
}

export {};
