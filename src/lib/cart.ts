import type { CartLine } from './types';

/** 外卖式购物车数量调整：+1/−1，0 删除，封顶 max（默认 999） */
export function adjustLine(lines: CartLine[], partId: string, delta: number, max = 999): CartLine[] {
  const i = lines.findIndex((l) => l.partId === partId);
  if (i < 0) {
    if (delta > 0) return [...lines, { partId, quantity: Math.min(delta, max) }];
    return lines;
  }
  const q = lines[i].quantity + delta;
  if (q <= 0) return lines.filter((l) => l.partId !== partId);
  const next = [...lines];
  next[i] = { partId, quantity: Math.min(q, max) };
  return next;
}
