import type { BoxSpec, Catalog, Part } from './types';

export type ValidateResult<T> = { ok: true } & T | { ok: false; error: string };

function num(v: unknown): number {
  return typeof v === 'number' ? v : Number(v);
}

function autoId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

/** 校验并规整零件录入：name 非空、长宽高/重量为正数、不同 id 不重名；缺 id 自动生成 */
export function validatePart(
  raw: unknown,
  existing: Part[] = [],
): { ok: true; part: Part } | { ok: false; error: string } {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const name = typeof r.name === 'string' ? r.name.trim() : '';
  if (!name) return { ok: false, error: '请填写零件名称' };
  const length = num(r.length);
  const width = num(r.width);
  const height = num(r.height);
  const weight = num(r.weight);
  if (!(length > 0 && width > 0 && height > 0)) return { ok: false, error: '长宽高必须为正数' };
  if (!(weight > 0)) return { ok: false, error: '重量必须为正数' };
  const id = typeof r.id === 'string' && r.id.trim() ? r.id.trim() : autoId('P');
  if (existing.some((p) => p.id !== id && p.name === name)) {
    return { ok: false, error: `已存在同名零件「${name}」，请换个名字` };
  }
  const material = typeof r.material === 'string' && r.material.trim() ? r.material.trim() : '未知';
  return { ok: true, part: { id, name, length, width, height, weight, material } };
}

/** 校验并规整箱型录入：maxLoad 缺省 50、不同 id 不重名 */
export function validateBox(
  raw: unknown,
  existing: BoxSpec[] = [],
): { ok: true; box: BoxSpec } | { ok: false; error: string } {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const name = typeof r.name === 'string' ? r.name.trim() : '';
  if (!name) return { ok: false, error: '请填写箱子名称' };
  const innerLength = num(r.innerLength);
  const innerWidth = num(r.innerWidth);
  const innerHeight = num(r.innerHeight);
  if (!(innerLength > 0 && innerWidth > 0 && innerHeight > 0)) {
    return { ok: false, error: '长宽高必须为正数' };
  }
  let maxLoad = 50;
  if (r.maxLoad !== undefined && r.maxLoad !== null && r.maxLoad !== '') {
    maxLoad = num(r.maxLoad);
    if (!(maxLoad > 0)) return { ok: false, error: '最大承重必须为正数' };
  }
  const id = typeof r.id === 'string' && r.id.trim() ? r.id.trim() : autoId('B');
  if (existing.some((b) => b.id !== id && b.name === name)) {
    return { ok: false, error: `已存在同名箱子「${name}」，请换个名字` };
  }
  const material = typeof r.material === 'string' && r.material.trim() ? r.material.trim() : '纸箱';
  return { ok: true, box: { id, name, innerLength, innerWidth, innerHeight, maxLoad, material } };
}

export function upsertPart(catalog: Catalog, part: Part): Catalog {
  const parts = [...catalog.parts];
  const i = parts.findIndex((p) => p.id === part.id);
  if (i >= 0) parts[i] = part;
  else parts.push(part);
  return { ...catalog, parts };
}

export function removePart(catalog: Catalog, id: string): Catalog {
  return { ...catalog, parts: catalog.parts.filter((p) => p.id !== id) };
}

export function upsertBox(catalog: Catalog, box: BoxSpec): Catalog {
  const boxes = [...catalog.boxes];
  const i = boxes.findIndex((b) => b.id === box.id);
  if (i >= 0) boxes[i] = box;
  else boxes.push(box);
  return { ...catalog, boxes };
}

export function removeBox(catalog: Catalog, id: string): Catalog {
  return { ...catalog, boxes: catalog.boxes.filter((b) => b.id !== id) };
}
