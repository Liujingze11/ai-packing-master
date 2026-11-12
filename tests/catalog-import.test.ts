import { describe, expect, it } from 'vitest';
import { collectCatalogFromCsvs } from '../src/lib/catalog-import';

const itemsCsv = `零件号,长度(mm),宽度(mm),高度(mm),重量(kg),材料
A001,100,50,30,2.0,铝合金
A002,200,100,80,5.5,铸铁`;

const boxesCsv = `箱型,内部长度(mm),内部宽度(mm),内部高度(mm),最大承重(kg)
B02,400,300,250,50`;

const historyCsv = `方案ID,零件号,数量,使用箱型,备注
H001,A001,200,B02,标准装箱`;

describe('collectCatalogFromCsvs', () => {
  it('零件表+箱型表两份即可导入，历史表忽略', () => {
    const r = collectCatalogFromCsvs([itemsCsv, boxesCsv, historyCsv]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.parts).toHaveLength(2);
      expect(r.boxes).toHaveLength(1);
      expect(r.parts[0].name).toBe('A001');
    }
  });

  it('两份文件（不带历史表）同样可导入', () => {
    const r = collectCatalogFromCsvs([itemsCsv, boxesCsv]);
    expect(r.ok).toBe(true);
  });

  it('缺一类表 → 中文错误', () => {
    const r = collectCatalogFromCsvs([itemsCsv]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('零件表和箱型表');
  });

  it('坏 CSV → 中文错误（不静默失败）', () => {
    const r = collectCatalogFromCsvs([itemsCsv, '零件号\n']);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.length).toBeGreaterThan(0);
  });
});
