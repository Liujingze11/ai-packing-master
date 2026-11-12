import type { Part } from '../lib/types';

interface Props {
  parts: Part[];
  onAdd: (partId: string) => void;
  onRemove: (partId: string) => void;
}

/** 外卖菜单式零件列表 */
export default function PartsMenu({ parts, onAdd, onRemove }: Props) {
  if (parts.length === 0) {
    return <p className="menu-empty">还没有零件——点下方「＋ 添加零件」或「载入示例数据」</p>;
  }
  return (
    <div className="parts-menu">
      {parts.map((p) => (
        <article key={p.id} className="menu-card">
          <div className="menu-chip">{p.name.slice(0, 1)}</div>
          <div className="menu-info">
            <strong>{p.name}</strong>
            <span>
              {p.length}×{p.width}×{p.height} mm · {p.weight} kg · {p.material}
            </span>
          </div>
          <button
            className="menu-remove"
            title="删除"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(p.id);
            }}
          >
            ✕
          </button>
          <button className="menu-add" onClick={() => onAdd(p.id)} title="加入订单">
            ＋
          </button>
        </article>
      ))}
    </div>
  );
}
