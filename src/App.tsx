import { useState } from 'react';
import SettingsPanel from './components/SettingsPanel';

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <main className="app">
      <header className="app-header">
        <h1>📦 AI 装箱引擎</h1>
        <button className="gear" onClick={() => setSettingsOpen(true)} title="设置">
          ⚙️ 设置
        </button>
      </header>
      <p>桌面演示版 · Task 5：设置面板</p>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
