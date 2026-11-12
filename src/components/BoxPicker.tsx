import type { BoxSpec } from '../lib/types';

interface Props {
  boxes: BoxSpec[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** 外卖菜单式箱子列表：点卡片或「＋」即选中 */
export default function BoxPicker({ boxes, selectedId, onSelect }: Props) {
  if (boxes.length === 0) {
    return <p className="cart-empty">还没有箱子——新建一个，或载入示例数据</p>;
  }
  return (
    <div className="box-list">
      {boxes.map((b) => (
        <article
          key={b.id}
          className={`menu-card${selectedId === b.id ? ' selected' : ''}`}
          onClick={() => onSelect(b.id)}
        >
          <div className="menu-chip">📦</div>
          <div className="menu-info">
            <strong>{b.name}</strong>
            <span>
              {b.innerLength}×{b.innerWidth}×{b.innerHeight} mm · ≤{b.maxLoad} kg
            </span>
          </div>
          <button
            className="menu-add"
            title="选这个箱子"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(b.id);
            }}
          >
            ＋
          </button>
        </article>
      ))}
    </div>
  );
}
