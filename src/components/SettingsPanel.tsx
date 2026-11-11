import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, type Settings } from '../lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ open, onClose }: Props) {
  const [form, setForm] = useState<Settings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void window.packingAPI.getSettings().then((s) => setForm(s));
  }, [open]);

  if (!open) return null;

  const save = async () => {
    setSaving(true);
    try {
      await window.packingAPI.setSettings(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <h2>⚙️ 设置</h2>
        <label>
          DeepSeek API Key
          <input
            type="password"
            value={form.apiKey}
            placeholder="sk-…（演示可留空，用 mock 模式）"
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
          />
        </label>
        <label>
          API Base URL
          <input
            value={form.baseUrl}
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
          />
        </label>
        <label>
          模型
          <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
        </label>
        <label>
          冗余系数：<strong>{form.margin.toFixed(2)}</strong>
          <input
            type="range"
            min={0.5}
            max={1}
            step={0.05}
            value={form.margin}
            onChange={(e) => setForm({ ...form, margin: Number(e.target.value) })}
          />
        </label>
        <label className="settings-row">
          <input
            type="checkbox"
            checked={form.mockMode}
            onChange={(e) => setForm({ ...form, mockMode: e.target.checked })}
          />
          mock 演示模式（不调用真实 API）
        </label>
        <div className="settings-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={() => void save()} disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
