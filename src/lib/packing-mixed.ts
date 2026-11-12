import type { BoxSpec, Part } from './types';

export interface MixedOrderLine {
  part: Part;
  quantity: number;
}

export interface MixedLayout {
  boxSize: [number, number, number]; // [长(x), 高(y), 宽(z)]
  items: {
    size: [number, number, number];
    position: [number, number, number];
    colorIndex: number; // = 该 SKU 在 order 数组中的下标
  }[];
}

export interface MixedFill {
  placed: { partId: string; count: number }[];
  layout: MixedLayout;
}

export type MixedPlan =
  | {
      ok: true;
      totalBoxes: number;
      firstBox: { placed: { partId: string; name: string; count: number }[]; layout: MixedLayout };
    }
  | { ok: false; kind: 'empty_order' | 'item_too_big'; message: string };

function itemVol(p: Part): number {
  return p.length * p.width * p.height;
}

/**
 * 单箱混装模拟：
 * - SKU 按体积降序放置，每 SKU 独占若干水平层（层高=件高），层内网格 floor(内长/件长)×floor(内宽/件宽)
 * - heightBudget = innerHeight × margin，weightBudget = maxLoad × margin
 * - 逐 SKU 扣减剩余高度/承重/数量；只记录装入 >0 的 SKU
 */
export function simulateMixedFill(order: MixedOrderLine[], box: BoxSpec, margin: number): MixedFill {
  const heightBudget = box.innerHeight * margin;
  const weightBudget = box.maxLoad * margin;
  let heightLeft = heightBudget;
  let weightLeft = weightBudget;

  const placed: { partId: string; count: number }[] = [];
  const items: MixedLayout['items'] = [];

  const indexed = order
    .map((line, colorIndex) => ({ line, colorIndex }))
    .filter((x) => x.line.quantity > 0)
    .sort((a, b) => itemVol(b.line.part) - itemVol(a.line.part));

  for (const { line, colorIndex } of indexed) {
    const p = line.part;
    const gx = Math.floor(box.innerLength / p.length);
    const gz = Math.floor(box.innerWidth / p.width);
    const gridPerLayer = gx * gz;
    if (gx <= 0 || gz <= 0 || p.height > heightLeft) continue;

    const layersAvail = Math.floor(heightLeft / p.height);
    const weightCap = Math.floor(weightLeft / p.weight);
    const capacity = Math.min(line.quantity, layersAvail * gridPerLayer, weightCap);
    if (capacity <= 0) continue;

    const layersUsed = Math.ceil(capacity / gridPerLayer);
    const yBase = heightBudget - heightLeft;
    let n = 0;
    for (let k = 0; k < layersUsed; k++) {
      const inLayer = Math.min(gridPerLayer, capacity - n);
      for (let idx = 0; idx < inLayer; idx++) {
        const i = idx % gx;
        const j = Math.floor(idx / gx);
        items.push({
          size: [p.length, p.height, p.width],
          position: [
            (i + 0.5) * p.length - box.innerLength / 2,
            yBase + (k + 0.5) * p.height,
            (j + 0.5) * p.width - box.innerWidth / 2,
          ],
          colorIndex,
        });
        n++;
      }
    }
    heightLeft -= layersUsed * p.height;
    weightLeft -= capacity * p.weight;
    placed.push({ partId: p.id, count: capacity });
  }

  return {
    placed,
    layout: {
      boxSize: [box.innerLength, box.innerHeight, box.innerWidth],
      items,
    },
  };
}

/** 循环装箱直至订单完成；整箱 0 装入 → item_too_big（推进保护，不死循环） */
export function planMixedPacking(
  order: MixedOrderLine[],
  box: BoxSpec,
  margin: number,
): MixedPlan {
  const remaining = order.map((l) => ({ ...l }));
  if (remaining.every((l) => !(l.quantity > 0))) {
    return { ok: false, kind: 'empty_order', message: '购物车是空的' };
  }

  let totalBoxes = 0;
  let firstBox: { placed: { partId: string; name: string; count: number }[]; layout: MixedLayout } | null =
    null;

  while (remaining.some((l) => l.quantity > 0)) {
    const fill = simulateMixedFill(remaining, box, margin);
    const total = fill.placed.reduce((s, p) => s + p.count, 0);
    if (total === 0) {
      const stuck = remaining
        .filter((l) => l.quantity > 0)
        .sort((a, b) => itemVol(b.part) - itemVol(a.part))[0];
      return {
        ok: false,
        kind: 'item_too_big',
        message: `「${stuck.part.name}」放不进箱子（单件超出箱内尺寸或承重）`,
      };
    }
    totalBoxes++;
    if (firstBox === null) {
      firstBox = {
        placed: fill.placed.map((p) => ({
          partId: p.partId,
          name: remaining.find((l) => l.part.id === p.partId)?.part.name ?? p.partId,
          count: p.count,
        })),
        layout: fill.layout,
      };
    }
    for (const p of fill.placed) {
      const line = remaining.find((l) => l.part.id === p.partId);
      if (line) line.quantity -= p.count;
    }
  }

  return { ok: true, totalBoxes, firstBox: firstBox! };
}
