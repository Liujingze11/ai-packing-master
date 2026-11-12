import { dialog } from 'electron';
import { readFileSync } from 'node:fs';
import { parseBoxes, parseHistory, parseItems } from '../src/lib/csv';
import type { Dataset } from '../src/lib/types';

type Kind = 'items' | 'boxes' | 'history';

function classify(text: string): Kind | null {
  const head = text.split(/\r?\n/, 1)[0] ?? '';
  if (head.includes('方案ID')) return 'history';
  if (head.includes('箱型') && head.includes('内部长度(mm)')) return 'boxes';
  if (head.includes('零件号') && head.includes('长度(mm)')) return 'items';
  return null;
}

/** 多选 3 个 CSV（零件/箱型/历史），按表头识别；取消或选错返回 null */
export async function importCsvDialog(): Promise<Dataset | null> {
  const result = await dialog.showOpenDialog({
    title: '选择 CSV 三件套（零件表 / 箱型表 / 历史方案表）',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (result.canceled || result.filePaths.length !== 3) return null;
  const parsed: Partial<Dataset> = {};
  for (const p of result.filePaths) {
    const text = readFileSync(p, 'utf-8');
    const kind = classify(text);
    if (kind === 'items' && !parsed.items) parsed.items = parseItems(text);
    else if (kind === 'boxes' && !parsed.boxes) parsed.boxes = parseBoxes(text);
    else if (kind === 'history' && !parsed.history) parsed.history = parseHistory(text);
    else return null;
  }
  if (!parsed.items || !parsed.boxes || !parsed.history) return null;
  return parsed as Dataset;
}
