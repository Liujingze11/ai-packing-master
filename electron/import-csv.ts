import { dialog } from 'electron';
import { readFileSync } from 'node:fs';
import { collectCatalogFromCsvs, type ImportCatalogResult } from '../src/lib/catalog-import';

/** 多选 CSV（零件表/箱型表必需，历史表可选忽略）；取消返回 null；错误以中文返回 */
export async function importCsvDialog(): Promise<ImportCatalogResult | null> {
  const result = await dialog.showOpenDialog({
    title: '选择 CSV（零件表 + 箱型表，历史表可选）',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const texts = result.filePaths.map((p) => readFileSync(p, 'utf-8'));
  return collectCatalogFromCsvs(texts);
}
