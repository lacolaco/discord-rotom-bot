import { describe, expect, it, vi } from 'vitest';
import type { EntryInfo, GamePokedexEntry, StatsEntry } from './pokedex-parser';
import { supplementMissingTypes } from './fallback';

vi.mock('./showdown', () => ({
  fetchEntry: vi.fn(
    (nameEng: string, formEng: string): GamePokedexEntry | null => {
      if (nameEng === 'Goodra' && formEng === 'Hisui') {
        return {
          type1: 'ドラゴン',
          type2: 'はがね',
          hp: 80,
          attack: 100,
          defense: 100,
          special_attack: 110,
          special_defense: 150,
          speed: 60,
          ability1: 'そうしょく',
          ability2: 'シェルアーマー',
          dream_ability: 'ぬめぬめ',
        };
      }
      if (nameEng === 'TestMon' && formEng === '') {
        return {
          type1: 'ほのお',
          type2: '',
          hp: 50,
          attack: 50,
          defense: 50,
          special_attack: 50,
          special_defense: 50,
          speed: 50,
          ability1: 'もうか',
          ability2: '',
          dream_ability: '',
        };
      }
      return null;
    },
  ),
}));

function makeInfo(overrides: Partial<EntryInfo> & Pick<EntryInfo, 'displayName' | 'natNum' | 'nameEng'>): EntryInfo {
  return { formEng: '', ...overrides };
}

function makeStats(overrides: Partial<GamePokedexEntry>): StatsEntry {
  return {
    stats: {
      type1: '',
      type2: '',
      hp: 80,
      attack: 100,
      defense: 100,
      special_attack: 110,
      special_defense: 150,
      speed: 60,
      ability1: '',
      ability2: '',
      dream_ability: '',
      ...overrides,
    },
    game: 'LegendsArceus',
    pokedex: 'LegendsArceus',
  };
}

describe('supplementMissingTypes', () => {
  it('type1ありability空のエントリのabilityを補完し、type1は上書きしない', () => {
    const entryIdToInfo = new Map<string, EntryInfo>([
      ['0706_03', makeInfo({ displayName: 'ヌメルゴン(ヒスイのすがた)', natNum: 706, nameEng: 'Goodra', formEng: 'Hisui' })],
    ]);
    const statsMap = new Map<string, StatsEntry>([
      ['0706_03', makeStats({ type1: 'ドラゴン', type2: 'はがね' })],
    ]);

    supplementMissingTypes(entryIdToInfo, statsMap, '/dummy');

    const stats = statsMap.get('0706_03')!.stats;
    expect(stats.type1).toBe('ドラゴン');
    expect(stats.type2).toBe('はがね');
    expect(stats.ability1).toBe('そうしょく');
    expect(stats.ability2).toBe('シェルアーマー');
    expect(stats.dream_ability).toBe('ぬめぬめ');
  });

  it('type1もabilityも空のエントリは両方とも補完する', () => {
    const entryIdToInfo = new Map<string, EntryInfo>([
      ['test01', makeInfo({ displayName: 'テストモン', natNum: 999, nameEng: 'TestMon' })],
    ]);
    const statsMap = new Map<string, StatsEntry>([
      ['test01', makeStats({})],
    ]);

    supplementMissingTypes(entryIdToInfo, statsMap, '/dummy');

    const stats = statsMap.get('test01')!.stats;
    expect(stats.type1).toBe('ほのお');
    expect(stats.ability1).toBe('もうか');
  });

  it('type1もabilityもあるエントリはスキップする', () => {
    const entryIdToInfo = new Map<string, EntryInfo>([
      ['0025', makeInfo({ displayName: 'ピカチュウ', natNum: 25, nameEng: 'Pikachu' })],
    ]);
    const original: GamePokedexEntry = {
      type1: 'でんき', type2: '', hp: 35, attack: 55, defense: 40,
      special_attack: 50, special_defense: 50, speed: 90,
      ability1: 'せいでんき', ability2: '', dream_ability: 'ひらいしん',
    };
    const statsMap = new Map<string, StatsEntry>([
      ['0025', { stats: { ...original }, game: 'Scarlet_Violet', pokedex: 'Scarlet_Violet' }],
    ]);

    supplementMissingTypes(entryIdToInfo, statsMap, '/dummy');

    const stats = statsMap.get('0025')!.stats;
    expect(stats).toEqual(original);
  });

  it('fetchEntryがnullを返すエントリは変更しない', () => {
    const entryIdToInfo = new Map<string, EntryInfo>([
      ['unknown', makeInfo({ displayName: '不明ポケモン', natNum: 9999, nameEng: 'Unknown' })],
    ]);
    const statsMap = new Map<string, StatsEntry>([
      ['unknown', makeStats({ type1: 'ノーマル' })],
    ]);

    supplementMissingTypes(entryIdToInfo, statsMap, '/dummy');

    const stats = statsMap.get('unknown')!.stats;
    expect(stats.ability1).toBe('');
  });
});
