import { describe, expect, it } from 'vitest';
import {
  legendNames,
  planMixedPacking,
  simulateMixedFill,
  type MixedOrderLine,
} from '../src/lib/packing-mixed';
import type { BoxSpec, Part } from '../src/lib/types';

const A001: Part = { id: 'A001', name: '齿轮箱', length: 100, width: 50, height: 30, weight: 2, material: '铝合金' };
const A005: Part = { id: 'A005', name: '垫片', length: 40, width: 40, height: 5, weight: 0.05, material: '不锈钢' };
const HUGE: Part = { id: 'X9', name: '巨件', length: 500, width: 500, height: 500, weight: 1, material: '钢' };
const B02: BoxSpec = { id: 'B02', name: '中箱', innerLength: 400, innerWidth: 300, innerHeight: 250, maxLoad: 50, material: '塑料箱' };

const order: MixedOrderLine[] = [
  { part: A001, quantity: 10 },
  { part: A005, quantity: 100 },
];

describe('simulateMixedFill', () => {
  it('A001×10 + A005×100 单箱全装下，A005 叠在 A001 层之上', () => {
    const fill = simulateMixedFill(order, B02, 0.8);
    expect(fill.placed).toEqual([
      { partId: 'A001', count: 10 },
      { partId: 'A005', count: 100 },
    ]);
    expect(fill.layout.items).toHaveLength(110);
    const a005Ys = fill.layout.items
      .filter((it) => it.colorIndex === 1)
      .map((it) => it.position[1]);
    expect(Math.min(...a005Ys)).toBeGreaterThanOrEqual(30);
    expect(fill.layout.boxSize).toEqual([400, 250, 300]);
  });

  it('重量预算限制单箱数量（A001×40 → 每箱 20，margin 0.8 → 40kg 预算）', () => {
    const fill = simulateMixedFill([{ part: A001, quantity: 40 }], B02, 0.8);
    expect(fill.placed).toEqual([{ partId: 'A001', count: 20 }]);
  });
});

describe('planMixedPacking', () => {
  it('单箱混装订单 → totalBoxes 1，firstBox 含名称', () => {
    const plan = planMixedPacking(order, B02, 0.8);
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.totalBoxes).toBe(1);
      expect(plan.firstBox.placed).toEqual([
        { partId: 'A001', name: '齿轮箱', count: 10 },
        { partId: 'A005', name: '垫片', count: 100 },
      ]);
    }
  });

  it('重量受限多箱：A001×40 → 2 箱', () => {
    const plan = planMixedPacking([{ part: A001, quantity: 40 }], B02, 0.8);
    expect(plan.ok && plan.totalBoxes).toBe(2);
  });

  it('单项超箱 → item_too_big，不死循环', () => {
    const plan = planMixedPacking([{ part: HUGE, quantity: 5 }], B02, 0.8);
    expect(plan.ok).toBe(false);
    if (!plan.ok) {
      expect(plan.kind).toBe('item_too_big');
      expect(plan.message).toContain('巨件');
    }
  });

  it('混合订单夹带超箱零件 → item_too_big（推进保护）', () => {
    const plan = planMixedPacking(
      [
        { part: A001, quantity: 5 },
        { part: HUGE, quantity: 1 },
      ],
      B02,
      0.8,
    );
    expect(plan.ok).toBe(false);
  });

  it('空订单 → empty_order', () => {
    const plan = planMixedPacking([], B02, 0.8);
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.kind).toBe('empty_order');
  });

  it('图例名按 colorIndex 对齐（乱序订单：小件在前）', () => {
    const shuffled: MixedOrderLine[] = [
      { part: A005, quantity: 100 },
      { part: A001, quantity: 10 },
    ];
    const plan = planMixedPacking(shuffled, B02, 0.8);
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      const names = legendNames(shuffled, plan.firstBox.layout);
      // 数组下标 = colorIndex = 订单下标：A005→0、A001→1
      expect(names[0]).toBe('垫片');
      expect(names[1]).toBe('齿轮箱');
      const a001 = plan.firstBox.layout.items.find((i) => i.colorIndex === 1);
      expect(a001).toBeDefined();
    }
  });
});
