import { describe, expect, it } from 'vitest';
import type { ChampoutPokemon } from './champout-parser';
import { applyDisplayNameOverrides, applyOutputErrata, overlayChampionsData, sortByNatNum, syncYakkunMap, type OutputEntry } from './pipeline';

function makePokemon(overrides: Partial<ChampoutPokemon> & Pick<ChampoutPokemon, 'displayName' | 'natNum'>): ChampoutPokemon {
  return {
    nameEng: '',
    types: ['ノーマル'],
    abilities: ['にげあし'],
    baseStats: { H: 50, A: 50, B: 50, C: 50, D: 50, S: 50 },
    source: 'Champions',
    ...overrides,
  };
}

function makeOutputEntry(index: number, overrides?: Partial<OutputEntry>): OutputEntry {
  return {
    index,
    types: ['ノーマル'],
    abilities: ['にげあし'],
    baseStats: { H: 50, A: 50, B: 50, C: 50, D: 50, S: 50 },
    source: { game: 'Scarlet_Violet', pokedex: 'パルデア図鑑' },
    ...overrides,
  };
}

describe('applyOutputErrata', () => {
  it('タイプを上書きする', () => {
    const output: Record<string, OutputEntry> = { 'テスト': makeOutputEntry(1) };
    applyOutputErrata(output, { 'テスト': { types: ['ほのお', 'ひこう'] } });
    expect(output['テスト'].types).toEqual(['ほのお', 'ひこう']);
  });

  it('特性を上書きする', () => {
    const output: Record<string, OutputEntry> = { 'テスト': makeOutputEntry(1) };
    applyOutputErrata(output, { 'テスト': { abilities: ['もうか'] } });
    expect(output['テスト'].abilities).toEqual(['もうか']);
  });

  it('種族値を部分的に上書きする', () => {
    const output: Record<string, OutputEntry> = { 'テスト': makeOutputEntry(1) };
    applyOutputErrata(output, { 'テスト': { baseStats: { H: 100, A: 120 } } });
    expect(output['テスト'].baseStats.H).toBe(100);
    expect(output['テスト'].baseStats.A).toBe(120);
    expect(output['テスト'].baseStats.B).toBe(50);
  });

  it('存在しない対象は警告のみでスキップする', () => {
    const output: Record<string, OutputEntry> = {};
    applyOutputErrata(output, { '存在しない': { types: ['みず'] } });
    expect(Object.keys(output)).toHaveLength(0);
  });

  it('空の errata では何も変更しない', () => {
    const output: Record<string, OutputEntry> = { 'テスト': makeOutputEntry(1) };
    applyOutputErrata(output, {});
    expect(output['テスト'].types).toEqual(['ノーマル']);
  });
});

describe('overlayChampionsData', () => {
  it('既存エントリを Champions データで上書きする', () => {
    const output: Record<string, OutputEntry> = {
      'テスト': makeOutputEntry(1, { source: { game: 'Scarlet_Violet', pokedex: 'パルデア図鑑' } }),
    };
    const champout = new Map([['テスト', makePokemon({
      displayName: 'テスト', natNum: 1,
      types: ['ほのお'], abilities: ['もうか'],
      baseStats: { H: 100, A: 100, B: 100, C: 100, D: 100, S: 100 },
    })]]);
    const nameToNatNum = new Map([['テスト', 1]]);
    overlayChampionsData(output, champout, nameToNatNum, {});
    expect(output['テスト'].types).toEqual(['ほのお']);
    expect(output['テスト'].abilities).toEqual(['もうか']);
    expect(output['テスト'].baseStats.H).toBe(100);
    expect(output['テスト'].source.game).toBe('Champions');
  });

  it('新規エントリを追加する', () => {
    const output: Record<string, OutputEntry> = {};
    const champout = new Map([['新ポケモン', makePokemon({
      displayName: '新ポケモン', natNum: 999,
      types: ['ドラゴン'], abilities: ['プレッシャー'],
    })]]);
    const nameToNatNum = new Map<string, number>();
    overlayChampionsData(output, champout, nameToNatNum, {});
    expect(output['新ポケモン']).toBeDefined();
    expect(output['新ポケモン'].index).toBe(999);
    expect(nameToNatNum.get('新ポケモン')).toBe(999);
  });

  it('既存エントリのベースデータ（index）を保持する', () => {
    const output: Record<string, OutputEntry> = {
      'テスト': makeOutputEntry(42),
    };
    const champout = new Map([['テスト', makePokemon({ displayName: 'テスト', natNum: 42, types: ['みず'] })]]);
    overlayChampionsData(output, champout, new Map(), {});
    expect(output['テスト'].index).toBe(42);
  });
});

