import { describe, expect, test } from 'vitest';
import {
  formatPokemonInfoBox,
  getAllPokemonNames,
  searchPokemonByName,
} from './index';

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
});

describe('formatPokemonInfoBox', () => {
  test('single ability pokemon with URL', () => {
    const box = formatPokemonInfoBox({
      name: 'テツノツツミ',
      types: ['こおり', 'みず'],
      baseStats: { H: 56, A: 80, B: 114, C: 124, D: 60, S: 136 },
      abilities: ['クォークチャージ'],
    });
    const message = box + '\nhttps://yakkun.com/ch/zukan/n991';
    expect(message).toMatchInlineSnapshot(`
      "**テツノツツミ** の情報ロト！
      こおり・みず | 特性: クォークチャージ
      \`\`\`
      +----------------------+------+-----+-----+------+
      |                      | Max+ | Max | Min | Min- |
      +----------------------+------+-----+-----+------+
      | H ###             56 |      | 163 | 131 |      |
      | A ####            80 |  145 | 132 | 100 |   90 |
      | B ######         114 |  182 | 166 | 134 |  120 |
      | C #######        124 |  193 | 176 | 144 |  129 |
      | D ###             60 |  123 | 112 |  80 |   72 |
      | S #######        136 |  206 | 188 | 156 |  140 |
      +----------------------+------+-----+-----+------+
      \`\`\`
      https://yakkun.com/ch/zukan/n991"
    `);
  });

  test('multiple abilities pokemon with URL', () => {
    const box = formatPokemonInfoBox({
      name: 'ピッピ',
      types: ['フェアリー'],
      baseStats: { H: 70, A: 45, B: 48, C: 60, D: 65, S: 35 },
      abilities: ['メロメロボディ', 'マジックガード', 'フレンドガード'],
    });
    const message = box + '\nhttps://yakkun.com/ch/zukan/n35';
    expect(message).toMatchInlineSnapshot(`
      "**ピッピ** の情報ロト！
      フェアリー | 特性: メロメロボディ / マジックガード / フレンドガード
      \`\`\`
      +----------------------+------+-----+-----+------+
      |                      | Max+ | Max | Min | Min- |
      +----------------------+------+-----+-----+------+
      | H ####            70 |      | 177 | 145 |      |
      | A ##              45 |  106 |  97 |  65 |   58 |
      | B ###             48 |  110 | 100 |  68 |   61 |
      | C ###             60 |  123 | 112 |  80 |   72 |
      | D ####            65 |  128 | 117 |  85 |   76 |
      | S ##              35 |   95 |  87 |  55 |   49 |
      +----------------------+------+-----+-----+------+
      \`\`\`
      https://yakkun.com/ch/zukan/n35"
    `);
  });

  test('long pokemon name with URL', () => {
    const box = formatPokemonInfoBox({
      name: 'メガリザードンＸ',
      types: ['ほのお', 'ドラゴン'],
      baseStats: { H: 78, A: 130, B: 111, C: 130, D: 85, S: 100 },
      abilities: ['かたいツメ'],
    });
    const message = box + '\nhttps://yakkun.com/ch/zukan/n6x';
    expect(message).toMatchInlineSnapshot(`
      "**メガリザードンＸ** の情報ロト！
      ほのお・ドラゴン | 特性: かたいツメ
      \`\`\`
      +----------------------+------+-----+-----+------+
      |                      | Max+ | Max | Min | Min- |
      +----------------------+------+-----+-----+------+
      | H ####            78 |      | 185 | 153 |      |
      | A #######        130 |  200 | 182 | 150 |  135 |
      | B ######         111 |  179 | 163 | 131 |  117 |
      | C #######        130 |  200 | 182 | 150 |  135 |
      | D #####           85 |  150 | 137 | 105 |   94 |
      | S #####          100 |  167 | 152 | 120 |  108 |
      +----------------------+------+-----+-----+------+
      \`\`\`
      https://yakkun.com/ch/zukan/n6x"
    `);
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
