import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { CsvParseError, parseBoxes, parseHistory, parseItems } from '../src/lib/csv';

function readData(name: string): string {
  return readFileSync(path.join(__dirname, '..', 'src', 'data', name), 'utf-8');
}

const ITEMS_CSV = `零件号,长度(mm),宽度(mm),高度(mm),重量(kg),材料
A001,100,50,30,2.0,铝合金
A002,200,100,80,5.5,铸铁`;

const BOXES_CSV = `箱型,内部长度(mm),内部宽度(mm),内部高度(mm),最大承重(kg)
B02,400,300,250,50`;

const HISTORY_CSV = `方案ID,零件号,数量,使用箱型,备注
H001,A001,200,B02,标准装箱，加一层隔板`;

describe('parseItems', () => {
  it('解析零件表：中文表头映射到 Item 字段（mm/kg）', () => {
    expect(parseItems(ITEMS_CSV)).toEqual([
      { id: 'A001', length: 100, width: 50, height: 30, weight: 2.0, material: '铝合金' },
      { id: 'A002', length: 200, width: 100, height: 80, weight: 5.5, material: '铸铁' },
    ]);
  });

  it('缺列抛 CsvParseError', () => {
    expect(() => parseItems('零件号,长度(mm)\nA001,100')).toThrow(CsvParseError);
  });

  it('数字列非数字抛 CsvParseError', () => {
    expect(() =>
      parseItems('零件号,长度(mm),宽度(mm),高度(mm),重量(kg),材料\nA001,abc,50,30,2,塑料'),
    ).toThrow(CsvParseError);
  });

  it('空数据抛 CsvParseError', () => {
    expect(() => parseItems('')).toThrow(CsvParseError);
    expect(() => parseItems('零件号,长度(mm),宽度(mm),高度(mm),重量(kg),材料')).toThrow(CsvParseError);
  });
});

describe('parseBoxes', () => {
  it('解析箱型表：中文表头映射到 BoxType 字段', () => {
    expect(parseBoxes(BOXES_CSV)).toEqual([
      { id: 'B02', innerLength: 400, innerWidth: 300, innerHeight: 250, maxLoad: 50 },
    ]);
  });

  it('数字列非数字抛 CsvParseError', () => {
    expect(() =>
      parseBoxes('箱型,内部长度(mm),内部宽度(mm),内部高度(mm),最大承重(kg)\nB01,300,x,150,20'),
    ).toThrow(CsvParseError);
  });
});

describe('parseHistory', () => {
  it('解析历史方案表：中文表头映射到 HistoryRecord 字段', () => {
    expect(parseHistory(HISTORY_CSV)).toEqual([
      { planId: 'H001', itemId: 'A001', quantity: 200, boxId: 'B02', note: '标准装箱，加一层隔板' },
    ]);
  });

  it('数量非数字抛 CsvParseError', () => {
    expect(() =>
      parseHistory('方案ID,零件号,数量,使用箱型,备注\nH001,A001,two,B02,备注'),
    ).toThrow(CsvParseError);
  });
});

describe('内置仿真数据', () => {
  it('items.csv：5 个零件，A001 数值与规格一致', () => {
    const items = parseItems(readData('items.csv'));
    expect(items).toHaveLength(5);
    expect(items[0]).toEqual({
      id: 'A001',
      length: 100,
      width: 50,
      height: 30,
      weight: 2.0,
      material: '铝合金',
    });
  });

  it('boxes.csv：3 个箱型，B02 数值与规格一致', () => {
    const boxes = parseBoxes(readData('boxes.csv'));
    expect(boxes).toHaveLength(3);
    expect(boxes[1]).toEqual({
      id: 'B02',
      innerLength: 400,
      innerWidth: 300,
      innerHeight: 250,
      maxLoad: 50,
    });
  });

  it('history.csv：6 行，含两行 A001→B02', () => {
    const history = parseHistory(readData('history.csv'));
    expect(history).toHaveLength(6);
    expect(history.filter((r) => r.itemId === 'A001' && r.boxId === 'B02')).toHaveLength(2);
  });
});
