import { describe, expect, it } from 'vitest';
import type { ChampoutPokemon } from './champout-parser';
import { applyDisplayNameOverrides, applyErrata, buildOutput, normalizeAgainstReference, sortByNatNum, supplementChampionsExclusive, syncYakkunMap } from './pipeline';

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

describe('applyErrata', () => {
  it('タイプを上書きする', () => {
    const pokemon = new Map([['テスト', makePokemon({ displayName: 'テスト', natNum: 1 })]]);
    applyErrata(pokemon, { 'テスト': { types: ['ほのお', 'ひこう'] } });
    expect(pokemon.get('テスト')!.types).toEqual(['ほのお', 'ひこう']);
  });

  it('特性を上書きする', () => {
    const pokemon = new Map([['テスト', makePokemon({ displayName: 'テスト', natNum: 1 })]]);
    applyErrata(pokemon, { 'テスト': { abilities: ['もうか'] } });
    expect(pokemon.get('テスト')!.abilities).toEqual(['もうか']);
  });

  it('種族値を部分的に上書きする', () => {
    const pokemon = new Map([['テスト', makePokemon({ displayName: 'テスト', natNum: 1 })]]);
    applyErrata(pokemon, { 'テスト': { baseStats: { H: 100, A: 120 } } });
    const stats = pokemon.get('テスト')!.baseStats;
    expect(stats.H).toBe(100);
    expect(stats.A).toBe(120);
    expect(stats.B).toBe(50);
  });

  it('存在しない対象は警告のみでスキップする', () => {
    const pokemon = new Map<string, ChampoutPokemon>();
    applyErrata(pokemon, { '存在しない': { types: ['みず'] } });
    expect(pokemon.size).toBe(0);
  });

  it('空の errata では何も変更しない', () => {
    const pokemon = new Map([['テスト', makePokemon({ displayName: 'テスト', natNum: 1 })]]);
    const original = { ...pokemon.get('テスト')! };
    applyErrata(pokemon, {});
    expect(pokemon.get('テスト')!.types).toEqual(original.types);
  });

  it('複数エントリを同時に補正する', () => {
    const pokemon = new Map([
      ['A', makePokemon({ displayName: 'A', natNum: 1 })],
      ['B', makePokemon({ displayName: 'B', natNum: 2 })],
    ]);
    applyErrata(pokemon, {
      'A': { types: ['みず'] },
      'B': { types: ['ほのお'] },
    });
    expect(pokemon.get('A')!.types).toEqual(['みず']);
    expect(pokemon.get('B')!.types).toEqual(['ほのお']);
  });
});

describe('buildOutput', () => {
  it('ChampoutPokemon を OutputEntry に変換する', () => {
    const pokemon = new Map([['テスト', makePokemon({ displayName: 'テスト', natNum: 42, nameEng: 'Test' })]]);
    const output = buildOutput(pokemon, {});
    expect(output['テスト']).toEqual({
      index: 42,
      types: ['ノーマル'],
      abilities: ['にげあし'],
      baseStats: { H: 50, A: 50, B: 50, C: 50, D: 50, S: 50 },
      source: { game: 'Champions', pokedex: '' },
    });
  });

  it('yakkun URL がある場合は yakkun フィールドを付与する', () => {
    const pokemon = new Map([['テスト', makePokemon({ displayName: 'テスト', natNum: 1 })]]);
    const output = buildOutput(pokemon, { 'テスト': 'https://yakkun.com/champions/n001' });
    expect(output['テスト'].yakkun).toEqual({
      url: 'https://yakkun.com/champions/n001',
      key: 'n001',
    });
  });

  it('yakkun URL が null の場合は yakkun フィールドなし', () => {
    const pokemon = new Map([['テスト', makePokemon({ displayName: 'テスト', natNum: 1 })]]);
    const output = buildOutput(pokemon, { 'テスト': null });
    expect(output['テスト'].yakkun).toBeUndefined();
  });
});

