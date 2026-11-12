import { totalBoxes, type CandidateBox } from './packing';
import type { MixedOrderLine } from './packing-mixed';
import type { BoxType, HistoryRecord, Item } from './types';

export interface PackingRecommendation {
  boxId: string;
  reason: string;
  perBoxCount: number;
  strategy: string;
  totalBoxes: number;
}

export class LlmParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmParseError';
  }
}

const MOCK_REASON = '（演示模式）基于该零件历史包装方案的推荐。';
const MOCK_STRATEGY = '（演示模式）建议按历史方案装箱，必要时加入缓冲垫与隔板。';

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function extractJson(raw: string): Record<string, unknown> {
  const text = raw.trim();
  const tryParse = (s: string): Record<string, unknown> | null => {
    try {
      const v: unknown = JSON.parse(s);
      return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };
  const direct = tryParse(text);
  if (direct) return direct;
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    const extracted = tryParse(match[0]);
    if (extracted) return extracted;
  }
  throw new LlmParseError('LLM 返回内容不是有效 JSON');
}

export function buildPrompt(
  item: Item,
  quantity: number,
  candidates: CandidateBox[],
  history: HistoryRecord[],
): string {
  const itemInfo = {
    零件号: item.id,
    数量: quantity,
    长度mm: item.length,
    宽度mm: item.width,
    高度mm: item.height,
    重量kg: item.weight,
    材料: item.material,
  };
  const boxList = candidates.map((c) => ({
    箱型: c.box.id,
    内部尺寸mm: `${c.box.innerLength}×${c.box.innerWidth}×${c.box.innerHeight}`,
    最大承重kg: c.box.maxLoad,
    每箱最多可装: c.maxPerBox,
  }));
  const historyData = history.length > 0 ? history : '无历史包装记录';
  return [
    '你是一个经验丰富的工业包装工程师。',
    '请根据零件信息、候选箱型与历史包装方案，推荐最优箱型并给出装箱策略。',
    '要求：每箱数量不得超过该箱型的「每箱最多可装」。',
    '',
    `【零件信息】：${JSON.stringify(itemInfo, null, 0)}`,
    `【候选箱型】：${JSON.stringify(boxList, null, 0)}`,
    `【历史包装方案】：${typeof historyData === 'string' ? historyData : JSON.stringify(historyData, null, 0)}`,
    '',
    '请只输出一个 JSON 对象（可省略代码围栏），格式如下：',
    '{"推荐箱型": "B02", "推荐理由": "...", "每箱数量": 20, "策略建议": "..."}',
  ].join('\n');
}

export function parseRecommendation(
  raw: string,
  candidates: CandidateBox[],
  quantity: number,
): PackingRecommendation {
  if (candidates.length === 0) {
    throw new LlmParseError('没有候选箱型，无法解析推荐');
  }
  const json = extractJson(raw);
  const requestedId = typeof json['推荐箱型'] === 'string' ? (json['推荐箱型'] as string).trim() : '';
  const chosen = candidates.find((c) => c.box.id === requestedId) ?? candidates[0];
  const rawCount = Number(json['每箱数量']);
  const perBoxCount = Number.isFinite(rawCount)
    ? clamp(Math.floor(rawCount), 1, chosen.maxPerBox)
    : chosen.maxPerBox;
  return {
    boxId: chosen.box.id,
    reason: typeof json['推荐理由'] === 'string' ? (json['推荐理由'] as string) : '',
    perBoxCount,
    strategy: typeof json['策略建议'] === 'string' ? (json['策略建议'] as string) : '',
    totalBoxes: totalBoxes(quantity, perBoxCount),
  };
}

export function mockRecommendation(
  item: Item,
  quantity: number,
  candidates: CandidateBox[],
  history: HistoryRecord[],
): PackingRecommendation {
  if (candidates.length === 0) {
    throw new LlmParseError('没有候选箱型，无法生成演示推荐');
  }
  // 规则1：该零件历史中出现过的箱型若在候选中 → 取历史出现最多者（并列取候选列表首个）
  const counts = new Map<string, number>();
  const ids = new Set(candidates.map((c) => c.box.id));
  for (const h of history) {
    if (h.itemId === item.id && ids.has(h.boxId)) {
      counts.set(h.boxId, (counts.get(h.boxId) ?? 0) + 1);
    }
  }
  let chosen = candidates[0];
  if (counts.size > 0) {
    chosen = candidates.find((c) => {
      const best = Math.max(...counts.values());
      return counts.get(c.box.id) === best;
    }) ?? candidates[0];
  } else {
    // 规则2：总箱数最少（并列取列表首个）
    chosen = candidates.reduce((best, c) =>
      totalBoxes(quantity, c.maxPerBox) < totalBoxes(quantity, best.maxPerBox) ? c : best,
    );
  }
  return {
    boxId: chosen.box.id,
    reason: MOCK_REASON,
    perBoxCount: chosen.maxPerBox,
    strategy: MOCK_STRATEGY,
    totalBoxes: totalBoxes(quantity, chosen.maxPerBox),
  };
}

// ============ v2 混装订单语义（数字由算法产出，LLM 只出文案） ============

export interface MixedReply {
  reason: string;
  strategy: string;
}

export function buildMixedPrompt(
  order: MixedOrderLine[],
  boxName: string,
  placed: { partId: string; name: string; count: number }[],
  totalBoxes: number,
  userMessage: string,
): string {
  const lines = order
    .filter((l) => l.quantity > 0)
    .map(
      (l) =>
        `${l.part.name}（${l.part.length}×${l.part.width}×${l.part.height}mm，${l.part.weight}kg）× ${l.quantity}`,
    );
  const placedText = placed.map((p) => `${p.name} × ${p.count}`).join('，');
  return [
    '你是一个经验丰富的工业包装工程师。',
    '以下是一张混装订单与已由算法算出的装箱数字，请给出推荐理由与装箱策略（隔板/缓冲/摆放建议等）。',
    `【订单】：${lines.join('；')}`,
    `【所选箱型】：${boxName}`,
    `【装箱数字（算法已算出，不要改动）】：第一箱装入 ${placedText}；共 ${totalBoxes} 箱。`,
    userMessage.trim() ? `【用户要求】：${userMessage.trim()}` : '',
    '请只输出一个 JSON 对象（可省略代码围栏）：{"推荐理由": "...", "策略建议": "..."}',
  ]
    .filter(Boolean)
    .join('\n');
}

export function parseMixedReply(raw: string): MixedReply {
  const json = extractJson(raw);
  return {
    reason: typeof json['推荐理由'] === 'string' ? (json['推荐理由'] as string) : '',
    strategy: typeof json['策略建议'] === 'string' ? (json['策略建议'] as string) : '',
  };
}

export function mockMixedReply(userMessage: string): MixedReply {
  const msg = userMessage.trim();
  return {
    reason: '（演示模式）混装方案基于体积分层与承重预算，由算法精确计算。',
    strategy: msg
      ? `（演示模式）建议按分层顺序装箱并加入缓冲隔板。已考虑您的要求：${msg}`
      : '（演示模式）建议按分层顺序装箱并加入缓冲隔板。',
  };
}
