import { describe, expect, it } from 'vitest';
import {
  computeLayout,
  filterCandidates,
  gridCapacity,
  maxPerBox,
  totalBoxes,
} from '../src/lib/packing';
import type { BoxType, Item } from '../src/lib/types';

const A001: Item = { id: 'A001', length: 100, width: 50, height: 30, weight: 2.0, material: '铝合金' };
const B01: BoxType = { id: 'B01', innerLength: 300, innerWidth: 200, innerHeight: 150, maxLoad: 20 };
const B02: BoxType = { id: 'B02', innerLength: 400, innerWidth: 300, innerHeight: 250, maxLoad: 50 };
const HUGE: Item = { id: 'X999', length: 500, width: 500, height: 500, weight: 1, material: '钢' };

describe('gridCapacity', () => {
  it('A001 进 B02：4×6×8=192', () => {
    expect(gridCapacity(A001, B02)).toBe(192);
  });

  it('任一方向放不进则为 0', () => {
    expect(gridCapacity(HUGE, B02)).toBe(0);
    expect(gridCapacity(A001, { ...B02, innerWidth: 40 })).toBe(0);
  });
});

describe('maxPerBox（margin=0.8）', () => {
  it('A001 进 B02：min(grid=192, volCap=160, wtCap=20) = 20（重量受限）', () => {
    expect(maxPerBox(A001, B02, 0.8)).toBe(20);
  });

  it('A001 进 B01：min(grid=60, volCap=48, wtCap=8) = 8', () => {
    expect(maxPerBox(A001, B01, 0.8)).toBe(8);
  });
});

describe('filterCandidates', () => {
  it('超大件无候选箱型时返回空数组', () => {
    expect(filterCandidates(HUGE, [B01, B02], 0.8)).toEqual([]);
  });

  it('A001 的候选含 B01、B02 及其每箱上限', () => {
    const candidates = filterCandidates(A001, [B01, B02], 0.8);
    expect(candidates).toEqual([
      { box: B01, maxPerBox: 8 },
      { box: B02, maxPerBox: 20 },
    ]);
  });
});

describe('totalBoxes', () => {
  it('200 件、每箱 20 → 10 箱', () => {
    expect(totalBoxes(200, 20)).toBe(10);
  });

  it('不足一箱也算一箱', () => {
    expect(totalBoxes(5, 20)).toBe(1);
  });
});

describe('computeLayout', () => {
  it('A001 进 B02 装 20 件：坐标中心、填充顺序 k 层→j 排→i 列', () => {
    const layout = computeLayout(A001, B02, 20);
    expect(layout.positions).toHaveLength(20);
    expect(layout.boxSize).toEqual([400, 250, 300]);
    expect(layout.itemSize).toEqual([100, 30, 50]);
    expect(layout.positions[0]).toEqual([-150, 15, -125]);
    expect(layout.positions[1]).toEqual([-50, 15, -125]); // 沿 x 推进
    expect(layout.positions[4]).toEqual([-150, 15, -75]); // 换 z 排
    // 每层 4×6=24 个位置，20 件全在第一层
    expect(new Set(layout.positions.map((p) => p[1]))).toEqual(new Set([15]));
  });
});
