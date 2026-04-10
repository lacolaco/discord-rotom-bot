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
  test('single ability pokemon', () => {
    const result = formatPokemonInfoBox({
      name: 'テツノツツミ',
      types: ['こおり', 'みず'],
      baseStats: { H: 56, A: 80, B: 114, C: 124, D: 60, S: 136 },
      abilities: ['クォークチャージ'],
    });
    expect(result).toMatchSnapshot();
  });

  test('multiple abilities pokemon', () => {
    const result = formatPokemonInfoBox({
      name: 'ピッピ',
      types: ['フェアリー'],
      baseStats: { H: 70, A: 45, B: 48, C: 60, D: 65, S: 35 },
      abilities: ['メロメロボディ', 'マジックガード', 'フレンドガード'],
    });
    expect(result).toMatchSnapshot();
  });

  test('long pokemon name', () => {
    const result = formatPokemonInfoBox({
      name: 'メガリザードンＸ',
      types: ['ほのお', 'ドラゴン'],
      baseStats: { H: 78, A: 130, B: 111, C: 130, D: 85, S: 100 },
      abilities: ['かたいツメ'],
    });
    expect(result).toMatchSnapshot();
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
