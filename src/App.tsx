import { useEffect, useState } from 'react';
import BoxManager from './components/BoxManager';
import CartPanel from './components/CartPanel';
import ChatArea, { type ChatMessage } from './components/ChatArea';
import PartForm from './components/PartForm';
import PackingScene from './components/PackingScene';
import PartsMenu from './components/PartsMenu';
import SettingsPanel from './components/SettingsPanel';
import boxesRaw from './data/boxes.csv?raw';
import itemsRaw from './data/items.csv?raw';
import { adjustLine } from './lib/cart';
import { upsertBox, upsertPart } from './lib/catalog';
import { parseBoxes, parseItems } from './lib/csv';
import { runMixedRecommendation } from './lib/mixed-flow';
import type { MixedLayout, MixedOrderLine } from './lib/packing-mixed';
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
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [mixedLayout, setMixedLayout] = useState<MixedLayout | null>(null);
  const [sceneMeta, setSceneMeta] = useState<{
    totalBoxes: number;
    skuCount: number;
    itemCount: number;
    skuNames: string[];
  } | null>(null);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    void window.packingAPI.getCatalog().then((c) => {
      setCatalog(c);
      if (c.boxes.length > 0) setSelectedBoxId(c.boxes[0].id);
    });
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
    if (!selectedBoxId && c.boxes.length > 0) setSelectedBoxId(c.boxes[0].id);
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

  const canSend = cartLines.length > 0;

  const send = async (userMessage: string) => {
    setBusy(true);
    const order: MixedOrderLine[] = cartLines.map((l) => ({ part: l.part, quantity: l.quantity }));
    setMessages((m) => [...m, { role: 'user', text: userMessage || '开始装箱' }]);
    try {
      const settings = await window.packingAPI.getSettings();
      const box = catalog.boxes.find((b) => b.id === selectedBoxId) ?? null;
      const out = await runMixedRecommendation(
        {
          order,
          box,
          boxes: catalog.boxes,
          margin: settings.margin,
          userMessage,
          mockMode: settings.mockMode,
        },
        window.packingAPI,
      );
      if (out.ok) {
        const { totalBoxes, firstBox, reply, boxName } = out.result;
        const placedText = firstBox.placed.map((p) => `${p.name}×${p.count}`).join('，');
        setMessages((m) => [
          ...m,
          {
            role: 'ai',
            text: `【推荐理由】${reply.reason}\n【策略建议】${reply.strategy}\n【装箱数字】箱型「${boxName}」第一箱装入 ${placedText}；共 ${totalBoxes} 箱。`,
          },
        ]);
        setMixedLayout(firstBox.layout);
        setSceneMeta({
          totalBoxes,
          skuCount: firstBox.placed.length,
          itemCount: firstBox.layout.items.length,
          skuNames: firstBox.placed.map((p) => p.name),
        });
        setRunId((r) => r + 1);
      } else {
        setMessages((m) => [...m, { role: 'ai', text: `⚠️ ${out.message}` }]);
      }
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: 'ai', text: `⚠️ ${e instanceof Error ? e.message : String(e)}` },
      ]);
    } finally {
      setBusy(false);
    }
  };

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
          <CartPanel lines={cartLines} onAdjust={(id, d) => setCart((c) => adjustLine(c, id, d))} />
        </aside>

        <section className="center-col">
          <div className="scene-wrap">
            {mixedLayout && sceneMeta ? (
              <PackingScene
                key={runId}
                layout={mixedLayout}
                totalBoxes={sceneMeta.totalBoxes}
                skuCount={sceneMeta.skuCount}
                skuNames={sceneMeta.skuNames}
              />
            ) : (
              <div className="scene-placeholder">
                <p className="placeholder">3D 装箱模拟将在这里播放</p>
              </div>
            )}
          </div>
          <ChatArea messages={messages} canSend={canSend} busy={busy} onSend={(m) => void send(m)} />
        </section>

        <aside className="right-col">
          <BoxManager
            boxes={catalog.boxes}
            selectedId={selectedBoxId}
            onSelect={setSelectedBoxId}
            onCreate={(b) => persist(upsertBox(catalog, b))}
          />
        </aside>
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
