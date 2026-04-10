import { describe, expect, test } from 'vitest';
import {
  displayWidth,
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

describe('displayWidth', () => {
  test('counts ASCII characters as 1 column', () => {
    expect(displayWidth('ABC')).toBe(3);
    expect(displayWidth('H 123')).toBe(5);
  });

  test('counts full-width Japanese characters as 2 columns', () => {
    expect(displayWidth('テスト')).toBe(6);
    expect(displayWidth('こおり')).toBe(6);
  });

  test('counts mixed ASCII and Japanese correctly', () => {
    expect(displayWidth('こおり・みず')).toBe(12);
    expect(displayWidth('S実数値')).toBe(7);
    expect(displayWidth('No.991')).toBe(6);
  });

  test('counts katakana middle dot as full-width', () => {
    expect(displayWidth('・')).toBe(2);
  });
});

describe('formatPokemonInfoBox', () => {
  test('produces 2-column box with single ability', () => {
    const result = formatPokemonInfoBox({
      name: 'テツノツツミ',
      types: ['こおり', 'みず'],
      baseStats: { H: 56, A: 80, B: 114, C: 124, D: 60, S: 136 },
      abilities: ['クォークチャージ'],
    });

    // Wrapped in code block
    expect(result).toMatch(/^```\n/);
    expect(result).toMatch(/\n```$/);

    // Left column contains name and type
    expect(result).toContain('| テツノツツミ');
    expect(result).toContain('| こおり・みず');

    // Right column contains stat bars with correct values
    expect(result).toContain('H ====');
    expect(result).toContain('56');
    expect(result).toContain('C =========');
    expect(result).toContain('124');
    expect(result).toContain('S ==========');
    expect(result).toContain('136');

    // Bottom section contains abilities and speed
    expect(result).toContain('特性 クォークチャージ');
    expect(result).toContain('S実数値 遅140/無156/準188/速206');

    // All lines (excluding code block markers) have same display width
    const lines = result.split('\n').slice(1, -1);
    const widths = lines.map((l) => displayWidth(l));
    expect(new Set(widths).size).toBe(1);
  });

  test('handles multiple abilities', () => {
    const result = formatPokemonInfoBox({
      name: 'ピッピ',
      types: ['フェアリー'],
      baseStats: { H: 70, A: 45, B: 48, C: 60, D: 65, S: 35 },
      abilities: ['メロメロボディ', 'マジックガード', 'フレンドガード'],
    });

    expect(result).toContain(
      '特性 メロメロボディ / マジックガード / フレンドガード',
    );

    // All lines have same display width
    const lines = result.split('\n').slice(1, -1);
    const widths = lines.map((l) => displayWidth(l));
    expect(new Set(widths).size).toBe(1);
  });

  test('handles long pokemon name', () => {
    const result = formatPokemonInfoBox({
      name: 'メガリザードンＸ',
      types: ['ほのお', 'ドラゴン'],
      baseStats: { H: 78, A: 130, B: 111, C: 130, D: 85, S: 100 },
      abilities: ['かたいツメ'],
    });

    expect(result).toContain('| メガリザードンＸ');

    // All lines have same display width
    const lines = result.split('\n').slice(1, -1);
    const widths = lines.map((l) => displayWidth(l));
    expect(new Set(widths).size).toBe(1);
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
