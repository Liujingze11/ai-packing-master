import { describe, expect, it } from 'vitest';
import { pickDefaultBox, runMixedRecommendation, type MixedApi } from '../src/lib/mixed-flow';
import type { MixedOrderLine } from '../src/lib/packing-mixed';
import type { BoxSpec, Part } from '../src/lib/types';

const A001: Part = { id: 'A001', name: '齿轮箱', length: 100, width: 50, height: 30, weight: 2, material: '铝合金' };
const A005: Part = { id: 'A005', name: '垫片', length: 40, width: 40, height: 5, weight: 0.05, material: '不锈钢' };
const HUGE: Part = { id: 'X9', name: '巨件', length: 500, width: 500, height: 500, weight: 1, material: '钢' };
const B01: BoxSpec = { id: 'B01', name: '小箱', innerLength: 300, innerWidth: 200, innerHeight: 150, maxLoad: 20, material: '纸箱' };
const B02: BoxSpec = { id: 'B02', name: '中箱', innerLength: 400, innerWidth: 300, innerHeight: 250, maxLoad: 50, material: '塑料箱' };

const mixedOrder: MixedOrderLine[] = [
  { part: A001, quantity: 10 },
  { part: A005, quantity: 100 },
];

const unusedApi: MixedApi = {
  recommendMixed: () => Promise.reject(new Error('mock 模式不应调用 API')),
};

describe('pickDefaultBox', () => {
  it('选 totalBoxes 最小的箱（B02 一箱 vs B01 两箱 → 中箱）', () => {
    expect(pickDefaultBox(mixedOrder, [B01, B02], 0.8)?.id).toBe('B02');
  });

  it('并列取体积更小的箱（都能一箱装下 → 小箱）', () => {
    expect(pickDefaultBox([{ part: A005, quantity: 10 }], [B02, B01], 0.8)?.id).toBe('B01');
  });

  it('全都装不进 → null', () => {
    expect(pickDefaultBox([{ part: HUGE, quantity: 1 }], [B01, B02], 0.8)).toBeNull();
  });
});

describe('runMixedRecommendation', () => {
  it('mock 全链路：未选箱自动挑箱，数字正确，留言进回复', async () => {
    const out = await runMixedRecommendation(
      {
        order: mixedOrder,
        box: null,
        boxes: [B01, B02],
        margin: 0.8,
        userMessage: '轻放',
        mockMode: true,
      },
      unusedApi,
    );
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result.boxName).toBe('中箱');
      expect(out.result.totalBoxes).toBe(1);
      expect(out.result.firstBox.placed).toEqual([
        { partId: 'A001', name: '齿轮箱', count: 10 },
        { partId: 'A005', name: '垫片', count: 100 },
      ]);
      expect(out.result.reply.strategy).toContain('轻放');
    }
  });

  it('指定箱子：按所选箱计算（小箱 → 2 箱）', async () => {
    const out = await runMixedRecommendation(
      {
        order: mixedOrder,
        box: B01,
        boxes: [B01, B02],
        margin: 0.8,
        userMessage: '',
        mockMode: true,
      },
      unusedApi,
    );
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result.boxName).toBe('小箱');
      expect(out.result.totalBoxes).toBe(2);
    }
  });

  it('真实模式：走 api.recommendMixed 并解析', async () => {
    const api: MixedApi = {
      recommendMixed: () =>
        Promise.resolve('{"推荐理由": "r", "策略建议": "s"}'),
    };
    const out = await runMixedRecommendation(
      {
        order: mixedOrder,
        box: B02,
        boxes: [B01, B02],
        margin: 0.8,
        userMessage: '',
        mockMode: false,
      },
      api,
    );
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.result.reply).toEqual({ reason: 'r', strategy: 's' });
  });

  it('api 报错 → {ok:false} 中文 message', async () => {
    const api: MixedApi = {
      recommendMixed: () => Promise.reject(new Error('LLM 请求失败：HTTP 500')),
    };
    const out = await runMixedRecommendation(
      {
        order: mixedOrder,
        box: B02,
        boxes: [B01, B02],
        margin: 0.8,
        userMessage: '',
        mockMode: false,
      },
      api,
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.message).toContain('HTTP 500');
  });

  it('选中的箱子装不进 → 报错信息来自算法', async () => {
    const out = await runMixedRecommendation(
      {
        order: [{ part: HUGE, quantity: 1 }],
        box: B02,
        boxes: [B01, B02],
        margin: 0.8,
        userMessage: '',
        mockMode: true,
      },
      unusedApi,
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.message).toContain('巨件');
  });

  it('LLM 坏 JSON → 回退默认文案，数字不受影响', async () => {
    const api: MixedApi = {
      recommendMixed: () => Promise.resolve('抱歉，我无法处理这个请求'),
    };
    const out = await runMixedRecommendation(
      {
        order: mixedOrder,
        box: B02,
        boxes: [B01, B02],
        margin: 0.8,
        userMessage: '轻放',
        mockMode: false,
      },
      api,
    );
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result.totalBoxes).toBe(1);
      expect(out.result.firstBox.placed).toHaveLength(2);
      expect(out.result.reply.reason).toContain('AI 文案');
      expect(out.result.reply.strategy).toContain('轻放');
    }
  });

  it('LLM 缺字段 → 空字段补默认文案', async () => {
    const api: MixedApi = {
      recommendMixed: () => Promise.resolve('{"推荐理由": "只写了理由"}'),
    };
    const out = await runMixedRecommendation(
      {
        order: mixedOrder,
        box: B02,
        boxes: [B01, B02],
        margin: 0.8,
        userMessage: '',
        mockMode: false,
      },
      api,
    );
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result.reply.reason).toBe('只写了理由');
      expect(out.result.reply.strategy).toContain('缓冲隔板');
    }
  });
});
