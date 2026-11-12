import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Catalog } from '../src/lib/types';

const FILE = 'catalog.json';

export function loadCatalog(userDataPath: string): Catalog {
  try {
    const raw = JSON.parse(readFileSync(path.join(userDataPath, FILE), 'utf-8')) as Partial<Catalog>;
    return {
      parts: Array.isArray(raw.parts) ? raw.parts : [],
      boxes: Array.isArray(raw.boxes) ? raw.boxes : [],
    };
  } catch {
    return { parts: [], boxes: [] };
  }
}

export function saveCatalog(userDataPath: string, catalog: Catalog): void {
  writeFileSync(path.join(userDataPath, FILE), JSON.stringify(catalog, null, 2), 'utf-8');
}
