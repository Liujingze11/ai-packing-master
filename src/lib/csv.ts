import Papa from 'papaparse';
import type { BoxType, HistoryRecord, Item } from './types';

export class CsvParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvParseError';
  }
}

type Row = Record<string, string | undefined>;

function parseRows(csv: string): Row[] {
  const text = csv.trim();
  if (text === '') {
    throw new CsvParseError('CSV 内容为空');
  }
  const result = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
  if (result.errors.length > 0) {
    throw new CsvParseError(`CSV 解析失败：${result.errors[0].message}`);
  }
  if (result.data.length === 0) {
    throw new CsvParseError('CSV 没有数据行');
  }
  return result.data;
}

function str(row: Row, col: string, ctx: string): string {
  const v = row[col];
  if (v === undefined || v.trim() === '') {
    throw new CsvParseError(`${ctx}：缺少列「${col}」或值为空`);
  }
  return v.trim();
}

function num(row: Row, col: string, ctx: string): number {
  const v = str(row, col, ctx);
  const n = Number(v);
  if (Number.isNaN(n)) {
    throw new CsvParseError(`${ctx}：列「${col}」不是有效数字：${v}`);
  }
  return n;
}

export function parseItems(csv: string): Item[] {
  return parseRows(csv).map((row) => ({
    id: str(row, '零件号', '零件表'),
    length: num(row, '长度(mm)', '零件表'),
    width: num(row, '宽度(mm)', '零件表'),
    height: num(row, '高度(mm)', '零件表'),
    weight: num(row, '重量(kg)', '零件表'),
    material: str(row, '材料', '零件表'),
  }));
}

export function parseBoxes(csv: string): BoxType[] {
  return parseRows(csv).map((row) => ({
    id: str(row, '箱型', '箱型表'),
    innerLength: num(row, '内部长度(mm)', '箱型表'),
    innerWidth: num(row, '内部宽度(mm)', '箱型表'),
    innerHeight: num(row, '内部高度(mm)', '箱型表'),
    maxLoad: num(row, '最大承重(kg)', '箱型表'),
  }));
}

export function parseHistory(csv: string): HistoryRecord[] {
  return parseRows(csv).map((row) => ({
    planId: str(row, '方案ID', '历史方案表'),
    itemId: str(row, '零件号', '历史方案表'),
    quantity: num(row, '数量', '历史方案表'),
    boxId: str(row, '使用箱型', '历史方案表'),
    note: str(row, '备注', '历史方案表'),
  }));
}
