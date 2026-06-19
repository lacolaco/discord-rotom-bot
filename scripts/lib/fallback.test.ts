import { describe, expect, it, vi } from 'vitest';
import type { ChampoutPokemon } from './champout-parser';
import { resolveFormeDisplayName, supplementNonChampionsPokemon, supplementPokemonFormes } from './fallback';

vi.mock('@pkmn/dex', () => {
  const speciesMap = new Map<string, any>();
  speciesMap.set('bulbasaur', {
    name: 'Bulbasaur', num: 1, exists: true, forme: '', isNonstandard: null,
    baseSpecies: 'Bulbasaur',
    types: ['Grass', 'Poison'],
    abilities: { '0': 'Overgrow', '1': '', H: 'Chlorophyll' },
    baseStats: { hp: 45, atk: 49, def: 49, spa: 65, spd: 65, spe: 45 },
  });
  speciesMap.set('meltan', {
    name: 'Meltan', num: 808, exists: true, forme: '', isNonstandard: null,
    baseSpecies: 'Meltan',
    types: ['Steel'],
    abilities: { '0': 'Magnet Pull', '1': '', H: '' },
    baseStats: { hp: 46, atk: 65, def: 65, spa: 55, spd: 35, spe: 34 },
  });
  speciesMap.set('nidoranf', {
    name: 'Nidoran-F', num: 29, exists: true, forme: '', isNonstandard: null,
    baseSpecies: 'Nidoran-F',
    types: ['Poison'],
    abilities: { '0': 'Poison Point', '1': 'Rivalry', H: 'Hustle' },
    baseStats: { hp: 55, atk: 47, def: 52, spa: 40, spd: 40, spe: 41 },
  });
  speciesMap.set('nidoran-f', {
    name: 'Nidoran-F', num: 29, exists: true, forme: '', isNonstandard: null,
    baseSpecies: 'Nidoran-F',
    types: ['Poison'],
    abilities: { '0': 'Poison Point', '1': 'Rivalry', H: 'Hustle' },
    baseStats: { hp: 55, atk: 47, def: 52, spa: 40, spd: 40, spe: 41 },
  });
  speciesMap.set('nidoran', { exists: false, num: 0 });
  speciesMap.set('deoxys', {
    name: 'Deoxys', num: 386, exists: true, forme: '', isNonstandard: null,
    baseSpecies: 'Deoxys',
    formeOrder: ['Deoxys', 'Deoxys-Attack', 'Deoxys-Defense', 'Deoxys-Speed'],
    types: ['Psychic'],
    abilities: { '0': 'Pressure', '1': '', H: '' },
    baseStats: { hp: 50, atk: 150, def: 50, spa: 150, spd: 50, spe: 150 },
  });
  speciesMap.set('deoxys-attack', {
    name: 'Deoxys-Attack', num: 386, exists: true, forme: 'Attack', isNonstandard: null,
    baseSpecies: 'Deoxys',
    types: ['Psychic'],
    abilities: { '0': 'Pressure', '1': '', H: '' },
    baseStats: { hp: 50, atk: 180, def: 20, spa: 180, spd: 20, spe: 150 },
  });
  speciesMap.set('rattata-alola', {
    name: 'Rattata-Alola', num: 19, exists: true, forme: 'Alola', isNonstandard: 'Past',
    baseSpecies: 'Rattata',
    types: ['Dark', 'Normal'],
    abilities: { '0': 'Gluttony', '1': 'Hustle', H: 'Thick Fat' },
    baseStats: { hp: 30, atk: 56, def: 35, spa: 25, spd: 35, spe: 72 },
  });
  speciesMap.set('rattata', {
    name: 'Rattata', num: 19, exists: true, forme: '', isNonstandard: null,
    baseSpecies: 'Rattata',
    formeOrder: ['Rattata', 'Rattata-Alola'],
    types: ['Normal'],
    abilities: { '0': 'Run Away', '1': 'Guts', H: 'Hustle' },
    baseStats: { hp: 30, atk: 56, def: 35, spa: 25, spd: 35, spe: 72 },
  });
  speciesMap.set('charizard-mega-x', {
    name: 'Charizard-Mega-X', num: 6, exists: true, forme: 'Mega-X', isNonstandard: 'Past',
    baseSpecies: 'Charizard',
    types: ['Fire', 'Dragon'],
    abilities: { '0': 'Tough Claws', '1': '', H: '' },
    baseStats: { hp: 78, atk: 130, def: 111, spa: 130, spd: 85, spe: 100 },
  });
  speciesMap.set('charizard-gmax', {
    name: 'Charizard-Gmax', num: 6, exists: true, forme: 'Gmax', isNonstandard: 'Past',
    baseSpecies: 'Charizard',
    types: ['Fire', 'Flying'],
    abilities: { '0': 'Blaze', '1': '', H: 'Solar Power' },
    baseStats: { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
  });

  const allSpecies = [...speciesMap.values()].filter(
    (s, i, arr) => arr.findIndex(x => x.name === s.name) === i
  );
  return {
    Dex: {
      forGen: () => ({
        species: {
          get: (name: string) => speciesMap.get(name.toLowerCase()) ?? { exists: false, num: 0 },
          all: () => allSpecies,
        },
        abilities: { all: () => [
          { name: 'Overgrow', num: 65, exists: true, isNonstandard: null },
          { name: 'Chlorophyll', num: 34, exists: true, isNonstandard: null },
          { name: 'Magnet Pull', num: 42, exists: true, isNonstandard: null },
          { name: 'Pressure', num: 46, exists: true, isNonstandard: null },
          { name: 'Poison Point', num: 38, exists: true, isNonstandard: null },
          { name: 'Rivalry', num: 79, exists: true, isNonstandard: null },
          { name: 'Hustle', num: 55, exists: true, isNonstandard: null },
          { name: 'Gluttony', num: 82, exists: true, isNonstandard: null },
          { name: 'Thick Fat', num: 47, exists: true, isNonstandard: null },
          { name: 'Run Away', num: 50, exists: true, isNonstandard: null },
          { name: 'Guts', num: 62, exists: true, isNonstandard: null },
          { name: 'Tough Claws', num: 181, exists: true, isNonstandard: null },
          { name: 'Blaze', num: 66, exists: true, isNonstandard: null },
          { name: 'Solar Power', num: 94, exists: true, isNonstandard: null },
        ] },
      }),
    },
  };
});

vi.mock('node:fs', () => ({
  readFileSync: vi.fn((path: string) => {
    if (path.includes('tokusei.json')) {
      return JSON.stringify({
        mSDataSet: [
          { LabelName: 'TOKUSEI_065', OriginalText: 'しんりょく' },
          { LabelName: 'TOKUSEI_034', OriginalText: 'ようりょくそ' },
          { LabelName: 'TOKUSEI_046', OriginalText: 'プレッシャー' },
          { LabelName: 'TOKUSEI_038', OriginalText: 'どくのトゲ' },
          { LabelName: 'TOKUSEI_079', OriginalText: 'とうそうしん' },
          { LabelName: 'TOKUSEI_055', OriginalText: 'はりきり' },
          { LabelName: 'TOKUSEI_082', OriginalText: 'くいしんぼう' },
          { LabelName: 'TOKUSEI_047', OriginalText: 'あついしぼう' },
          { LabelName: 'TOKUSEI_050', OriginalText: 'にげあし' },
          { LabelName: 'TOKUSEI_062', OriginalText: 'こんじょう' },
          { LabelName: 'TOKUSEI_181', OriginalText: 'かたいツメ' },
          { LabelName: 'TOKUSEI_066', OriginalText: 'もうか' },
          { LabelName: 'TOKUSEI_094', OriginalText: 'サンパワー' },
        ],
      });
    }
    if (path.includes('jpn/monsname_syn.json')) {
      return JSON.stringify({
        mSDataSet: [
          { LabelName: 'MONSNAME_000', OriginalText: 'タマゴ' },
          { LabelName: 'MONSNAME_001', OriginalText: 'フシギダネ' },
          { LabelName: 'MONSNAME_006', OriginalText: 'リザードン' },
          { LabelName: 'MONSNAME_019', OriginalText: 'コラッタ' },
          { LabelName: 'MONSNAME_029', OriginalText: 'ニドラン♀' },
          { LabelName: 'MONSNAME_386', OriginalText: 'デオキシス' },
          { LabelName: 'MONSNAME_808', OriginalText: 'メルタン' },
        ],
      });
    }
    if (path.includes('usa/monsname_syn.json')) {
      return JSON.stringify({
        mSDataSet: [
          { LabelName: 'MONSNAME_000', OriginalText: 'Egg' },
          { LabelName: 'MONSNAME_001', OriginalText: 'Bulbasaur' },
          { LabelName: 'MONSNAME_006', OriginalText: 'Charizard' },
          { LabelName: 'MONSNAME_019', OriginalText: 'Rattata' },
          { LabelName: 'MONSNAME_029', OriginalText: 'Nidoran' },
          { LabelName: 'MONSNAME_386', OriginalText: 'Deoxys' },
          { LabelName: 'MONSNAME_808', OriginalText: 'Meltan' },
        ],
      });
    }
    if (path.includes('zkn_form_syn.json')) {
      return JSON.stringify({
        mSDataSet: [
          { LabelName: 'ZKN_FORM_386_001', OriginalText: 'アタックフォルム' },
        ],
      });
    }
    if (path.includes('personal.json')) {
      return JSON.stringify([]);
    }
    return '{}';
  }),
}));

function makePokemon(overrides: Partial<ChampoutPokemon> & Pick<ChampoutPokemon, 'displayName' | 'natNum'>): ChampoutPokemon {
  return {
    nameEng: '',
    types: [],
    abilities: [],
    baseStats: { H: 0, A: 0, B: 0, C: 0, D: 0, S: 0 },
    source: 'Champions',
    ...overrides,
  };
}

describe('resolveFormeDisplayName', () => {
  it('champout のフォーム名がある場合はそれを使う', () => {
    expect(resolveFormeDisplayName('Deoxys-Attack', 'Attack', 'デオキシス', 'アタックフォルム'))
      .toBe('デオキシス(アタックフォルム)');
  });

  it('champout フォーム名にベース名が含まれる場合はフォーム名をそのまま返す', () => {
    expect(resolveFormeDisplayName('Rotom-Wash', 'Wash', 'ロトム', 'ウォッシュロトム'))
      .toBe('ウォッシュロトム');
  });

  it('メガ進化の champout フォーム名はそのまま返す', () => {
    expect(resolveFormeDisplayName('Charizard-Mega-X', 'Mega-X', 'リザードン', 'メガリザードンＸ'))
      .toBe('メガリザードンＸ');
  });

  it('forme 空 + BASE_FORM_OVERRIDES ありならオーバーライド名を使う', () => {
    expect(resolveFormeDisplayName('Deoxys', '', 'デオキシス', null))
      .toBe('デオキシス(ノーマルフォルム)');
  });

  it('forme 空 + BASE_FORM_OVERRIDES なしならベース名をそのまま返す', () => {
    expect(resolveFormeDisplayName('Pikachu', '', 'ピカチュウ', null))
      .toBe('ピカチュウ');
  });

  it('SPECIFIC_FORME_NAMES に該当する場合はそれを使う', () => {
    expect(resolveFormeDisplayName('Kyurem-Black', 'Black', 'キュレム', null))
      .toBe('ブラックキュレム');
  });

  it('Mega フォームはメガ+ベース名', () => {
    expect(resolveFormeDisplayName('Gengar-Mega', 'Mega', 'ゲンガー', null))
      .toBe('メガゲンガー');
  });

  it('Mega-X フォームはメガ+ベース名+Ｘ', () => {
    expect(resolveFormeDisplayName('Charizard-Mega-X', 'Mega-X', 'リザードン', null))
      .toBe('メガリザードンＸ');
  });

  it('Mega-Y フォームはメガ+ベース名+Ｙ', () => {
    expect(resolveFormeDisplayName('Charizard-Mega-Y', 'Mega-Y', 'リザードン', null))
      .toBe('メガリザードンＹ');
  });

  it('Primal フォームはゲンシ+ベース名', () => {
    expect(resolveFormeDisplayName('Groudon-Primal', 'Primal', 'グラードン', null))
      .toBe('ゲンシグラードン');
  });

  it('FORME_SUFFIX_TO_JA に該当する場合はベース名(日本語フォーム名)', () => {
    expect(resolveFormeDisplayName('Rattata-Alola', 'Alola', 'コラッタ', null))
      .toBe('コラッタ(アローラのすがた)');
  });

  it('どのパターンにも該当しない場合は null を返す', () => {
    expect(resolveFormeDisplayName('Unknown-Xyz', 'Xyz', 'テスト', null))
      .toBeNull();
  });
});

describe('supplementNonChampionsPokemon', () => {
  it('Champions に存在する natNum はスキップする', () => {
    const pokemon = new Map<string, ChampoutPokemon>([
      ['フシギダネ', makePokemon({ displayName: 'フシギダネ', natNum: 1, nameEng: 'Bulbasaur' })],
    ]);
    const nameToNatNum = new Map([['フシギダネ', 1]]);

    supplementNonChampionsPokemon(pokemon, nameToNatNum, '/dummy');

    expect(pokemon.get('フシギダネ')!.source).toBe('Champions');
  });

  it('Champions 未収録のポケモンを @pkmn/dex から補完する', () => {
    const pokemon = new Map<string, ChampoutPokemon>();
    const nameToNatNum = new Map<string, number>();

    supplementNonChampionsPokemon(pokemon, nameToNatNum, '/dummy');

    const meltan = pokemon.get('メルタン');
    expect(meltan).toBeDefined();
    expect(meltan!.source).toBe('Showdown');
    expect(meltan!.types).toEqual(['はがね']);
    expect(meltan!.baseStats.H).toBe(46);
  });

  it('champout にある特性は日本語に翻訳される', () => {
    const pokemon = new Map<string, ChampoutPokemon>();
    const nameToNatNum = new Map<string, number>();

    supplementNonChampionsPokemon(pokemon, nameToNatNum, '/dummy');

    const bulbasaur = pokemon.get('フシギダネ');
    expect(bulbasaur).toBeDefined();
    expect(bulbasaur!.abilities).toContain('しんりょく');
    expect(bulbasaur!.abilities).toContain('ようりょくそ');
  });

  it('champout にない特性も SUPPLEMENTAL_ABILITIES で翻訳される', () => {
    const pokemon = new Map<string, ChampoutPokemon>();
    const nameToNatNum = new Map<string, number>();

    supplementNonChampionsPokemon(pokemon, nameToNatNum, '/dummy');

    const meltan = pokemon.get('メルタン');
    expect(meltan).toBeDefined();
    expect(meltan!.abilities).toContain('じりょく');
  });

  it('champout の英語名が @pkmn/dex と不一致でも natNum で解決する', () => {
    const pokemon = new Map<string, ChampoutPokemon>();
    const nameToNatNum = new Map<string, number>();

    supplementNonChampionsPokemon(pokemon, nameToNatNum, '/dummy');

    const nidoran = pokemon.get('ニドラン♀');
    expect(nidoran).toBeDefined();
    expect(nidoran!.source).toBe('Showdown');
    expect(nidoran!.natNum).toBe(29);
    expect(nidoran!.types).toEqual(['どく']);
  });
});

describe('supplementPokemonFormes', () => {
  it('リージョンフォーム (isNonstandard=Past) を補完する', () => {
    const pokemon = new Map<string, ChampoutPokemon>();
    const nameToNatNum = new Map<string, number>();

    supplementPokemonFormes(pokemon, nameToNatNum, '/dummy');

    const rattataAlola = pokemon.get('コラッタ(アローラのすがた)');
    expect(rattataAlola).toBeDefined();
    expect(rattataAlola!.source).toBe('Showdown');
    expect(rattataAlola!.types).toEqual(['あく', 'ノーマル']);
    expect(rattataAlola!.natNum).toBe(19);
  });

  it('Gmax フォームは除外する', () => {
    const pokemon = new Map<string, ChampoutPokemon>();
    const nameToNatNum = new Map<string, number>();

    supplementPokemonFormes(pokemon, nameToNatNum, '/dummy');

    const gmaxNames = [...pokemon.keys()].filter(n => n.includes('Gmax') || n.includes('キョダイ'));
    expect(gmaxNames).toEqual([]);
  });

  it('champout の zkn_form_syn.json からフォーム名を取得する', () => {
    const pokemon = new Map<string, ChampoutPokemon>([
      ['デオキシス', makePokemon({ displayName: 'デオキシス', natNum: 386, source: 'Showdown' })],
    ]);
    const nameToNatNum = new Map([['デオキシス', 386]]);

    supplementPokemonFormes(pokemon, nameToNatNum, '/dummy');

    const attack = pokemon.get('デオキシス(アタックフォルム)');
    expect(attack).toBeDefined();
    expect(attack!.natNum).toBe(386);
  });

  it('BASE_FORM_OVERRIDES で Showdown ベースフォームをリネームする', () => {
    const pokemon = new Map<string, ChampoutPokemon>([
      ['デオキシス', makePokemon({ displayName: 'デオキシス', natNum: 386, source: 'Showdown' })],
    ]);
    const nameToNatNum = new Map([['デオキシス', 386]]);

    supplementPokemonFormes(pokemon, nameToNatNum, '/dummy');

    expect(pokemon.has('デオキシス')).toBe(false);
    expect(pokemon.has('デオキシス(ノーマルフォルム)')).toBe(true);
  });

  it('Champions ソースのベースフォームはリネームしない', () => {
    const pokemon = new Map<string, ChampoutPokemon>([
      ['デオキシス', makePokemon({ displayName: 'デオキシス', natNum: 386, source: 'Champions' })],
    ]);
    const nameToNatNum = new Map([['デオキシス', 386]]);

    supplementPokemonFormes(pokemon, nameToNatNum, '/dummy');

    expect(pokemon.has('デオキシス')).toBe(true);
  });

  it('既存のフォームは上書きしない', () => {
    const pokemon = new Map<string, ChampoutPokemon>([
      ['コラッタ(アローラのすがた)', makePokemon({ displayName: 'コラッタ(アローラのすがた)', natNum: 19, source: 'Champions' })],
    ]);
    const nameToNatNum = new Map([['コラッタ(アローラのすがた)', 19]]);

    supplementPokemonFormes(pokemon, nameToNatNum, '/dummy');

    expect(pokemon.get('コラッタ(アローラのすがた)')!.source).toBe('Champions');
  });

  it('メガ進化フォームを追加する', () => {
    const pokemon = new Map<string, ChampoutPokemon>();
    const nameToNatNum = new Map<string, number>();

    supplementPokemonFormes(pokemon, nameToNatNum, '/dummy');

    const megaX = pokemon.get('メガリザードンＸ');
    expect(megaX).toBeDefined();
    expect(megaX!.types).toEqual(['ほのお', 'ドラゴン']);
  });
});
