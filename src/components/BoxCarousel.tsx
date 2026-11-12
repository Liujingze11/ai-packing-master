import type { BoxSpec } from '../lib/types';

interface Props {
  boxes: BoxSpec[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

/** 游戏选武器式箱子切换器：左右切换、当前居中放大、空态大「＋」 */
export default function BoxCarousel({ boxes, selectedId, onSelect, onAdd }: Props) {
  if (boxes.length === 0) {
    return (
      <div className="weapon-strip empty">
        <button className="weapon-big-add" onClick={onAdd} title="新建箱子">
          ＋
        </button>
        <span className="weapon-hint">还没有箱子——点「＋」新建</span>
      </div>
    );
  }

  const idx = Math.max(0, boxes.findIndex((b) => b.id === selectedId));
  const prev = boxes[(idx - 1 + boxes.length) % boxes.length];
  const cur = boxes[idx];
  const next = boxes[(idx + 1) % boxes.length];

  return (
    <div className="weapon-strip">
      <button
        className="weapon-arrow"
        onClick={() => onSelect(prev.id)}
        title="上一个箱子"
      >
        ◀
      </button>

      <div className="weapon-slot side" onClick={() => onSelect(prev.id)}>
        <strong>{prev.name}</strong>
      </div>

      <div className="weapon-slot current" key={cur.id}>
        <span className="weapon-slot-icon">📦</span>
        <strong>{cur.name}</strong>
        <span>
          {cur.innerLength}×{cur.innerWidth}×{cur.innerHeight} · ≤{cur.maxLoad}kg
        </span>
      </div>

      <div className="weapon-slot side" onClick={() => onSelect(next.id)}>
        <strong>{next.name}</strong>
      </div>

      <button
        className="weapon-arrow"
        onClick={() => onSelect(next.id)}
        title="下一个箱子"
      >
        ▶
      </button>

      <button className="weapon-add" onClick={onAdd} title="新建箱子">
        ＋
      </button>
    </div>
  );
}
