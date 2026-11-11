/**
 * window.packingAPI 类型声明。
 * Task 1 为 stub 形态；Task 4/5 实现时收紧为精确签名（见台账 ruling）。
 */
export interface PackingAPIStub {
  recommend(payload: unknown): Promise<string>;
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
