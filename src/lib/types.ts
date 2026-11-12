/** 全局数据类型（单位：尺寸 mm，重量 kg） */

export interface Item {
  id: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  material: string;
}

export interface BoxType {
  id: string;
  innerLength: number;
  innerWidth: number;
  innerHeight: number;
  maxLoad: number;
}

export interface HistoryRecord {
  planId: string;
  itemId: string;
  quantity: number;
  boxId: string;
  note: string;
}

/** 一套数据：零件表 + 箱型表 + 历史方案 */
export interface Dataset {
  items: Item[];
  boxes: BoxType[];
  history: HistoryRecord[];
}

/** v2 目录：零件（可命名）与箱型 */
export interface Part {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  material: string;
}

export interface BoxSpec {
  id: string;
  name: string;
  innerLength: number;
  innerWidth: number;
  innerHeight: number;
  maxLoad: number;
}

export interface Catalog {
  parts: Part[];
  boxes: BoxSpec[];
}

export interface CartLine {
  partId: string;
  quantity: number;
}

/** 应用设置（渲染层与主进程共享的纯类型/常量，勿在此引入 node 模块） */
export interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
  margin: number;
  mockMode: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  margin: 0.8,
  mockMode: true,
};
