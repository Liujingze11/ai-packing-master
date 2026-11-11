import { describe, expect, it } from 'vitest';
import {
  buildPrompt,
  LlmParseError,
  mockRecommendation,
  parseRecommendation,
} from '../src/lib/llm';
import type { BoxType, HistoryRecord, Item } from '../src/lib/types';

const A001: Item = { id: 'A001', length: 100, width: 50, height: 30, weight: 2.0, material: '铝合金' };
const B01: BoxType = { id: 'B01', innerLength: 300, innerWidth: 200, innerHeight: 150, maxLoad: 20 };
const B02: BoxType = { id: 'B02', innerLength: 400, innerWidth: 300, innerHeight: 250, maxLoad: 50 };
const B03: BoxType = { id: 'B03', innerLength: 600, innerWidth: 400, innerHeight: 300, maxLoad: 80 };
const candidates = [
  { box: B01, maxPerBox: 8 },
  { box: B02, maxPerBox: 20 },
  { box: B03, maxPerBox: 32 },
];
const history: HistoryRecord[] = [
  { planId: 'H001', itemId: 'A001', quantity: 200, boxId: 'B02', note: '标准装箱' },
  { planId: 'H002', itemId: 'A001', quantity: 150, boxId: 'B02', note: '出口订单' },
  { planId: 'H003', itemId: 'A002', quantity: 40, boxId: 'B03', note: '重型件' },
];

describe('parseRecommendation', () => {
  it('解析带 ```json 围栏的文本为 PackingRecommendation', () => {
    const raw =
      '```json\n{"推荐箱型": "B02", "推荐理由": "历史常用", "每箱数量": 20, "策略建议": "加一层隔板"}\n```';
    expect(parseRecommendation(raw, candidates, 200)).toEqual({
      boxId: 'B02',
      reason: '历史常用',
      perBoxCount: 20,
      strategy: '加一层隔板',
      totalBoxes: 10,
    });
  });

  it('每箱数量钳制到 [1, maxPerBox]', () => {
    const over = '{"推荐箱型": "B02", "推荐理由": "r", "每箱数量": 25, "策略建议": "s"}';
    expect(parseRecommendation(over, candidates, 200).perBoxCount).toBe(20);
    const under = '{"推荐箱型": "B02", "推荐理由": "r", "每箱数量": 0, "策略建议": "s"}';
    expect(parseRecommendation(under, candidates, 200).perBoxCount).toBe(1);
  });

  it('推荐箱型不在候选中则回退为第一个候选，并按其上限钳制', () => {
    const raw = '{"推荐箱型": "B99", "推荐理由": "r", "每箱数量": 20, "策略建议": "s"}';
    const rec = parseRecommendation(raw, candidates, 200);
    expect(rec.boxId).toBe('B01');
    expect(rec.perBoxCount).toBe(8);
    expect(rec.totalBoxes).toBe(25);
  });

  it('缺「每箱数量」时回退为所选箱的上限', () => {
    const raw = '{"推荐箱型": "B02", "推荐理由": "r", "策略建议": "s"}';
    expect(parseRecommendation(raw, candidates, 200).perBoxCount).toBe(20);
  });

  it('非 JSON 文本抛 LlmParseError', () => {
    expect(() => parseRecommendation('抱歉，我无法推荐。', candidates, 200)).toThrow(LlmParseError);
  });
});

describe('mockRecommendation', () => {
  it('无历史时选总箱数最少的候选，totalBoxes = ceil(quantity/perBoxCount)', () => {
    const rec = mockRecommendation(A001, 200, candidates.slice(0, 2), []);
    expect(rec.boxId).toBe('B02');
    expect(rec.perBoxCount).toBe(20);
    expect(rec.totalBoxes).toBe(Math.ceil(200 / 20));
  });

  it('历史规则：该零件历史出现最多的箱型（A001→B02 两行）胜出', () => {
    const rec = mockRecommendation(A001, 200, candidates, history);
    expect(rec.boxId).toBe('B02');
    expect(rec.perBoxCount).toBe(20);
    expect(rec.totalBoxes).toBe(10);
  });
});

describe('buildPrompt', () => {
  it('包含零件、数量、候选箱型与输出格式字段', () => {
    const prompt = buildPrompt(A001, 200, candidates, history);
    expect(prompt).toContain('A001');
    expect(prompt).toContain('200');
    expect(prompt).toContain('B01');
    expect(prompt).toContain('B02');
    expect(prompt).toContain('B03');
    expect(prompt).toContain('推荐箱型');
    expect(prompt).toContain('每箱数量');
  });
});
