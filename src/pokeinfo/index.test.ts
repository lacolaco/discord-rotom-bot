import { describe, expect, test } from 'vitest';
import { getAllPokemonNames, searchPokemonByName } from './index';

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
