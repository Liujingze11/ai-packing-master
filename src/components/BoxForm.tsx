import { useState } from 'react';
import { validateBox } from '../lib/catalog';
import type { BoxSpec } from '../lib/types';

interface Props {
  open: boolean;
  existing: BoxSpec[];
  onSubmit: (box: BoxSpec) => void;
  onClose: () => void;
}

/** 新建箱子弹层（名称/长宽高/承重） */
export default function BoxForm({ open, existing, onSubmit, onClose }: Props) {
  const [form, setForm] = useState({
    name: '',
    innerLength: '',
    innerWidth: '',
    innerHeight: '',
    maxLoad: '',
  });
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = () => {
    const r = validateBox(
      {
        name: form.name,
        innerLength: Number(form.innerLength),
        innerWidth: Number(form.innerWidth),
        innerHeight: Number(form.innerHeight),
        maxLoad: form.maxLoad.trim() === '' ? undefined : Number(form.maxLoad),
      },
      existing,
    );
    if (!r.ok) {
      setError(r.error);
      return;
    }
    onSubmit(r.box);
    setForm({ name: '', innerLength: '', innerWidth: '', innerHeight: '', maxLoad: '' });
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
        <h2>＋ 新建箱子</h2>
        {field('name', '名称', '如 中箱')}
        <div className="form-row">
          {field('innerLength', '长 mm', '400')}
          {field('innerWidth', '宽 mm', '300')}
          {field('innerHeight', '高 mm', '250')}
        </div>
        {field('maxLoad', '最大承重 kg', '默认 50')}
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
