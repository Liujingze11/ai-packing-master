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
