import { useEffect, useState } from 'react';
import CartPanel from './components/CartPanel';
import PartForm from './components/PartForm';
import PartsMenu from './components/PartsMenu';
import SettingsPanel from './components/SettingsPanel';
import boxesRaw from './data/boxes.csv?raw';
import itemsRaw from './data/items.csv?raw';
import { upsertBox, upsertPart } from './lib/catalog';
import { parseBoxes, parseItems } from './lib/csv';
import { adjustLine } from './lib/cart';
import type { BoxType, Catalog, CartLine, Item, Part } from './lib/types';

function toPart(it: Item): Part {
  return {
    id: it.id,
    name: it.id,
    length: it.length,
    width: it.width,
    height: it.height,
    weight: it.weight,
    material: it.material,
  };
}

function toBoxSpec(b: BoxType) {
  return {
    id: b.id,
    name: b.id,
    innerLength: b.innerLength,
    innerWidth: b.innerWidth,
    innerHeight: b.innerHeight,
    maxLoad: b.maxLoad,
  };
}

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [partFormOpen, setPartFormOpen] = useState(false);
  const [catalog, setCatalog] = useState<Catalog>({ parts: [], boxes: [] });
  const [cart, setCart] = useState<CartLine[]>([]);

  useEffect(() => {
    void window.packingAPI.getCatalog().then(setCatalog);
  }, []);

  const persist = (c: Catalog) => {
    setCatalog(c);
    void window.packingAPI.saveCatalog(c);
  };

  const loadSeed = async () => {
    let c = await window.packingAPI.getCatalog();
    for (const it of parseItems(itemsRaw)) c = upsertPart(c, toPart(it));
    for (const b of parseBoxes(boxesRaw)) c = upsertBox(c, toBoxSpec(b));
    persist(c);
  };

  const importCsv = async () => {
    const d = await window.packingAPI.importCsv();
    if (!d) return;
    let c = await window.packingAPI.getCatalog();
    for (const it of d.items) c = upsertPart(c, toPart(it));
    for (const b of d.boxes) c = upsertBox(c, toBoxSpec(b));
    persist(c);
  };

  const cartLines = cart
    .map((l) => ({ part: catalog.parts.find((p) => p.id === l.partId), quantity: l.quantity }))
    .filter((l): l is { part: Part; quantity: number } => Boolean(l.part));

  return (
    <main className="app">
      <header className="app-header">
        <h1>📦 AI 装箱引擎</h1>
        <button className="gear" onClick={() => setSettingsOpen(true)} title="设置">
          ⚙️ 设置
        </button>
      </header>

      <div className="workspace">
        <aside className="left-col">
          <h2>🍜 零件菜单</h2>
          <PartsMenu parts={catalog.parts} onAdd={(id) => setCart((c) => adjustLine(c, id, 1))} />
          <div className="left-actions">
            <button onClick={() => setPartFormOpen(true)}>＋ 添加零件</button>
            <button onClick={() => void loadSeed()}>载入示例数据</button>
            <button onClick={() => void importCsv()}>📂 导入 CSV</button>
          </div>
          <h2>🧺 订单</h2>
          <CartPanel
            lines={cartLines}
            onAdjust={(id, d) => setCart((c) => adjustLine(c, id, d))}
          />
        </aside>

        <section className="output">
          <p className="placeholder">v2 交互建设中：箱子管理与 AI 对话区即将上线。</p>
        </section>
      </div>

      <PartForm
        open={partFormOpen}
        onSubmit={(p) => persist(upsertPart(catalog, p))}
        onClose={() => setPartFormOpen(false)}
      />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
