import { describe, expect, test } from 'vitest';
import { formatSpeedCompareEmbed } from './embed';
import { buildSpeedCompareViewModel } from './view-model';
import type { Pokemon } from '../pokeinfo';

const fake = (baseS: number, overrides: Partial<Pokemon> = {}): Pokemon => ({
  index: 0,
  types: ['ノーマル'],
  abilities: ['テスト'],
  baseStats: { H: 100, A: 100, B: 100, C: 100, D: 100, S: baseS },
  source: { game: 'test', pokedex: 'test' },
  ...overrides,
});

describe('formatSpeedCompareEmbed', () => {
  test('テツノツツミ(最速) vs テツノツツミ', () => {
    const vm = buildSpeedCompareViewModel({
      a: { name: 'テツノツツミ', pokemon: fake(136), sp: 32, nature: 1.1 },
      b: { name: 'テツノツツミ', pokemon: fake(136) },
    });
    expect(formatSpeedCompareEmbed(vm)).toMatchInlineSnapshot(`
      {
        "color": 5793266,
        "fields": [
          {
            "inline": false,
            "name": "A: テツノツツミ",
            "value": "SP32 ↑補正
      S種族値 136 → 実数値 **206**",
          },
          {
            "inline": false,
            "name": "B: テツノツツミ",
            "value": "S種族値 136 → 実数値 **206** / 188 / 156 / **140**",
          },
          {
            "inline": false,
            "name": "テツノツツミのランク別 逆転条件",
            "value": "🔵 **-6〜±0** テツノツツミ > テツノツツミ
      🔴 **+1〜+6** テツノツツミ < テツノツツミ",
          },
        ],
        "footer": {
          "text": "補正換算: スカーフ=+1 / おいかぜ=+2 / まひ=-2",
        },
        "title": "すばやさ比較ロト！",
      }
    `);
  });

  test('無振り vs 高速ポケモン', () => {
    const vm = buildSpeedCompareViewModel({
      a: { name: 'A', pokemon: fake(100), sp: 0, nature: 1.0 },
      b: { name: 'B', pokemon: fake(150) },
    });
    const embed = formatSpeedCompareEmbed(vm);
    // 基本フィールドが揃っていること
    const fieldNames = embed.fields?.map((f) => f.name) ?? [];
    expect(fieldNames).toContain('A: A');
    expect(fieldNames).toContain('B: B');
    expect(fieldNames).toContain('Bのランク別 逆転条件');
  });
});
