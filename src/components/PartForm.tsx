import { useState } from 'react';
import { validatePart } from '../lib/catalog';
import type { Part } from '../lib/types';

interface Props {
  open: boolean;
  onSubmit: (part: Part) => void;
  onClose: () => void;
}

export default function PartForm({ open, onSubmit, onClose }: Props) {
  const [form, setForm] = useState({
    name: '',
    length: '',
    width: '',
    height: '',
    weight: '',
    material: '',
  });
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = () => {
    const r = validatePart({
      name: form.name,
      length: Number(form.length),
      width: Number(form.width),
      height: Number(form.height),
      weight: Number(form.weight),
      material: form.material,
    });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    onSubmit(r.part);
    setForm({ name: '', length: '', width: '', height: '', weight: '', material: '' });
    setError(null);
    onClose();
  };

  const field = (key: keyof typeof form, label: string, placeholder: string) => (
    <label>
      {label}
      <input
        value={form[key]}
        placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </label>
  );

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <h2>＋ 添加零件</h2>
        {field('name', '名称', '如 齿轮箱')}
        <div className="form-row">
          {field('length', '长 mm', '100')}
          {field('width', '宽 mm', '50')}
          {field('height', '高 mm', '30')}
        </div>
        <div className="form-row">
          {field('weight', '重量 kg', '2')}
          {field('material', '材质', '铝合金')}
        </div>
        {error && <div className="field-error">{error}</div>}
        <div className="settings-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={submit}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
