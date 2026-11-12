import type { Item } from './types';

export type ParseQuantityResult = { ok: true; value: number } | { ok: false; error: string };

/** 数量必须为正整数且 ≤ 999 */
export function parseQuantity(raw: string): ParseQuantityResult {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return { ok: false, error: '数量必须为正整数' };
  const value = Number(text);
  if (value < 1) return { ok: false, error: '数量必须为正整数' };
  if (value > 999) return { ok: false, error: '数量不能超过 999' };
  return { ok: true, value };
}

export function findItem(items: Item[], id: string): Item | null {
  const key = id.trim();
  return items.find((i) => i.id === key) ?? null;
}
