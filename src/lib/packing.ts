import type { BoxType, Item } from './types';

export interface CandidateBox {
  box: BoxType;
  maxPerBox: number;
}

export interface Layout {
  boxSize: [number, number, number]; // [长(x), 高(y), 宽(z)]
  itemSize: [number, number, number];
  positions: [number, number, number][]; // 零件中心坐标，填充顺序 k层(y)→j排(z)→i列(x)
}

/** 网格容量：floor(内长/件长) × floor(内宽/件宽) × floor(内高/件高)，任一方向为 0 则整体为 0 */
export function gridCapacity(item: Item, box: BoxType): number {
  const fx = Math.floor(box.innerLength / item.length);
  const fy = Math.floor(box.innerHeight / item.height);
  const fz = Math.floor(box.innerWidth / item.width);
  if (fx <= 0 || fy <= 0 || fz <= 0) return 0;
  return fx * fy * fz;
}

/** 每箱数量上限 = min(网格容量, 体积上限(×margin), 承重上限(×margin)) */
export function maxPerBox(item: Item, box: BoxType, margin: number): number {
  const grid = gridCapacity(item, box);
  const itemVol = item.length * item.width * item.height;
  const boxVol = box.innerLength * box.innerWidth * box.innerHeight;
  const volCap = Math.floor((boxVol * margin) / itemVol);
  const wtCap = Math.floor((box.maxLoad * margin) / item.weight);
  return Math.max(0, Math.min(grid, volCap, wtCap));
}

/** 候选箱型 = maxPerBox ≥ 1 */
export function filterCandidates(item: Item, boxes: BoxType[], margin: number): CandidateBox[] {
  const candidates: CandidateBox[] = [];
  for (const box of boxes) {
    const cap = maxPerBox(item, box, margin);
    if (cap >= 1) candidates.push({ box, maxPerBox: cap });
  }
  return candidates;
}

/** 总箱数 = ceil(数量 / 每箱数量) */
export function totalBoxes(quantity: number, perBoxCount: number): number {
  return Math.ceil(quantity / perBoxCount);
}

/** 网格布局：长→x、高→y、宽→z；箱内底面 y=0；取前 perBoxCount 个位置 */
export function computeLayout(item: Item, box: BoxType, perBoxCount: number): Layout {
  const fx = Math.floor(box.innerLength / item.length);
  const fy = Math.floor(box.innerHeight / item.height);
  const fz = Math.floor(box.innerWidth / item.width);
  const positions: [number, number, number][] = [];
  outer: for (let k = 0; k < fy; k++) {
    for (let j = 0; j < fz; j++) {
      for (let i = 0; i < fx; i++) {
        positions.push([
          (i + 0.5) * item.length - box.innerLength / 2,
          (k + 0.5) * item.height,
          (j + 0.5) * item.width - box.innerWidth / 2,
        ]);
        if (positions.length >= perBoxCount) break outer;
      }
    }
  }
  return {
    boxSize: [box.innerLength, box.innerHeight, box.innerWidth],
    itemSize: [item.length, item.height, item.width],
    positions,
  };
}
