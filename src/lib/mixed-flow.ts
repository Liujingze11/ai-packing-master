import { mockMixedReply, parseMixedReply, type MixedReply } from './llm';
import { planMixedPacking, type MixedLayout, type MixedOrderLine } from './packing-mixed';
import type { BoxSpec } from './types';

export interface MixedApi {
  recommendMixed(payload: {
    order: MixedOrderLine[];
    boxName: string;
    placed: { partId: string; name: string; count: number }[];
    totalBoxes: number;
    userMessage: string;
  }): Promise<string>;
}

export interface MixedFlowResult {
  totalBoxes: number;
  firstBox: { placed: { partId: string; name: string; count: number }[]; layout: MixedLayout };
  reply: MixedReply;
  boxName: string;
}

export type MixedFlowOutcome =
  | { ok: true; result: MixedFlowResult }
  | { ok: false; message: string };

function boxVolume(b: BoxSpec): number {
  return b.innerLength * b.innerWidth * b.innerHeight;
}

/** 未选箱时的自动挑选：totalBoxes 最小，并列取箱体积最小；全装不进 → null */
export function pickDefaultBox(
  order: MixedOrderLine[],
  boxes: BoxSpec[],
  margin: number,
): BoxSpec | null {
  let best: BoxSpec | null = null;
  let bestBoxes = Infinity;
  let bestVol = Infinity;
  for (const box of boxes) {
    const plan = planMixedPacking(order, box, margin);
    if (!plan.ok) continue;
    const vol = boxVolume(box);
    if (plan.totalBoxes < bestBoxes || (plan.totalBoxes === bestBoxes && vol < bestVol)) {
      best = box;
      bestBoxes = plan.totalBoxes;
      bestVol = vol;
    }
  }
  return best;
}

/** 订单 → 挑箱/选箱 → 算法数字 → mock/LLM 文案 */
export async function runMixedRecommendation(
  input: {
    order: MixedOrderLine[];
    box: BoxSpec | null;
    boxes: BoxSpec[];
    margin: number;
    userMessage: string;
    mockMode: boolean;
  },
  api: MixedApi,
): Promise<MixedFlowOutcome> {
  const box = input.box ?? pickDefaultBox(input.order, input.boxes, input.margin);
  if (!box) {
    return { ok: false, message: '没有能装下订单的箱子，请调整订单或添加更大的箱子' };
  }
  const plan = planMixedPacking(input.order, box, input.margin);
  if (!plan.ok) {
    return { ok: false, message: plan.message };
  }
  try {
    const reply = input.mockMode
      ? mockMixedReply(input.userMessage)
      : parseMixedReply(
          await api.recommendMixed({
            order: input.order,
            boxName: box.name,
            placed: plan.firstBox.placed,
            totalBoxes: plan.totalBoxes,
            userMessage: input.userMessage,
          }),
        );
    return {
      ok: true,
      result: {
        totalBoxes: plan.totalBoxes,
        firstBox: plan.firstBox,
        reply,
        boxName: box.name,
      },
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
