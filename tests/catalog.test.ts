import { describe, expect, it } from 'vitest';
import { removeBox, removePart, upsertBox, upsertPart, validateBox, validatePart } from '../src/lib/catalog';
import type { Catalog, Part } from '../src/lib/types';

const A001: Part = {
  id: 'A001',
  name: '齿轮箱',
  length: 100,
  width: 50,
  height: 30,
  weight: 2,
  material: '铝合金',
};

describe('validatePart', () => {
  it('合法输入 → ok 且字段规整', () => {
    const r = validatePart({
      id: 'A001',
      name: ' 齿轮箱 ',
      length: 100,
      width: 50,
      height: 30,
      weight: 2,
      material: '铝合金',
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.part).toEqual(A001);
  });

  it('缺名/尺寸 0/重量负 → 中文错误', () => {
    expect(validatePart({ id: 'x', name: '', length: 1, width: 1, height: 1, weight: 1 })).toEqual({
      ok: false,
      error: '请填写零件名称',
    });
    expect(validatePart({ id: 'x', name: 'n', length: 0, width: 1, height: 1, weight: 1 }).ok).toBe(false);
    expect(validatePart({ id: 'x', name: 'n', length: 1, width: 1, height: 1, weight: -2 }).ok).toBe(false);
  });

  it('缺 id 自动生成非空 id', () => {
    const r = validatePart({ name: 'n', length: 1, width: 1, height: 1, weight: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.part.id.length).toBeGreaterThan(0);
  });

  it('重名零件（不同 id）→ 中文提示', () => {
    const r = validatePart(
      { name: '齿轮箱', length: 1, width: 1, height: 1, weight: 1 },
      [A001],
    );
    expect(r).toEqual({ ok: false, error: '已存在同名零件「齿轮箱」，请换个名字' });
  });

  it('同 id 更新不算重名（导入/更新场景）', () => {
    const r = validatePart(
      { id: 'A001', name: '齿轮箱', length: 100, width: 50, height: 30, weight: 2, material: '铝合金' },
      [A001],
    );
    expect(r.ok).toBe(true);
  });
});

describe('validateBox', () => {
  it('缺 maxLoad 默认 50', () => {
    const r = validateBox({ id: 'B1', name: '小箱', innerLength: 300, innerWidth: 200, innerHeight: 150 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.box.maxLoad).toBe(50);
  });

  it('尺寸非正 / 承重为负 → 中文错误', () => {
    expect(validateBox({ id: 'B1', name: 'n', innerLength: -1, innerWidth: 2, innerHeight: 3 }).ok).toBe(false);
    expect(validateBox({ id: 'B1', name: 'n', innerLength: 1, innerWidth: 2, innerHeight: 3, maxLoad: -5 }).ok).toBe(false);
  });

  it('重名箱子（不同 id）→ 中文提示', () => {
    const existing = validateBox({ id: 'B1', name: '小箱', innerLength: 300, innerWidth: 200, innerHeight: 150 });
    expect(existing.ok).toBe(true);
    if (!existing.ok) return;
    const r = validateBox(
      { name: '小箱', innerLength: 1, innerWidth: 2, innerHeight: 3 },
      [existing.box],
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('小箱');
  });
});

describe('upsert / remove', () => {
  const base: Catalog = { parts: [A001], boxes: [] };

  it('upsertPart 同 id 替换、不同 id 追加', () => {
    const replaced = upsertPart(base, { ...A001, weight: 3 });
    expect(replaced.parts).toHaveLength(1);
    expect(replaced.parts[0].weight).toBe(3);
    expect(upsertPart(base, { ...A001, id: 'A002' }).parts).toHaveLength(2);
  });

  it('removePart 删除后长度减一', () => {
    expect(removePart(base, 'A001').parts).toHaveLength(0);
  });

  it('upsertBox / removeBox 同构行为', () => {
    const r = validateBox({ id: 'B1', name: '小箱', innerLength: 300, innerWidth: 200, innerHeight: 150 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const withBox = upsertBox(base, r.box);
    expect(withBox.boxes).toHaveLength(1);
    expect(removeBox(withBox, 'B1').boxes).toHaveLength(0);
  });
});
