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

  test('returns data for Champions mega evolution', async () => {
    const result = await searchPokemonByName('メガジュカイン');
    expect(result).not.toBeNull();
    expect(result!.types).toEqual(['くさ', 'ドラゴン']);
    expect(result!.baseStats.H).toBe(70);
    expect(result!.abilities).toContain('ひらいしん');
  });

  test('returns data for Showdown-fallback pokemon', async () => {
    const result = await searchPokemonByName('メルタン');
    expect(result).not.toBeNull();
    expect(result!.types).toEqual(['はがね']);
    expect(result!.baseStats.H).toBe(46);
  });

  test('returns data for Showdown-fallback base form', async () => {
    const result = await searchPokemonByName('カイオーガ');
    expect(result).not.toBeNull();
    expect(result!.types).toEqual(['みず']);
    expect(result!.baseStats.C).toBe(150);
  });

  test('returns data for Champions mega form', async () => {
    const result = await searchPokemonByName('メガスコヴィラン');
    expect(result).not.toBeNull();
    expect(result!.types).toEqual(['くさ', 'ほのお']);
    expect(result!.baseStats.H).toBe(65);
    expect(result!.baseStats.A).toBe(138);
    expect(result!.index).toBe(952);
  });

  test('旧表示名でエイリアス解決される', async () => {
    const result = await searchPokemonByName('ロトム(ウォッシュロトム)');
    expect(result).not.toBeNull();
    expect(result!.index).toBe(479);
    expect(result!.types).toEqual(['でんき', 'みず']);
  });

  test('旧ベースフォーム名でエイリアス解決される', async () => {
    const result = await searchPokemonByName('ミミッキュ');
    expect(result).not.toBeNull();
    expect(result!.index).toBe(778);
  });

  test('旧フォーム名でエイリアス解決される（中黒の有無）', async () => {
    const result = await searchPokemonByName(
      'ケンタロス(パルデアのすがた ウォーターしゅ)',
    );
    expect(result).not.toBeNull();
    expect(result!.types).toEqual(['かくとう', 'みず']);
  });

  test('Champions限定メガが取得できる', async () => {
    const result = await searchPokemonByName('メガヒードラン');
    expect(result).not.toBeNull();
    expect(result!.index).toBe(485);
    expect(result!.types).toEqual(['ほのお', 'はがね']);
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
