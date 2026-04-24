import { describe, expect, test } from 'vitest';
import { buildSpeedCompareViewModel } from './view-model';
import type { Pokemon } from '../pokeinfo';

const fake = (
  name: string,
  baseS: number,
  overrides: Partial<Pokemon> = {},
): { name: string; pokemon: Pokemon } => ({
  name,
  pokemon: {
    index: 0,
    types: ['ノーマル'],
    abilities: ['テスト'],
    baseStats: { H: 100, A: 100, B: 100, C: 100, D: 100, S: baseS },
    source: { game: 'test', pokedex: 'test' },
    ...overrides,
  },
});

describe('buildSpeedCompareViewModel', () => {
  test('A最速 vs B同族: B はrank 0で SP 0↑ 以上で逆転する', () => {
    const a = fake('テツノツツミ', 136);
    const b = fake('テツノツツミ', 136);
    const vm = buildSpeedCompareViewModel({
      a: { ...a, sp: 32, nature: 1.1 },
      b,
    });
    expect(vm.aName).toBe('テツノツツミ');
    expect(vm.aConfig).toBe('SP32 ↑補正');
    expect(vm.aSpeed).toBe(206);
    // Bランク0: B最速(SP32↑)=206 → 同速 → always_a (>の判定なので等速はA勝ち扱い)
    // Bランク+1: B最遅(SP0↓)= floor(140*1.5)=210 > 206 → always_b
    const rank0 = vm.reversals.find((r) => r.rank === 0);
    expect(rank0?.result).toEqual({ kind: 'always_a' });
    const rankPlus1 = vm.reversals.find((r) => r.rank === 1);
    expect(rankPlus1?.result).toEqual({ kind: 'always_b' });
  });

  test('13ランク分を -6 〜 +6 で返す', () => {
    const a = fake('A', 100);
    const b = fake('B', 100);
    const vm = buildSpeedCompareViewModel({
      a: { ...a, sp: 0, nature: 1.0 },
      b,
    });
    expect(vm.reversals.map((r) => r.rank)).toEqual([
      -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6,
    ]);
  });
});