describe('sortByNatNum', () => {
  it('natNum 昇順でソートする', () => {
    const output = {
      'C': { index: 3, types: [], abilities: [], baseStats: { H: 0, A: 0, B: 0, C: 0, D: 0, S: 0 }, source: { game: '', pokedex: '' } },
      'A': { index: 1, types: [], abilities: [], baseStats: { H: 0, A: 0, B: 0, C: 0, D: 0, S: 0 }, source: { game: '', pokedex: '' } },
      'B': { index: 2, types: [], abilities: [], baseStats: { H: 0, A: 0, B: 0, C: 0, D: 0, S: 0 }, source: { game: '', pokedex: '' } },
    };
    const natNums = new Map([['A', 1], ['B', 2], ['C', 3]]);
    const sorted = sortByNatNum(output, natNums);
    expect(Object.keys(sorted)).toEqual(['A', 'B', 'C']);
  });

  it('同一 natNum は名前順でソートする', () => {
    const output = {
      'メガB': { index: 6, types: [], abilities: [], baseStats: { H: 0, A: 0, B: 0, C: 0, D: 0, S: 0 }, source: { game: '', pokedex: '' } },
      'A': { index: 6, types: [], abilities: [], baseStats: { H: 0, A: 0, B: 0, C: 0, D: 0, S: 0 }, source: { game: '', pokedex: '' } },
    };
    const natNums = new Map([['A', 6], ['メガB', 6]]);
    const sorted = sortByNatNum(output, natNums);
    expect(Object.keys(sorted)).toEqual(['A', 'メガB']);
  });
});

