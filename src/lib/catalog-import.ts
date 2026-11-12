import { CsvParseError, parseBoxes, parseItems } from './csv';
import type { BoxSpec, Part } from './types';

export type ImportCatalogResult =
  | { ok: true; parts: Part[]; boxes: BoxSpec[] }
  | { ok: false; error: string };

type Kind = 'items' | 'boxes' | 'history';

function classify(text: string): Kind | null {
  const head = text.split(/\r?\n/, 1)[0] ?? '';
  if (head.includes('方案ID')) return 'history';
  if (head.includes('箱型') && head.includes('内部长度(mm)')) return 'boxes';
  if (head.includes('零件号') && head.includes('长度(mm)')) return 'items';
  return null;
}

export function itemToPart(it: {
  id: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  material: string;
}): Part {
  return { id: it.id, name: it.id, length: it.length, width: it.width, height: it.height, weight: it.weight, material: it.material };
}

export function boxToBoxSpec(b: {
  id: string;
  innerLength: number;
  innerWidth: number;
  innerHeight: number;
  maxLoad: number;
}): BoxSpec {
  return { id: b.id, name: b.id, innerLength: b.innerLength, innerWidth: b.innerWidth, innerHeight: b.innerHeight, maxLoad: b.maxLoad };
}

/**
 * 从若干 CSV 文本收集目录（零件表 + 箱型表必需；历史表可选并忽略）。
 * 坏 CSV / 无法识别的文件 / 缺表 → 中文错误，绝不静默失败。
 */
export function collectCatalogFromCsvs(texts: string[]): ImportCatalogResult {
  let parts: Part[] | null = null;
  let boxes: BoxSpec[] | null = null;
  try {
    for (const t of texts) {
      const kind = classify(t);
      if (kind === 'history') continue;
      if (kind === 'items' && !parts) {
        parts = parseItems(t).map(itemToPart);
      } else if (kind === 'boxes' && !boxes) {
        boxes = parseBoxes(t).map(boxToBoxSpec);
      } else if (kind === null) {
        return { ok: false, error: '无法识别的 CSV 文件（需要零件表或箱型表，表头见 README）' };
      } else {
        return { ok: false, error: '重复的零件表/箱型表文件' };
      }
    }
  } catch (e) {
    return { ok: false, error: e instanceof CsvParseError ? e.message : String(e) };
  }
  if (!parts || !boxes) {
    return { ok: false, error: '需要同时提供零件表和箱型表（历史表可选，将被忽略）' };
  }
  return { ok: true, parts, boxes };
}