describe('applyDisplayNameOverrides', () => {
  it('champout名を旧表示名にリネームする', () => {
    const pokemon = new Map([['ウォッシュロトム', makePokemon({ displayName: 'ウォッシュロトム', natNum: 479 })]]);
    const nameToNatNum = new Map([['ウォッシュロトム', 479]]);
    applyDisplayNameOverrides(pokemon, nameToNatNum, { 'ウォッシュロトム': 'ロトム(ウォッシュロトム)' });
    expect(pokemon.has('ロトム(ウォッシュロトム)')).toBe(true);
    expect(pokemon.has('ウォッシュロトム')).toBe(false);
    expect(nameToNatNum.has('ロトム(ウォッシュロトム)')).toBe(true);
    expect(nameToNatNum.has('ウォッシュロトム')).toBe(false);
  });

  it('存在しないエントリはスキップする', () => {
    const pokemon = new Map([['テスト', makePokemon({ displayName: 'テスト', natNum: 1 })]]);
    const nameToNatNum = new Map([['テスト', 1]]);
    applyDisplayNameOverrides(pokemon, nameToNatNum, { '存在しない': '別名' });
    expect(pokemon.size).toBe(1);
    expect(pokemon.has('テスト')).toBe(true);
  });
});

describe('sortByNatNum', () => {
  it('natNum 昇順でソートする', () => {
    const output = {
      'C': makeOutputEntry(3),
      'A': makeOutputEntry(1),
      'B': makeOutputEntry(2),
    };
    const natNums = new Map([['A', 1], ['B', 2], ['C', 3]]);
    const sorted = sortByNatNum(output, natNums);
    expect(Object.keys(sorted)).toEqual(['A', 'B', 'C']);
  });

  it('同一 natNum は名前順でソートする', () => {
    const output = {
      'メガB': makeOutputEntry(6),
      'A': makeOutputEntry(6),
    };
    const natNums = new Map([['A', 6], ['メガB', 6]]);
    const sorted = sortByNatNum(output, natNums);
    expect(Object.keys(sorted)).toEqual(['A', 'メガB']);
  });
});

