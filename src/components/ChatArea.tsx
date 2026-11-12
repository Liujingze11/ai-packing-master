import { useState } from 'react';

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

interface Props {
  messages: ChatMessage[];
  canSend: boolean;
  busy: boolean;
  onSend: (userMessage: string) => void;
}

/** AI 沟通区：有货点亮发送 */
export default function ChatArea({ messages, canSend, busy, onSend }: Props) {
  const [text, setText] = useState('');

  const send = () => {
    if (!canSend || busy) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <section className="chat-area">
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="cart-empty">装箱要求可以写在这里（如「易碎需缓冲」），有货后点发送即开工。</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            <pre>{m.text}</pre>
          </div>
        ))}
        {busy && <div className="chat-bubble ai">⏳ 正在计算装箱方案…</div>}
      </div>
      <div className="chat-input">
        <input
          value={text}
          placeholder={canSend ? '可选：装箱要求…' : '先在菜单上加货'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          disabled={!canSend || busy}
        />
        <button
          className={`send-btn${canSend && !busy ? ' lit' : ''}`}
          onClick={send}
          disabled={!canSend || busy}
        >
          发送
        </button>
      </div>
    </section>
  );
}
