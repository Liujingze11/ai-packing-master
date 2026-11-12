import type { BoxSpec } from '../lib/types';
import BoxPicker from './BoxPicker';

interface Props {
  boxes: BoxSpec[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

/** 箱子管理面板：列表（含删除）+ 新建入口 */
export default function BoxManager({ boxes, selectedId, onSelect, onRemove, onAdd }: Props) {
  return (
    <section className="box-manager">
      <h2>📦 箱子管理</h2>
      <BoxPicker boxes={boxes} selectedId={selectedId} onSelect={onSelect} onRemove={onRemove} />
      <button className="box-add" onClick={onAdd}>
        ＋ 新建箱子
      </button>
    </section>
  );
}
