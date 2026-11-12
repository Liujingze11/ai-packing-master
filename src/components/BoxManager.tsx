import { useState } from 'react';
import { validateBox } from '../lib/catalog';
import type { BoxSpec } from '../lib/types';
import BoxPicker from './BoxPicker';

interface Props {
  boxes: BoxSpec[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (box: BoxSpec) => void;
}

export default function BoxManager({ boxes, selectedId, onSelect, onCreate }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: '', innerLength: '', innerWidth: '', innerHeight: '', maxLoad: '' });
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const r = validateBox({
      name: form.name,
      innerLength: Number(form.innerLength),
      innerWidth: Number(form.innerWidth),
      innerHeight: Number(form.innerHeight),
      maxLoad: form.maxLoad.trim() === '' ? undefined : Number(form.maxLoad),
    });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    onCreate(r.box);
    onSelect(r.box.id);
    setForm({ name: '', innerLength: '', innerWidth: '', innerHeight: '', maxLoad: '' });
    setError(null);
    setFormOpen(false);
  };

  const field = (key: keyof typeof form, label: string, placeholder: string) => (
    <input
      value={form[key]}
      placeholder={placeholder}
      aria-label={label}
      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
    />
  );

  return (
    <section className="box-manager">
      <h2>📦 箱子</h2>
      <BoxPicker boxes={boxes} selectedId={selectedId} onSelect={onSelect} />

      {formOpen ? (
        <div className="box-form">
          <input placeholder="名称（如 中箱）" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="form-row">
            {field('innerLength', '长', '长 mm')}
            {field('innerWidth', '宽', '宽 mm')}
            {field('innerHeight', '高', '高 mm')}
          </div>
          {field('maxLoad', '承重', '最大承重 kg（默认 50）')}
          {error && <div className="field-error">{error}</div>}
          <div className="settings-actions">
            <button onClick={() => setFormOpen(false)}>取消</button>
            <button className="primary" onClick={submit}>保存</button>
          </div>
        </div>
      ) : (
        <button className="box-add" onClick={() => setFormOpen(true)}>
          ＋ 新建箱子
        </button>
      )}
    </section>
  );
}
