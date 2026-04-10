import { describe, expect, test } from 'vitest';
import { buildPokemonViewModel } from './view-model';
import type { Pokemon } from './index';

const fakePokemon = (
  overrides: Partial<Pokemon> & { baseStats: Pokemon['baseStats'] },
): Pokemon => ({
  index: 0,
  types: ['ノーマル'],
  abilities: ['テスト'],
  source: { game: 'test', pokedex: 'test' },
  ...overrides,
});

describe('buildPokemonViewModel', () => {
  test('computes stats and BST correctly', () => {
    const pokemon = fakePokemon({
      types: ['こおり', 'みず'],
      abilities: ['クォークチャージ'],
      baseStats: { H: 56, A: 80, B: 114, C: 124, D: 60, S: 136 },
      yakkun: { url: 'https://yakkun.com/ch/zukan/n991', key: 'n991' },
    });
    const vm = buildPokemonViewModel('テツノツツミ', pokemon);
    expect(vm.bst).toBe(570);
    expect(vm.stats).toMatchInlineSnapshot(`
      [
        {
          "base": 56,
          "key": "H",
          "max": 163,
          "maxPlus": null,
          "min": 131,
          "minMinus": null,
        },
        {
          "base": 80,
          "key": "A",
          "max": 132,
          "maxPlus": 145,
          "min": 100,
          "minMinus": 90,
        },
        {
          "base": 114,
          "key": "B",
          "max": 166,
          "maxPlus": 182,
          "min": 134,
          "minMinus": 120,
        },
        {
          "base": 124,
          "key": "C",
          "max": 176,
          "maxPlus": 193,
          "min": 144,
          "minMinus": 129,
        },
        {
          "base": 60,
          "key": "D",
          "max": 112,
          "maxPlus": 123,
          "min": 80,
          "minMinus": 72,
        },
        {
          "base": 136,
          "key": "S",
          "max": 188,
          "maxPlus": 206,
          "min": 156,
          "minMinus": 140,
        },
      ]
    `);
  });

  test('HP has null for maxPlus/minMinus, others have all 4 values', () => {
    const pokemon = fakePokemon({
      baseStats: { H: 56, A: 80, B: 114, C: 124, D: 60, S: 136 },
    });
    const vm = buildPokemonViewModel('テスト', pokemon);
    expect(vm.stats[0]).toEqual({
      key: 'H',
      base: 56,
      maxPlus: null,
      max: 163,
      min: 131,
      minMinus: null,
    });
    expect(vm.stats[1]).toEqual({
      key: 'A',
      base: 80,
      maxPlus: 145,
      max: 132,
      min: 100,
      minMinus: 90,
    });
  });

  test('extracts yakkunUrl from pokemon data', () => {
    const withYakkun = fakePokemon({
      baseStats: { H: 100, A: 100, B: 100, C: 100, D: 100, S: 100 },
      yakkun: { url: 'https://example.com', key: 'test' },
    });
    expect(buildPokemonViewModel('テスト', withYakkun).yakkunUrl).toBe(
      'https://example.com',
    );

    const withoutYakkun = fakePokemon({
      baseStats: { H: 100, A: 100, B: 100, C: 100, D: 100, S: 100 },
    });
    expect(
      buildPokemonViewModel('テスト', withoutYakkun).yakkunUrl,
    ).toBeUndefined();
  });
});
