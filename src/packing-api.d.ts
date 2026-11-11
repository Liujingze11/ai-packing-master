/**
 * window.packingAPI 类型声明。
 * recommend 已收紧（Task 4）；getSettings/setSettings/importCsv 在 Task 5/6 收紧。
 */
import type { BoxType, HistoryRecord, Item } from './lib/types';

export interface RecommendPayload {
  item: Item;
  quantity: number;
  candidates: { box: BoxType; maxPerBox: number }[];
  history: HistoryRecord[];
}

export interface PackingAPIStub {
  recommend(payload: RecommendPayload): Promise<string>;
  getSettings(): Promise<unknown>;
  setSettings(settings: unknown): Promise<void>;
  importCsv(): Promise<unknown>;
}

declare global {
  interface Window {
    packingAPI: PackingAPIStub;
  }
}

export {};
