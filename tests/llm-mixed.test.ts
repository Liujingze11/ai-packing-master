import { describe, expect, it } from 'vitest';
import { buildMixedPrompt, LlmParseError, mockMixedReply, parseMixedReply } from '../src/lib/llm';
import type { MixedOrderLine } from '../src/lib/packing-mixed';
import type { Part } from '../src/lib/types';

const A001: Part = { id: 'A001', name: '齿轮箱', length: 100, width: 50, height: 30, weight: 2, material: '铝合金' };
const order: MixedOrderLine[] = [{ part: A001, quantity: 10 }];
const placed = [{ partId: 'A001', name: '齿轮箱', count: 10 }];

describe('parseMixedReply', () => {
  it('解析带围栏的 JSON', () => {
    const raw = '```json\n{"推荐理由": "承重匹配", "策略建议": "加隔板"}\n```';
    expect(parseMixedReply(raw)).toEqual({ reason: '承重匹配', strategy: '加隔板' });
  });

  it('缺字段回空串', () => {
    expect(parseMixedReply('{"推荐理由": "ok"}')).toEqual({ reason: 'ok', strategy: '' });
  });

  it('非 JSON 抛 LlmParseError', () => {
    expect(() => parseMixedReply('抱歉，无法处理')).toThrow(LlmParseError);
  });
});

describe('mockMixedReply', () => {
  it('固定文案 + 留言回显（含「已考虑」）', () => {
    const r = mockMixedReply('易碎');
    expect(r.reason).toContain('演示模式');
    expect(r.strategy).toContain('易碎');
    expect(r.strategy).toContain('已考虑');
  });

  it('无留言 → 不含「已考虑」', () => {
    expect(mockMixedReply('').strategy).not.toContain('已考虑');
  });
});

describe('buildMixedPrompt', () => {
  it('包含订单零件名、箱名、总箱数、用户留言', () => {
    const p = buildMixedPrompt(order, '中箱', placed, 2, '易碎需缓冲');
    expect(p).toContain('齿轮箱');
    expect(p).toContain('中箱');
    expect(p).toContain('共 2 箱');
    expect(p).toContain('易碎需缓冲');
    expect(p).toContain('推荐理由');
  });

  it('无留言时不渲染用户要求段', () => {
    const p = buildMixedPrompt(order, '中箱', placed, 1, '');
    expect(p).not.toContain('用户要求');
  });
});
