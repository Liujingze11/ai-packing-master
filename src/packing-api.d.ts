/**
 * window.packingAPI 类型声明。
 * recommend（Task 4）、getSettings/setSettings（Task 5）已收紧；importCsv 在 Task 6 收紧。
 */
import type { BoxType, HistoryRecord, Item, Settings } from './lib/types';

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
  importCsv(): Promise<unknown>;
}

declare global {
  interface Window {
    packingAPI: PackingAPIStub;
  }
}

export {};
