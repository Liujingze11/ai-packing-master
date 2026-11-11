import { buildPrompt } from '../src/lib/llm';
import type { CandidateBox } from '../src/lib/packing';
import type { HistoryRecord, Item } from '../src/lib/types';

export interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface RecommendPayload {
  item: Item;
  quantity: number;
  candidates: CandidateBox[];
  history: HistoryRecord[];
}

const DEFAULT_CONFIG: LlmConfig = {
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat',
};

let configProvider: () => LlmConfig = () => DEFAULT_CONFIG;

/** Task 5 接入持久化设置后，由 main 用 setLlmConfigProvider 替换此注入点 */
export function setLlmConfigProvider(provider: () => LlmConfig): void {
  configProvider = provider;
}

export async function callLlm(config: LlmConfig, prompt: string): Promise<string> {
  const base = config.baseUrl.replace(/\/+$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: '你是一名工业包装推荐系统。' },
        { role: 'user', content: prompt },
      ],
      stream: false,
    }),
  });
  if (!res.ok) {
    throw new Error(`LLM 请求失败：HTTP ${res.status}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error('LLM 返回结构异常（无有效内容）');
  }
  return content;
}

export async function recommendHandler(payload: RecommendPayload): Promise<string> {
  const prompt = buildPrompt(payload.item, payload.quantity, payload.candidates, payload.history);
  return callLlm(configProvider(), prompt);
}