describe('supplementChampionsExclusive', () => {
  it('Champions限定ポケモンをデータに追加する', () => {
    const pokemon = new Map<string, ChampoutPokemon>();
    const nameToNatNum = new Map<string, number>();
    const exclusive = {
      'メガヒードラン': {
        index: 485,
        types: ['ほのお', 'はがね'],
        abilities: ['もらいび'],
        baseStats: { H: 91, A: 120, B: 106, C: 175, D: 141, S: 67 },
        source: 'Champions',
      },
    };
    supplementChampionsExclusive(pokemon, nameToNatNum, exclusive);
    expect(pokemon.has('メガヒードラン')).toBe(true);
    expect(pokemon.get('メガヒードラン')!.natNum).toBe(485);
    expect(nameToNatNum.get('メガヒードラン')).toBe(485);
  });

  it('既存エントリと重複する場合はスキップする', () => {
    const pokemon = new Map([['メガヒードラン', makePokemon({ displayName: 'メガヒードラン', natNum: 485 })]]);
    const nameToNatNum = new Map([['メガヒードラン', 485]]);
    const exclusive = {
      'メガヒードラン': {
        index: 485,
        types: ['ほのお'],
        abilities: ['もらいび'],
        baseStats: { H: 0, A: 0, B: 0, C: 0, D: 0, S: 0 },
        source: 'Champions',
      },
    };
    supplementChampionsExclusive(pokemon, nameToNatNum, exclusive);
    expect(pokemon.get('メガヒードラン')!.types).toEqual(['ノーマル']);
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

  it('複数エントリを同時にリネームする', () => {
    const pokemon = new Map([
      ['ウォッシュロトム', makePokemon({ displayName: 'ウォッシュロトム', natNum: 479 })],
      ['ミミッキュ(ばけたすがた)', makePokemon({ displayName: 'ミミッキュ(ばけたすがた)', natNum: 778 })],
    ]);
    const nameToNatNum = new Map([['ウォッシュロトム', 479], ['ミミッキュ(ばけたすがた)', 778]]);
    applyDisplayNameOverrides(pokemon, nameToNatNum, {
      'ウォッシュロトム': 'ロトム(ウォッシュロトム)',
      'ミミッキュ(ばけたすがた)': 'ミミッキュ',
    });
    expect(pokemon.has('ロトム(ウォッシュロトム)')).toBe(true);
    expect(pokemon.has('ミミッキュ')).toBe(true);
  });
});

describe('normalizeAgainstReference', () => {
  const refEntry = (overrides: Partial<{ types: string[]; abilities: string[]; baseStats: { H: number; A: number; B: number; C: number; D: number; S: number } }> = {}) => ({
    types: ['ノーマル'],
    abilities: ['にげあし'],
    baseStats: { H: 50, A: 50, B: 50, C: 50, D: 50, S: 50 },
    ...overrides,
  });

  it('参照データとタイプが異なる場合に補正する', () => {
    const pokemon = new Map([
      ['テスト', makePokemon({ displayName: 'テスト', natNum: 1, types: ['むし', 'ひこう'] })],
    ]);
    normalizeAgainstReference(pokemon, { 'テスト': refEntry({ types: ['ひこう', 'むし'] }) });
    expect(pokemon.get('テスト')!.types).toEqual(['ひこう', 'むし']);
  });

  it('参照データと特性が異なる場合に補正する', () => {
    const pokemon = new Map([
      ['テスト', makePokemon({ displayName: 'テスト', natNum: 1, abilities: ['もうか', 'テレパシー'] })],
    ]);
    normalizeAgainstReference(pokemon, { 'テスト': refEntry({ abilities: ['もうか'] }) });
    expect(pokemon.get('テスト')!.abilities).toEqual(['もうか']);
  });

  it('参照データと種族値が異なる場合に補正する', () => {
    const pokemon = new Map([
      ['テスト', makePokemon({ displayName: 'テスト', natNum: 1, baseStats: { H: 100, A: 120, B: 50, C: 50, D: 50, S: 50 } })],
    ]);
    normalizeAgainstReference(pokemon, { 'テスト': refEntry({ baseStats: { H: 80, A: 100, B: 50, C: 50, D: 50, S: 50 } }) });
    expect(pokemon.get('テスト')!.baseStats).toEqual({ H: 80, A: 100, B: 50, C: 50, D: 50, S: 50 });
  });

  it('参照データにないポケモンは変更しない', () => {
    const pokemon = new Map([
      ['新ポケモン', makePokemon({ displayName: '新ポケモン', natNum: 999, types: ['あく', 'ドラゴン'] })],
    ]);
    normalizeAgainstReference(pokemon, {});
    expect(pokemon.get('新ポケモン')!.types).toEqual(['あく', 'ドラゴン']);
  });

  it('全フィールドが一致する場合は変更しない', () => {
    const pokemon = new Map([
      ['テスト', makePokemon({ displayName: 'テスト', natNum: 1 })],
    ]);
    normalizeAgainstReference(pokemon, { 'テスト': refEntry() });
    expect(pokemon.get('テスト')!.types).toEqual(['ノーマル']);
    expect(pokemon.get('テスト')!.abilities).toEqual(['にげあし']);
    expect(pokemon.get('テスト')!.baseStats).toEqual({ H: 50, A: 50, B: 50, C: 50, D: 50, S: 50 });
  });
});

function makeOutputEntry(index: number): { index: number; types: string[]; abilities: string[]; baseStats: { H: number; A: number; B: number; C: number; D: number; S: number }; source: { game: string; pokedex: string } } {
  return { index, types: [], abilities: [], baseStats: { H: 0, A: 0, B: 0, C: 0, D: 0, S: 0 }, source: { game: '', pokedex: '' } };
}

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
    const result = syncYakkunMap(sorted, oldMap);
    expect(result).not.toHaveProperty('旧ポケモン');
  });

  it('新データにないエントリでURLがnullなら保持しない', () => {
    const sorted = {};
    const oldMap: Record<string, string | null> = { '旧ポケモン': null };
    const result = syncYakkunMap(sorted, oldMap);
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

  it('recoveryされなかった旧フォームのURLは保持しない', () => {
    const sorted = { 'デオキシス': makeOutputEntry(386) };
    const oldMap = {
      'デオキシス(ノーマルフォルム)': 'https://yakkun.com/ch/zukan/n386',
      'デオキシス(アタックフォルム)': 'https://yakkun.com/ch/zukan/n386a',
      'デオキシス(ディフェンスフォルム)': 'https://yakkun.com/ch/zukan/n386d',
    };
    const result = syncYakkunMap(sorted, oldMap);
    expect(result['デオキシス']).toBeTruthy();
    expect(result).not.toHaveProperty('デオキシス(アタックフォルム)');
    expect(result).not.toHaveProperty('デオキシス(ディフェンスフォルム)');
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
