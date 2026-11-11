import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

describe('构建产物（file:// 加载兼容）', () => {
  it('dist/index.html 的资源引用必须是相对路径（base: ./）', () => {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    if (!existsSync(indexPath)) return; // 未构建时跳过；构建后本测试必检
    const html = readFileSync(indexPath, 'utf-8');
    expect(html).not.toMatch(/(?:src|href)="\/assets\//);
    expect(html).toMatch(/(?:src|href)="\.?\/?assets\//);
  });
});