describe('syncYakkunMap', () => {
  it('名前が一致するエントリはそのまま引き継ぐ', () => {
    const sorted = { 'ピカチュウ': makeOutputEntry(25) };
    const oldMap = { 'ピカチュウ': 'https://yakkun.com/ch/zukan/n25' };
    const result = syncYakkunMap(sorted, oldMap);
    expect(result['ピカチュウ']).toBe('https://yakkun.com/ch/zukan/n25');
  });

  it('新規エントリは null になる', () => {
    const sorted = { '新ポケモン': makeOutputEntry(999) };
    const oldMap = {};
    const result = syncYakkunMap(sorted, oldMap);
    expect(result['新ポケモン']).toBeNull();
  });

  it('新データにないエントリはURLがあっても保持しない', () => {
    const sorted = {};
    const oldMap = { '旧ポケモン': 'https://yakkun.com/ch/zukan/n100' };
    const result = syncYakkunMap(sorted, oldMap as Record<string, string | null>);
    expect(result).not.toHaveProperty('旧ポケモン');
  });

  it('natNum一致で唯一の候補がある場合URLを引き継ぎ旧名は残さない', () => {
    const sorted = { 'デオキシス': makeOutputEntry(386) };
    const oldMap = { 'デオキシス(ノーマルフォルム)': 'https://yakkun.com/ch/zukan/n386' };
    const result = syncYakkunMap(sorted, oldMap);
    expect(result['デオキシス']).toBe('https://yakkun.com/ch/zukan/n386');
    expect(result).not.toHaveProperty('デオキシス(ノーマルフォルム)');
  });

  it('名前の表記変更（括弧→なし）でURLを引き継ぎ旧名は残さない', () => {
    const sorted = { 'ウォッシュロトム': makeOutputEntry(479) };
    const oldMap = { 'ロトム(ウォッシュロトム)': 'https://yakkun.com/ch/zukan/n479w' };
    const result = syncYakkunMap(sorted, oldMap);
    expect(result['ウォッシュロトム']).toBe('https://yakkun.com/ch/zukan/n479w');
    expect(result).not.toHaveProperty('ロトム(ウォッシュロトム)');
  });

  it('中黒の有無でURLを引き継ぐ', () => {
    const sorted = {
      'ケンタロス(パルデアのすがた・ウォーターしゅ)': makeOutputEntry(128),
      'ケンタロス(パルデアのすがた・コンバットしゅ)': makeOutputEntry(128),
      'ケンタロス(パルデアのすがた・ブレイズしゅ)': makeOutputEntry(128),
    };
    const oldMap = {
      'ケンタロス(パルデアのすがた ウォーターしゅ)': 'https://yakkun.com/ch/zukan/n128c',
      'ケンタロス(パルデアのすがた コンバットしゅ)': 'https://yakkun.com/ch/zukan/n128a',
      'ケンタロス(パルデアのすがた ブレイズしゅ)': 'https://yakkun.com/ch/zukan/n128b',
    };
    const result = syncYakkunMap(sorted, oldMap);
    expect(result['ケンタロス(パルデアのすがた・ウォーターしゅ)']).toBe('https://yakkun.com/ch/zukan/n128c');
    expect(result['ケンタロス(パルデアのすがた・コンバットしゅ)']).toBe('https://yakkun.com/ch/zukan/n128a');
    expect(result['ケンタロス(パルデアのすがた・ブレイズしゅ)']).toBe('https://yakkun.com/ch/zukan/n128b');
  });

  it('同一natNumの複数フォームでURLを正しく振り分ける', () => {
    const sorted = {
      'ウォッシュロトム': makeOutputEntry(479),
      'ヒートロトム': makeOutputEntry(479),
      'カットロトム': makeOutputEntry(479),
    };
    const oldMap = {
      'ロトム(ウォッシュロトム)': 'https://yakkun.com/ch/zukan/n479w',
      'ロトム(ヒートロトム)': 'https://yakkun.com/ch/zukan/n479h',
      'ロトム(カットロトム)': 'https://yakkun.com/ch/zukan/n479c',
    };
    const result = syncYakkunMap(sorted, oldMap);
    expect(result['ウォッシュロトム']).toBe('https://yakkun.com/ch/zukan/n479w');
    expect(result['ヒートロトム']).toBe('https://yakkun.com/ch/zukan/n479h');
    expect(result['カットロトム']).toBe('https://yakkun.com/ch/zukan/n479c');
  });

  it('直接一致エントリの既存URLは上書きしない', () => {
    const sorted = {
      'ピカチュウ': makeOutputEntry(25),
      '新フォーム': makeOutputEntry(25),
    };
    const oldMap = {
      'ピカチュウ': 'https://yakkun.com/ch/zukan/n25',
      '旧フォーム': 'https://yakkun.com/ch/zukan/n25a',
    };
    const result = syncYakkunMap(sorted, oldMap);
    expect(result['ピカチュウ']).toBe('https://yakkun.com/ch/zukan/n25');
    expect(result['新フォーム']).toBe('https://yakkun.com/ch/zukan/n25a');
  });
});
