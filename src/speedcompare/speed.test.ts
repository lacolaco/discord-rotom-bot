import { describe, expect, test } from 'vitest';
import { effectiveSpeed, rankMult } from './speed';

describe('rankMult', () => {
  test('rank 0 returns 1', () => {
    expect(rankMult(0)).toBe(1);
  });

  test('positive ranks return (2 + rank) / 2', () => {
    expect(rankMult(1)).toBe(1.5);
    expect(rankMult(2)).toBe(2);
    expect(rankMult(6)).toBe(4);
  });

  test('negative ranks return 2 / (2 - rank)', () => {
    expect(rankMult(-1)).toBe(2 / 3);
    expect(rankMult(-2)).toBe(0.5);
    expect(rankMult(-6)).toBe(0.25);
  });
});

describe('effectiveSpeed', () => {
  // テツノツツミ S=136, 最速: calcStat(136, 32, 1.1) = 206
  test('returns raw actual stat at rank 0', () => {
    expect(effectiveSpeed(136, 32, 1.1, 0)).toBe(206);
  });

  test('floors after rank multiplier', () => {
    // 206 × 1.5 = 309
    expect(effectiveSpeed(136, 32, 1.1, 1)).toBe(309);
    // 206 × 2 = 412 (tailwind equivalent)
    expect(effectiveSpeed(136, 32, 1.1, 2)).toBe(412);
    // 206 × 0.5 = 103 (paralysis equivalent)
    expect(effectiveSpeed(136, 32, 1.1, -2)).toBe(103);
  });

  test('floors decimals from negative ranks', () => {
    // 156 × 2/3 = 104.0 -> 104
    expect(effectiveSpeed(136, 0, 1.0, -1)).toBe(104);
  });
});
