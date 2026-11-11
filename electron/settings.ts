import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DEFAULT_SETTINGS, type Settings } from '../src/lib/types';

export { DEFAULT_SETTINGS };
export type { Settings };

const SETTINGS_FILE = 'settings.json';

/** 脏数据/缺字段回默认；margin 钳制到 [0.5, 1.0] */
export function mergeSettings(raw: unknown): Settings {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  let margin = DEFAULT_SETTINGS.margin;
  if (typeof r.margin === 'number' && Number.isFinite(r.margin)) {
    margin = Math.min(1.0, Math.max(0.5, r.margin));
  }
  return {
    apiKey: typeof r.apiKey === 'string' ? r.apiKey : DEFAULT_SETTINGS.apiKey,
    baseUrl: typeof r.baseUrl === 'string' ? r.baseUrl : DEFAULT_SETTINGS.baseUrl,
    model: typeof r.model === 'string' ? r.model : DEFAULT_SETTINGS.model,
    margin,
    mockMode: typeof r.mockMode === 'boolean' ? r.mockMode : DEFAULT_SETTINGS.mockMode,
  };
}

export function loadSettings(userDataPath: string): Settings {
  try {
    const text = readFileSync(path.join(userDataPath, SETTINGS_FILE), 'utf-8');
    return mergeSettings(JSON.parse(text));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(userDataPath: string, s: Settings): void {
  const merged = mergeSettings(s);
  writeFileSync(path.join(userDataPath, SETTINGS_FILE), JSON.stringify(merged, null, 2), 'utf-8');
}
