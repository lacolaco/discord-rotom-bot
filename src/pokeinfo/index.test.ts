import { describe, expect, test } from 'vitest';
import { buildPokemonViewModel } from './view-model';
import { formatPokemonEmbed } from './embed';
import { getAllPokemonNames, searchPokemonByName } from './index';
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

describe('searchPokemonByName', () => {
  test('returns pokemon data for a valid name', async () => {
    const result = await searchPokemonByName('ニャオハ');
    expect(result).not.toBeNull();
    expect(result!.types).toEqual(['くさ']);
    expect(result!.baseStats.H).toBe(40);
    expect(result!.yakkun?.url).toContain('yakkun.com');
    expect(result!.yakkun?.key).toBe('n906');
  });

  test('returns null for an unknown name', async () => {
    const result = await searchPokemonByName('存在しないポケモン');
    expect(result).toBeNull();
  });

  test('returns data with yakkun info for mega evolution', async () => {
    const result = await searchPokemonByName('メガリザードンＸ');
    expect(result).not.toBeNull();
    expect(result!.yakkun?.key).toBe('n6x');
  });

  test('returns data for PokéAPI-supplemented pokemon', async () => {
    const result = await searchPokemonByName('メガジュカイン');
    expect(result).not.toBeNull();
    expect(result!.types).toEqual(['くさ', 'ドラゴン']);
    expect(result!.baseStats.H).toBe(70);
    expect(result!.abilities).toContain('ひらいしん');
  });

  test('returns data for Meltan (PokéAPI-supplemented)', async () => {
    const result = await searchPokemonByName('メルタン');
    expect(result).not.toBeNull();
    expect(result!.types).toEqual(['はがね']);
    expect(result!.baseStats.H).toBe(46);
  });

  test('returns data for primal form (PokéAPI-supplemented)', async () => {
    const result = await searchPokemonByName('ゲンシカイオーガ');
    expect(result).not.toBeNull();
    expect(result!.types).toEqual(['みず']);
    expect(result!.baseStats.C).toBe(180);
  });

  test('returns data for mega form injected from @pkmn/dex', async () => {
    const result = await searchPokemonByName('メガスコヴィラン');
    expect(result).not.toBeNull();
    expect(result!.types).toEqual(['くさ', 'ほのお']);
    expect(result!.baseStats.H).toBe(65);
    expect(result!.baseStats.A).toBe(138);
    expect(result!.index).toBe(952);
  });
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
          "min": 131,
        },
        {
          "base": 80,
          "key": "A",
          "max": 145,
          "min": 90,
        },
        {
          "base": 114,
          "key": "B",
          "max": 182,
          "min": 120,
        },
        {
          "base": 124,
          "key": "C",
          "max": 193,
          "min": 129,
        },
        {
          "base": 60,
          "key": "D",
          "max": 123,
          "min": 72,
        },
        {
          "base": 136,
          "key": "S",
          "max": 206,
          "min": 140,
        },
      ]
    `);
  });

  test('HP range uses no-nature values (Min=0EV, Max=252EV)', () => {
    const pokemon = fakePokemon({
      baseStats: { H: 56, A: 80, B: 114, C: 124, D: 60, S: 136 },
    });
    const vm = buildPokemonViewModel('テスト', pokemon);
    // HP: calcHP(56, 0)=131, calcHP(56, 252)=163
    expect(vm.stats[0]).toEqual({ key: 'H', base: 56, min: 131, max: 163 });
    // A: calcStat(80, 0, 0.9)=90, calcStat(80, 252, 1.1)=145
    expect(vm.stats[1]).toEqual({ key: 'A', base: 80, min: 90, max: 145 });
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

describe('formatPokemonEmbed', () => {
  test('single ability pokemon with URL', () => {
    const pokemon = fakePokemon({
      types: ['こおり', 'みず'],
      abilities: ['クォークチャージ'],
      baseStats: { H: 56, A: 80, B: 114, C: 124, D: 60, S: 136 },
      yakkun: { url: 'https://yakkun.com/ch/zukan/n991', key: 'n991' },
    });
    const vm = buildPokemonViewModel('テツノツツミ', pokemon);
    expect(formatPokemonEmbed(vm)).toMatchInlineSnapshot(`
      {
        "color": 10016984,
        "fields": [
          {
            "inline": true,
            "name": "タイプ",
            "value": "こおり・みず",
          },
          {
            "inline": true,
            "name": "特性",
            "value": "クォークチャージ",
          },
          {
            "inline": false,
            "name": "種族値",
            "value": "Lv.50 実数値範囲",
          },
          {
            "inline": true,
            "name": "H",
            "value": "**56** (131~163)",
          },
          {
            "inline": true,
            "name": "A",
            "value": "**80** (90~145)",
          },
          {
            "inline": true,
            "name": "B",
            "value": "**114** (120~182)",
          },
          {
            "inline": true,
            "name": "C",
            "value": "**124** (129~193)",
          },
          {
            "inline": true,
            "name": "D",
            "value": "**60** (72~123)",
          },
          {
            "inline": true,
            "name": "S",
            "value": "**136** (140~206)",
          },
        ],
        "footer": {
          "text": "合計: 570",
        },
        "title": "テツノツツミ の情報ロト！",
        "url": "https://yakkun.com/ch/zukan/n991",
      }
    `);
  });

  test('multiple abilities pokemon with URL', () => {
    const pokemon = fakePokemon({
      types: ['フェアリー'],
      abilities: ['メロメロボディ', 'マジックガード', 'フレンドガード'],
      baseStats: { H: 70, A: 45, B: 48, C: 60, D: 65, S: 35 },
      yakkun: { url: 'https://yakkun.com/ch/zukan/n35', key: 'n35' },
    });
    const vm = buildPokemonViewModel('ピッピ', pokemon);
    expect(formatPokemonEmbed(vm)).toMatchInlineSnapshot(`
      {
        "color": 15636908,
        "fields": [
          {
            "inline": true,
            "name": "タイプ",
            "value": "フェアリー",
          },
          {
            "inline": true,
            "name": "特性",
            "value": "メロメロボディ / マジックガード / フレンドガード",
          },
          {
            "inline": false,
            "name": "種族値",
            "value": "Lv.50 実数値範囲",
          },
          {
            "inline": true,
            "name": "H",
            "value": "**70** (145~177)",
          },
          {
            "inline": true,
            "name": "A",
            "value": "**45** (58~106)",
          },
          {
            "inline": true,
            "name": "B",
            "value": "**48** (61~110)",
          },
          {
            "inline": true,
            "name": "C",
            "value": "**60** (72~123)",
          },
          {
            "inline": true,
            "name": "D",
            "value": "**65** (76~128)",
          },
          {
            "inline": true,
            "name": "S",
            "value": "**35** (49~95)",
          },
        ],
        "footer": {
          "text": "合計: 323",
        },
        "title": "ピッピ の情報ロト！",
        "url": "https://yakkun.com/ch/zukan/n35",
      }
    `);
  });

  test('long pokemon name with URL', () => {
    const pokemon = fakePokemon({
      types: ['ほのお', 'ドラゴン'],
      abilities: ['かたいツメ'],
      baseStats: { H: 78, A: 130, B: 111, C: 130, D: 85, S: 100 },
      yakkun: { url: 'https://yakkun.com/ch/zukan/n6x', key: 'n6x' },
    });
    const vm = buildPokemonViewModel('メガリザードンＸ', pokemon);
    expect(formatPokemonEmbed(vm)).toMatchInlineSnapshot(`
      {
        "color": 15761456,
        "fields": [
          {
            "inline": true,
            "name": "タイプ",
            "value": "ほのお・ドラゴン",
          },
          {
            "inline": true,
            "name": "特性",
            "value": "かたいツメ",
          },
          {
            "inline": false,
            "name": "種族値",
            "value": "Lv.50 実数値範囲",
          },
          {
            "inline": true,
            "name": "H",
            "value": "**78** (153~185)",
          },
          {
            "inline": true,
            "name": "A",
            "value": "**130** (135~200)",
          },
          {
            "inline": true,
            "name": "B",
            "value": "**111** (117~179)",
          },
          {
            "inline": true,
            "name": "C",
            "value": "**130** (135~200)",
          },
          {
            "inline": true,
            "name": "D",
            "value": "**85** (94~150)",
          },
          {
            "inline": true,
            "name": "S",
            "value": "**100** (108~167)",
          },
        ],
        "footer": {
          "text": "合計: 634",
        },
        "title": "メガリザードンＸ の情報ロト！",
        "url": "https://yakkun.com/ch/zukan/n6x",
      }
    `);
  });

  test('pokemon without yakkun URL has no url field', () => {
    const pokemon = fakePokemon({
      baseStats: { H: 100, A: 100, B: 100, C: 100, D: 100, S: 100 },
    });
    const vm = buildPokemonViewModel('テストポケモン', pokemon);
    expect(formatPokemonEmbed(vm).url).toBeUndefined();
  });
});

describe('getAllPokemonNames', () => {
  test('returns all names without filter', async () => {
    const names = await getAllPokemonNames({});
    expect(names.length).toBeGreaterThan(1000);
  });

  test('filters by prefix (katakana)', async () => {
    const names = await getAllPokemonNames({ prefix: 'ニャ' });
    expect(names.length).toBeGreaterThan(0);
    expect(names).toContain('ニャオハ');
  });

  test('filters by prefix (hiragana converted to katakana)', async () => {
    const names = await getAllPokemonNames({ prefix: 'にゃ' });
    expect(names.length).toBeGreaterThan(0);
    expect(names).toContain('ニャオハ');
  });
});
