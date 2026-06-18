import { describe, expect, it, vi } from 'vitest';
import type { ChampoutPokemon } from './champout-parser';
import { supplementNonChampionsPokemon } from './fallback';

vi.mock('@pkmn/dex', () => {
  const species = new Map<string, any>();
  species.set('bulbasaur', {
    name: 'Bulbasaur', num: 1, exists: true, forme: '',
    types: ['Grass', 'Poison'],
    abilities: { '0': 'Overgrow', '1': '', H: 'Chlorophyll' },
    baseStats: { hp: 45, atk: 49, def: 49, spa: 65, spd: 65, spe: 45 },
  });
  species.set('meltan', {
    name: 'Meltan', num: 808, exists: true, forme: '',
    types: ['Steel'],
    abilities: { '0': 'Magnet Pull', '1': '', H: '' },
    baseStats: { hp: 46, atk: 65, def: 65, spa: 55, spd: 35, spe: 34 },
  });
  return {
    Dex: {
      forGen: () => ({
        species: { get: (name: string) => species.get(name.toLowerCase()) ?? { exists: false } },
        abilities: { all: () => [
          { name: 'Overgrow', num: 65, exists: true, isNonstandard: null },
          { name: 'Chlorophyll', num: 34, exists: true, isNonstandard: null },
          { name: 'Magnet Pull', num: 42, exists: true, isNonstandard: null },
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
        ],
      });
    }
    if (path.includes('jpn/monsname_syn.json')) {
      return JSON.stringify({
        mSDataSet: [
          { LabelName: 'MONSNAME_000', OriginalText: 'タマゴ' },
          { LabelName: 'MONSNAME_001', OriginalText: 'フシギダネ' },
          { LabelName: 'MONSNAME_808', OriginalText: 'メルタン' },
        ],
      });
    }
    if (path.includes('usa/monsname_syn.json')) {
      return JSON.stringify({
        mSDataSet: [
          { LabelName: 'MONSNAME_000', OriginalText: 'Egg' },
          { LabelName: 'MONSNAME_001', OriginalText: 'Bulbasaur' },
          { LabelName: 'MONSNAME_808', OriginalText: 'Meltan' },
        ],
      });
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

  it('champout にない特性は英語名のまま返す', () => {
    const pokemon = new Map<string, ChampoutPokemon>();
    const nameToNatNum = new Map<string, number>();

    supplementNonChampionsPokemon(pokemon, nameToNatNum, '/dummy');

    const meltan = pokemon.get('メルタン');
    expect(meltan).toBeDefined();
    expect(meltan!.abilities).toContain('Magnet Pull');
  });
});
