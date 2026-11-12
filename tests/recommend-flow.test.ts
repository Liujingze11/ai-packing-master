import { describe, expect, it } from 'vitest';
import { runRecommendation, type RecommendApi } from '../src/lib/recommend-flow';
import type { BoxType, Dataset, Item, Settings } from '../src/lib/types';

const A001: Item = { id: 'A001', length: 100, width: 50, height: 30, weight: 2.0, material: '铝合金' };
const HUGE: Item = { id: 'X999', length: 500, width: 500, height: 500, weight: 1, material: '钢' };
const B01: BoxType = { id: 'B01', innerLength: 300, innerWidth: 200, innerHeight: 150, maxLoad: 20 };
const B02: BoxType = { id: 'B02', innerLength: 400, innerWidth: 300, innerHeight: 250, maxLoad: 50 };

const dataset: Dataset = {
  items: [A001, HUGE],
  boxes: [B01, B02],
  history: [
    { planId: 'H001', itemId: 'A001', quantity: 200, boxId: 'B02', note: '标准装箱' },
    { planId: 'H002', itemId: 'A001', quantity: 150, boxId: 'B02', note: '出口订单' },
  ],
};

const mockSettings: Settings = {
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  margin: 0.8,
  mockMode: true,
};

const unusedApi: RecommendApi = {
  recommend: () => Promise.reject(new Error('mock 模式不应调用 API')),
};

describe('runRecommendation', () => {
  it('mock 模式：A001+200 → B02、每箱 20、共 10 箱，布局 20 个位置', async () => {
    const out = await runRecommendation(dataset, 'A001', 200, mockSettings, unusedApi);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result.recommendation.boxId).toBe('B02');
      expect(out.result.recommendation.perBoxCount).toBe(20);
      expect(out.result.recommendation.totalBoxes).toBe(10);
      expect(out.result.layout.positions).toHaveLength(20);
    }
  });

  it('零件号未命中 → 「未找到该零件号」', async () => {
    const out = await runRecommendation(dataset, 'ZZZ', 10, mockSettings, unusedApi);
    expect(out).toEqual({ ok: false, error: { kind: 'not_found', message: '未找到该零件号' } });
  });

  it('无可用箱型 → 「无可用箱型」', async () => {
    const noBox: Dataset = { ...dataset, boxes: [B01] };
    const out = await runRecommendation(noBox, 'X999', 10, mockSettings, unusedApi);
    expect(out).toEqual({ ok: false, error: { kind: 'no_box', message: '无可用箱型' } });
  });

  it('真实模式：走 api.recommend 并解析返回 JSON', async () => {
    const api: RecommendApi = {
      recommend: () =>
        Promise.resolve(
          '{"推荐箱型": "B01", "推荐理由": "体积紧凑", "每箱数量": 8, "策略建议": "加隔板"}',
        ),
    };
    const out = await runRecommendation(
      dataset,
      'A001',
      100,
      { ...mockSettings, mockMode: false },
      api,
    );
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result.recommendation).toEqual({
        boxId: 'B01',
        reason: '体积紧凑',
        perBoxCount: 8,
        strategy: '加隔板',
        totalBoxes: 13,
      });
    }
  });

  it('真实模式：API 报错转为 llm 错误', async () => {
    const api: RecommendApi = {
      recommend: () => Promise.reject(new Error('LLM 请求失败：HTTP 500')),
    };
    const out = await runRecommendation(
      dataset,
      'A001',
      100,
      { ...mockSettings, mockMode: false },
      api,
    );
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error.kind).toBe('llm');
      expect(out.error.message).toContain('HTTP 500');
    }
  });
});
