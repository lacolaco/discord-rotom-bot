import { describe, expect, it, vi } from 'vitest';
import type { PersonalEntry } from './champout-parser';
import {
  buildDisplayName,
  filterCosmeticForms,
  isCosmeticForm,
  isRedundantBaseFormName,
  parseChampout,
} from './champout-parser';

vi.mock('node:fs', () => ({
  readFileSync: vi.fn((path: string) => {
    if (path.includes('personal.json')) {
      return JSON.stringify([
        {
          id: '0', no: '25', fo: '0', ms_name_lbl: 'MONSNAME_025', ms_form_lbl: '',
          type1: '12', type2: '12', hp: '35', atk: '55', def: '40', spatk: '50', spdef: '50', agi: '90',
          toku0: '9', toku1: '0', toku2: '31', is_valid: '1',
        },
        {
          id: '1', no: '0', fo: '0', ms_name_lbl: 'MONSNAME_000', ms_form_lbl: '',
          type1: '0', type2: '0', hp: '0', atk: '0', def: '0', spatk: '0', spdef: '0', agi: '0',
          toku0: '0', toku1: '0', toku2: '0', is_valid: '0',
        },
      ]);
    }
    if (path.includes('jpn/monsname_syn.json')) {
      return JSON.stringify({ mSDataSet: [
        { LabelName: 'MONSNAME_025', OriginalText: 'ピカチュウ' },
      ] });
    }
    if (path.includes('usa/monsname_syn.json')) {
      return JSON.stringify({ mSDataSet: [
        { LabelName: 'MONSNAME_025', OriginalText: 'Pikachu' },
      ] });
    }
    if (path.includes('tokusei.json')) {
      return JSON.stringify({ mSDataSet: [
        { LabelName: 'TOKUSEI_009', OriginalText: 'せいでんき' },
        { LabelName: 'TOKUSEI_031', OriginalText: 'ひらいしん' },
      ] });
    }
    if (path.includes('zkn_form_syn.json')) {
      return JSON.stringify({ mSDataSet: [] });
    }
    return '[]';
  }),
}));

function makeEntry(overrides: Partial<PersonalEntry> = {}): PersonalEntry {
  return {
    id: '0', no: '1', fo: '0',
    ms_name_lbl: 'MONSNAME_001', ms_form_lbl: 'ZKN_FORM_000',
    type1: '0', type2: '0',
    hp: '50', atk: '50', def: '50', spatk: '50', spdef: '50', agi: '50',
    toku0: '1', toku1: '0', toku2: '0',
    is_valid: '1',
    ...overrides,
  };
}

describe('isCosmeticForm', () => {
  it('全フィールド一致なら true', () => {
    const a = makeEntry();
    const b = makeEntry({ id: '1', fo: '1' });
    expect(isCosmeticForm(a, b)).toBe(true);
  });

  it('種族値が異なれば false', () => {
    const a = makeEntry();
    const b = makeEntry({ id: '1', fo: '1', hp: '100' });
    expect(isCosmeticForm(a, b)).toBe(false);
  });

  it('タイプのみ異なる場合も true（ポワルン天候フォーム等）', () => {
    const a = makeEntry();
    const b = makeEntry({ id: '1', fo: '1', type1: '9' });
    expect(isCosmeticForm(a, b)).toBe(true);
  });

  it('特性スロットが異なれば false', () => {
    const a = makeEntry();
    const b = makeEntry({ id: '1', fo: '1', toku0: '2' });
    expect(isCosmeticForm(a, b)).toBe(false);
  });
});

