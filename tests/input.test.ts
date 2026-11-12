import { describe, expect, it } from 'vitest';
import { findItem, parseQuantity } from '../src/lib/input';
import type { Item } from '../src/lib/types';

const items: Item[] = [
  { id: 'A001', length: 100, width: 50, height: 30, weight: 2.0, material: '铝合金' },
  { id: 'A002', length: 200, width: 100, height: 80, weight: 5.5, material: '铸铁' },
];

describe('parseQuantity', () => {
  it('合法数量（含前后空格）', () => {
    expect(parseQuantity('200')).toEqual({ ok: true, value: 200 });
    expect(parseQuantity(' 200 ')).toEqual({ ok: true, value: 200 });
  });

  it('0/负数/小数/非数字/空 → 数量必须为正整数', () => {
    for (const bad of ['0', '-3', '3.5', 'abc', '']) {
      const r = parseQuantity(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe('数量必须为正整数');
    }
  });

  it('超过 999 拒绝', () => {
    expect(parseQuantity('1000')).toEqual({ ok: false, error: '数量不能超过 999' });
    expect(parseQuantity('999')).toEqual({ ok: true, value: 999 });
  });
});

describe('findItem', () => {
  it('命中返回零件，未命中返回 null', () => {
    expect(findItem(items, 'A001')?.id).toBe('A001');
    expect(findItem(items, ' A001 ')?.id).toBe('A001');
    expect(findItem(items, 'X999')).toBeNull();
  });
});
