import { describe, expect, it } from 'vitest';
import { adjustLine } from '../src/lib/cart';
import type { CartLine } from '../src/lib/types';

const lines: CartLine[] = [
  { partId: 'A001', quantity: 2 },
  { partId: 'A005', quantity: 1 },
];

describe('adjustLine', () => {
  it('+1 增加数量', () => {
    expect(adjustLine(lines, 'A001', 1)).toEqual([
      { partId: 'A001', quantity: 3 },
      { partId: 'A005', quantity: 1 },
    ]);
  });

  it('−1 到 0 删除该行', () => {
    expect(adjustLine(lines, 'A005', -1)).toEqual([{ partId: 'A001', quantity: 2 }]);
  });

  it('数量封顶 999', () => {
    expect(adjustLine([{ partId: 'A001', quantity: 999 }], 'A001', 1)).toEqual([
      { partId: 'A001', quantity: 999 },
    ]);
  });

  it('新零件 +1 追加一行', () => {
    expect(adjustLine(lines, 'A002', 1)).toEqual([
      { partId: 'A001', quantity: 2 },
      { partId: 'A005', quantity: 1 },
      { partId: 'A002', quantity: 1 },
    ]);
  });

  it('−1 对不存在的行无副作用', () => {
    expect(adjustLine(lines, 'ZZZ', -1)).toEqual(lines);
  });
});
