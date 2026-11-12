import { useState } from 'react';
import InputPanel from './components/InputPanel';
import PackingScene from './components/PackingScene';
import ResultCards from './components/ResultCards';
import SettingsPanel from './components/SettingsPanel';
import boxesRaw from './data/boxes.csv?raw';
import historyRaw from './data/history.csv?raw';
import itemsRaw from './data/items.csv?raw';
import { parseBoxes, parseHistory, parseItems } from './lib/csv';
import { runRecommendation, type FlowResult } from './lib/recommend-flow';
import type { Dataset } from './lib/types';

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dataset, setDataset] = useState<Dataset>(() => ({
    items: parseItems(itemsRaw),
    boxes: parseBoxes(boxesRaw),
    history: parseHistory(historyRaw),
  }));
  const [result, setResult] = useState<FlowResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [runId, setRunId] = useState(0);
  const [lastArgs, setLastArgs] = useState<{ itemId: string; quantity: number } | null>(null);

  const run = async (itemId: string, quantity: number) => {
    setLastArgs({ itemId, quantity });
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const settings = await window.packingAPI.getSettings();
      const out = await runRecommendation(dataset, itemId, quantity, settings, window.packingAPI);
      if (out.ok) {
        setResult(out.result);
        setRunId((r) => r + 1);
      } else setError(out.error.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
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
        <InputPanel
          onSearch={(itemId, quantity) => void run(itemId, quantity)}
          onDataset={(d) => {
            setDataset(d);
            setResult(null);
            setError(null);
          }}
          loading={loading}
        />

        <section className="output">
          {error && (
            <div className="error-bar">
              <span>⚠️ {error}</span>
              {lastArgs && (
                <button onClick={() => void run(lastArgs.itemId, lastArgs.quantity)}>重试</button>
              )}
            </div>
          )}
          {result && (
            <>
              <PackingScene
                key={runId}
                layout={result.layout}
                perBoxCount={result.recommendation.perBoxCount}
                totalBoxes={result.recommendation.totalBoxes}
              />
              <ResultCards recommendation={result.recommendation} item={result.item} />
            </>
          )}
          {!error && !result && !loading && (
            <p className="placeholder">输入零件号和数量，开始推荐装箱方案。</p>
          )}
          {loading && <p className="placeholder">⏳ 正在分析并生成推荐…</p>}
        </section>
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
