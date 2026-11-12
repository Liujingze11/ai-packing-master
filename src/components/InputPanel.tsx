import { useState } from 'react';
import { parseQuantity } from '../lib/input';
import type { Dataset } from '../lib/types';

interface Props {
  onSearch: (itemId: string, quantity: number) => void;
  onDataset: (d: Dataset) => void;
  loading: boolean;
}

export default function InputPanel({ onSearch, onDataset, loading }: Props) {
  const [itemId, setItemId] = useState('A001');
  const [qtyText, setQtyText] = useState('200');
  const [qtyError, setQtyError] = useState<string | null>(null);

  const submit = () => {
    const parsed = parseQuantity(qtyText);
    if (!parsed.ok) {
      setQtyError(parsed.error);
      return;
    }
    setQtyError(null);
    onSearch(itemId.trim(), parsed.value);
  };

  const importCsv = async () => {
    const d = await window.packingAPI.importCsv();
    if (d) onDataset(d);
  };

  return (
    <section className="input-panel">
      <h2>输入</h2>
      <label>
        零件号
        <input
          value={itemId}
          placeholder="如 A001"
          onChange={(e) => setItemId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </label>
      <label>
        数量（1–999）
        <input
          value={qtyText}
          placeholder="如 200"
          onChange={(e) => setQtyText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </label>
      {qtyError && <div className="field-error">{qtyError}</div>}
      <button className="primary" onClick={submit} disabled={loading}>
        {loading ? '推荐中…' : '🚀 开始推荐'}
      </button>
      <button onClick={() => void importCsv()}>📂 导入 CSV 三件套</button>
    </section>
  );
}
