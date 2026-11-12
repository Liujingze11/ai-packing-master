import { findItem } from './input';
import { mockRecommendation, parseRecommendation, type PackingRecommendation } from './llm';
import { computeLayout, filterCandidates, type Layout } from './packing';
import type { BoxType, Dataset, HistoryRecord, Item, Settings } from './types';

export interface RecommendApi {
  recommend(payload: {
    item: Item;
    quantity: number;
    candidates: { box: BoxType; maxPerBox: number }[];
    history: HistoryRecord[];
  }): Promise<string>;
}

export interface FlowResult {
  recommendation: PackingRecommendation;
  item: Item;
  layout: Layout;
}

export type FlowError = { kind: 'not_found' | 'no_box' | 'llm'; message: string };

export type FlowOutcome = { ok: true; result: FlowResult } | { ok: false; error: FlowError };

/** 核心推荐流程：查零件 → 过滤箱型 → mock/LLM 推荐 → 计算布局 */
export async function runRecommendation(
  dataset: Dataset,
  itemId: string,
  quantity: number,
  settings: Settings,
  api: RecommendApi,
): Promise<FlowOutcome> {
  const item = findItem(dataset.items, itemId);
  if (!item) {
    return { ok: false, error: { kind: 'not_found', message: '未找到该零件号' } };
  }
  const candidates = filterCandidates(item, dataset.boxes, settings.margin);
  if (candidates.length === 0) {
    return { ok: false, error: { kind: 'no_box', message: '无可用箱型' } };
  }
  try {
    const recommendation = settings.mockMode
      ? mockRecommendation(item, quantity, candidates, dataset.history)
      : parseRecommendation(
          await api.recommend({ item, quantity, candidates, history: dataset.history }),
          candidates,
          quantity,
        );
    const chosen = candidates.find((c) => c.box.id === recommendation.boxId);
    if (!chosen) {
      return { ok: false, error: { kind: 'llm', message: '推荐箱型不在候选中' } };
    }
    const layout = computeLayout(item, chosen.box, recommendation.perBoxCount);
    return { ok: true, result: { recommendation, item, layout } };
  } catch (e) {
    return { ok: false, error: { kind: 'llm', message: e instanceof Error ? e.message : String(e) } };
  }
}
