import type { Part } from '../lib/types';

interface Props {
  lines: { part: Part; quantity: number }[];
  onAdjust: (partId: string, delta: number) => void;
}

/** 外卖购物车式订单区 */
export default function CartPanel({ lines, onAdjust }: Props) {
  if (lines.length === 0) {
    return <p className="cart-empty">订单是空的——在菜单上点「＋」加货</p>;
  }
  return (
    <div className="cart-lines">
      {lines.map(({ part, quantity }) => (
        <div key={part.id} className="cart-line">
          <span className="cart-name">{part.name}</span>
          <div className="cart-stepper">
            <button onClick={() => onAdjust(part.id, -1)}>−</button>
            <span>{quantity}</span>
            <button onClick={() => onAdjust(part.id, 1)}>＋</button>
          </div>
        </div>
      ))}
    </div>
  );
}
