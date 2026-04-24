import { describe, expect, test } from 'vitest';
import { calcActuals, calcHP, calcStat } from './stats';

describe('calcHP', () => {
  test('calculates HP at Lv.50 with 32 SP', () => {
    // テツノツツミ H=56: floor((112+31+64)*50/100)+60 = 163
    expect(calcHP(56, 32)).toBe(163);
  });

  test('calculates HP at Lv.50 with 0 SP', () => {
    // テツノツツミ H=56: floor((112+31)*50/100)+60 = 131
    expect(calcHP(56, 0)).toBe(131);
  });
});

describe('calcStat', () => {
  test('calculates stat with +nature and 32 SP', () => {
    // テツノツツミ S=136: floor((floor((272+31+64)*50/100)+5)*1.1) = 206
    expect(calcStat(136, 32, 1.1)).toBe(206);
  });

  test('calculates stat with neutral nature and 0 SP', () => {
    // テツノツツミ S=136: floor((floor((272+31)*50/100)+5)*1.0) = 156
    expect(calcStat(136, 0, 1.0)).toBe(156);
  });

  test('calculates stat with -nature and 0 SP', () => {
    // テツノツツミ S=136: floor((floor((272+31)*50/100)+5)*0.9) = 140
    expect(calcStat(136, 0, 0.9)).toBe(140);
  });
});

describe('calcActuals', () => {
  test('returns [max, max, min, min] for HP', () => {
    expect(calcActuals('H', 56)).toEqual([163, 163, 131, 131]);
  });

  test('returns [速, 準, 無, 遅] for other stats', () => {
    expect(calcActuals('S', 136)).toEqual([206, 188, 156, 140]);
  });
});
