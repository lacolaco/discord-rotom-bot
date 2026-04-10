import { describe, expect, test } from 'vitest';
import { formatPokemonEmbed } from './embed';
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
            "value": "Max+ / Max / Min / Min-",
          },
          {
            "inline": true,
            "name": "H",
            "value": "**56**
      - / 163 / 131 / -",
          },
          {
            "inline": true,
            "name": "A",
            "value": "**80**
      145 / 132 / 100 / 90",
          },
          {
            "inline": true,
            "name": "B",
            "value": "**114**
      182 / 166 / 134 / 120",
          },
          {
            "inline": true,
            "name": "C",
            "value": "**124**
      193 / 176 / 144 / 129",
          },
          {
            "inline": true,
            "name": "D",
            "value": "**60**
      123 / 112 / 80 / 72",
          },
          {
            "inline": true,
            "name": "S",
            "value": "**136**
      206 / 188 / 156 / 140",
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
            "value": "Max+ / Max / Min / Min-",
          },
          {
            "inline": true,
            "name": "H",
            "value": "**70**
      - / 177 / 145 / -",
          },
          {
            "inline": true,
            "name": "A",
            "value": "**45**
      106 / 97 / 65 / 58",
          },
          {
            "inline": true,
            "name": "B",
            "value": "**48**
      110 / 100 / 68 / 61",
          },
          {
            "inline": true,
            "name": "C",
            "value": "**60**
      123 / 112 / 80 / 72",
          },
          {
            "inline": true,
            "name": "D",
            "value": "**65**
      128 / 117 / 85 / 76",
          },
          {
            "inline": true,
            "name": "S",
            "value": "**35**
      95 / 87 / 55 / 49",
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
            "value": "Max+ / Max / Min / Min-",
          },
          {
            "inline": true,
            "name": "H",
            "value": "**78**
      - / 185 / 153 / -",
          },
          {
            "inline": true,
            "name": "A",
            "value": "**130**
      200 / 182 / 150 / 135",
          },
          {
            "inline": true,
            "name": "B",
            "value": "**111**
      179 / 163 / 131 / 117",
          },
          {
            "inline": true,
            "name": "C",
            "value": "**130**
      200 / 182 / 150 / 135",
          },
          {
            "inline": true,
            "name": "D",
            "value": "**85**
      150 / 137 / 105 / 94",
          },
          {
            "inline": true,
            "name": "S",
            "value": "**100**
      167 / 152 / 120 / 108",
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
