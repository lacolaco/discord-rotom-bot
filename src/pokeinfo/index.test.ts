import { describe, expect, test } from 'vitest';
import {
  formatBaseStatsGraph,
  formatSpeedLines,
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

describe('formatSpeedLines', () => {
  test('calculates speed lines for base speed 65 (ニャオハ)', () => {
    const result = formatSpeedLines(65);
    // 最遅: floor((floor((130+31)*50/100)+5)*0.9) = floor(85*0.9) = 76
    // 無振り: floor((80+5)*1.0) = 85
    // 準速: floor((floor((130+31+63)*50/100)+5)*1.0) = floor(112+5) = 117
    // 最速: floor(117*1.1) = 128
    expect(result).toBe('S実数値: 最遅76 / 無振り85 / 準速117 / 最速128');
  });

  test('calculates speed lines for base speed 136 (テツノツツミ)', () => {
    const result = formatSpeedLines(136);
    // 最遅: floor((floor((272+31)*50/100)+5)*0.9) = floor((151+5)*0.9) = floor(140.4) = 140
    // 無振り: floor((151+5)*1.0) = 156
    // 準速: floor((floor((272+31+63)*50/100)+5)*1.0) = floor(183+5) = 188
    // 最速: floor(188*1.1) = floor(206.8) = 206
    expect(result).toBe('S実数値: 最遅140 / 無振り156 / 準速188 / 最速206');
  });
});

describe('formatBaseStatsGraph', () => {
  test('formats stats as bar chart in code block', () => {
    const result = formatBaseStatsGraph({
      H: 40,
      A: 61,
      B: 56,
      C: 62,
      D: 63,
      S: 65,
    });
    expect(result).toBe(
      '```\n' +
        'H |===               |  40\n' +
        'A |====              |  61\n' +
        'B |====              |  56\n' +
        'C |====              |  62\n' +
        'D |====              |  63\n' +
        'S |=====             |  65\n' +
        '```',
    );
  });

  test('scales bars correctly for extreme values', () => {
    const result = formatBaseStatsGraph({
      H: 255,
      A: 0,
      B: 128,
      C: 1,
      D: 200,
      S: 100,
    });
    expect(result).toContain('H |==================| 255');
    expect(result).toContain('A |                  |   0');
    expect(result).toContain('B |=========         | 128');
    expect(result).toContain('C |                  |   1');
    expect(result).toContain('D |==============    | 200');
    expect(result).toContain('S |=======           | 100');
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
