import { describe, expect, test } from 'vitest';
import { findMinimalReversal } from './compare';

describe('findMinimalReversal', () => {
  // Aの有効速を固定、Bの素早さ種族値とBのランクに対し、
  // Bが逆転する (B > A となる) 最小調整 (SP, nature) を探す。

  test('returns always_a when B cannot outspeed A even at max', () => {
    // A = 300 (非常に高速), B base = 50 (遅い), rank 0
    // B最速でも calcStat(50, 32, 1.1) = 99 < 300
    expect(findMinimalReversal(300, 50, 0)).toEqual({ kind: 'always_a' });
  });

  test('returns always_b when B outspeeds A even at min', () => {
    // A = 50, B base = 200, rank 0
    // B最遅 calcStat(200, 0, 0.9) = 184 > 50
    expect(findMinimalReversal(50, 200, 0)).toEqual({ kind: 'always_b' });
  });

  test('finds minimum SP that reverses the matchup', () => {
    // A = 156 (無振り 136族), B = 136族, rank 0
    // SP=0 ↓: 140, SP=0 無: 156, SP=0 ↑: 171
    // B > A (=156) になる最初: SP=0 ↑ (171 > 156)
    const result = findMinimalReversal(156, 136, 0);
    expect(result).toEqual({ kind: 'threshold', sp: 0, nature: 1.1 });
  });

  test('finds minimum SP with rank boost on B', () => {
    // A = 250, B base = 136, rank +1
    // B最遅 rank+1: floor(140 × 1.5) = 210 ≤ 250
    // B SP=0 無: floor(156 × 1.5) = 234 ≤ 250
    // B SP=0 ↑: floor(171 × 1.5) = 256 > 250 → 最小境界
    expect(findMinimalReversal(250, 136, 1)).toEqual({
      kind: 'threshold',
      sp: 0,
      nature: 1.1,
    });
  });

  test('threshold scans SP ascending then nature ascending', () => {
    // A = 188 (テツノツツミ 準速), B = 136, rank 0
    // SP=15 ↑: floor(171*1.1) より計算 → 188 で同速
    // SP=16 ↑: 189 > 188 → 最小境界
    const result = findMinimalReversal(188, 136, 0);
    expect(result).toEqual({ kind: 'threshold', sp: 16, nature: 1.1 });
  });
});
