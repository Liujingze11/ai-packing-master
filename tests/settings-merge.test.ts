import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, mergeSettings } from '../electron/settings';

describe('mergeSettings', () => {
  it('缺字段回默认，合法字段生效', () => {
    expect(mergeSettings({ margin: 0.5 })).toEqual({
      ...DEFAULT_SETTINGS,
      margin: 0.5,
    });
  });

  it('脏数据回默认', () => {
    expect(mergeSettings({ margin: 'x' }).margin).toBe(0.8);
    expect(mergeSettings({ apiKey: 123 }).apiKey).toBe('');
    expect(mergeSettings({ mockMode: 'yes' }).mockMode).toBe(true);
    expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings('oops')).toEqual(DEFAULT_SETTINGS);
  });

  it('margin 超出 [0.5, 1.0] 时钳制', () => {
    expect(mergeSettings({ margin: 3 }).margin).toBe(1.0);
    expect(mergeSettings({ margin: -1 }).margin).toBe(0.5);
    expect(mergeSettings({ margin: Number.NaN }).margin).toBe(0.8);
  });
});
