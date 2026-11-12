import type { PackingRecommendation } from '../lib/llm';
import type { Item } from '../lib/types';

interface Props {
  recommendation: PackingRecommendation;
  item: Item;
}

export default function ResultCards({ recommendation, item }: Props) {
  return (
    <section className="result-cards">
      <article className="card">
        <h3>📦 推荐箱型</h3>
        <p className="card-big">{recommendation.boxId}</p>
        <p className="card-sub">
          零件 {item.id}（{item.length}×{item.width}×{item.height} mm，{item.weight} kg）
        </p>
      </article>
      <article className="card">
        <h3>💡 推荐理由</h3>
        <p>{recommendation.reason || '—'}</p>
      </article>
      <article className="card">
        <h3>📋 装箱方案</h3>
        <ul>
          <li>
            每箱可装：<strong>{recommendation.perBoxCount}</strong> 件
          </li>
          <li>
            总共需要：<strong>{recommendation.totalBoxes}</strong> 箱
          </li>
          <li>策略建议：{recommendation.strategy || '—'}</li>
        </ul>
      </article>
    </section>
  );
}