describe('filterCosmeticForms', () => {
  it('単独エントリはそのまま返す', () => {
    const entries = [makeEntry({ no: '25' })];
    expect(filterCosmeticForms(entries)).toEqual(entries);
  });

  it('ベースフォームと同一種族値のフォームを除外する', () => {
    const base = makeEntry({ id: '0', no: '666', fo: '0' });
    const cosmetic1 = makeEntry({ id: '1', no: '666', fo: '1' });
    const cosmetic2 = makeEntry({ id: '2', no: '666', fo: '2' });
    const result = filterCosmeticForms([base, cosmetic1, cosmetic2]);
    expect(result).toEqual([base]);
  });

  it('種族値が異なるフォームは残す', () => {
    const base = makeEntry({ id: '0', no: '6', fo: '0' });
    const mega = makeEntry({ id: '1', no: '6', fo: '1', hp: '78', atk: '130' });
    const result = filterCosmeticForms([base, mega]);
    expect(result).toEqual([base, mega]);
  });

  it('ベースフォーム (fo=0) がない場合は全て残す', () => {
    const form1 = makeEntry({ id: '0', no: '999', fo: '1' });
    const form2 = makeEntry({ id: '1', no: '999', fo: '2' });
    const result = filterCosmeticForms([form1, form2]);
    expect(result).toEqual([form1, form2]);
  });

  it('異なる no のエントリは独立して処理される', () => {
    const a = makeEntry({ id: '0', no: '1', fo: '0' });
    const b = makeEntry({ id: '1', no: '2', fo: '0' });
    const cosmetic = makeEntry({ id: '2', no: '1', fo: '1' });
    const result = filterCosmeticForms([a, cosmetic, b]);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual(a);
    expect(result).toContainEqual(b);
  });
});

describe('buildDisplayName', () => {
  it('フォーム名なしならベース名をそのまま返す', () => {
    expect(buildDisplayName('ピカチュウ', '')).toBe('ピカチュウ');
  });

  it('メガ接頭辞ならフォーム名をそのまま返す', () => {
    expect(buildDisplayName('リザードン', 'メガリザードンＸ')).toBe('メガリザードンＸ');
  });

  it('ゲンシ接頭辞ならフォーム名をそのまま返す', () => {
    expect(buildDisplayName('カイオーガ', 'ゲンシカイオーガ')).toBe('ゲンシカイオーガ');
  });

  it('フォーム名にベース名が含まれていればフォーム名をそのまま返す', () => {
    expect(buildDisplayName('ロトム', 'ウォッシュロトム')).toBe('ウォッシュロトム');
  });

  it('それ以外はベース名(フォーム名)の形式', () => {
    expect(buildDisplayName('ニャオハ', 'アローラのすがた')).toBe('ニャオハ(アローラのすがた)');
  });
});

describe('isRedundantBaseFormName', () => {
  it('fo=0 で「{baseName}のすがた」なら true', () => {
    expect(isRedundantBaseFormName('ロトム', 'ロトムのすがた', '0')).toBe(true);
  });

  it('fo!=0 なら false', () => {
    expect(isRedundantBaseFormName('ロトム', 'ロトムのすがた', '1')).toBe(false);
  });

  it('フォーム名が空なら false', () => {
    expect(isRedundantBaseFormName('ピカチュウ', '', '0')).toBe(false);
  });

  it('パターン不一致なら false', () => {
    expect(isRedundantBaseFormName('ロトム', 'ウォッシュロトム', '0')).toBe(false);
  });
});

describe('parseChampout', () => {
  it('is_valid=1 のエントリのみ解析する', () => {
    const { pokemon } = parseChampout('/dummy');
    expect(pokemon.size).toBe(1);
    expect(pokemon.has('ピカチュウ')).toBe(true);
  });

  it('種族値・タイプ・特性を正しく解析する', () => {
    const { pokemon } = parseChampout('/dummy');
    const pika = pokemon.get('ピカチュウ')!;
    expect(pika.types).toEqual(['でんき']);
    expect(pika.baseStats).toEqual({ H: 35, A: 55, B: 40, C: 50, D: 50, S: 90 });
    expect(pika.abilities).toEqual(['せいでんき', 'ひらいしん']);
    expect(pika.natNum).toBe(25);
    expect(pika.nameEng).toBe('Pikachu');
    expect(pika.source).toBe('Champions');
  });

  it('同一タイプは重複しない', () => {
    const { pokemon } = parseChampout('/dummy');
    expect(pokemon.get('ピカチュウ')!.types).toEqual(['でんき']);
  });

  it('nameToNatNum に正しくマッピングされる', () => {
    const { nameToNatNum } = parseChampout('/dummy');
    expect(nameToNatNum.get('ピカチュウ')).toBe(25);
  });
});
