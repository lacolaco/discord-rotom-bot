/**
 * Champout 解析モジュール
 *
 * vendor/champout (projectpokemon/champout) のマスターデータとローカライズデータを解析し、
 * Pokemon Champions に収録されているポケモンデータを返す。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// --- Types ---

export interface ChampoutPokemon {
  displayName: string;
  natNum: number;
  nameEng: string;
  types: string[];
  abilities: string[];
  baseStats: { H: number; A: number; B: number; C: number; D: number; S: number };
  source: string;
}

export interface PersonalEntry {
  id: string;
  no: string;
  fo: string;
  ms_name_lbl: string;
  ms_form_lbl: string;
  type1: string;
  type2: string;
  hp: string;
  atk: string;
  def: string;
  spatk: string;
  spdef: string;
  agi: string;
  toku0: string;
  toku1: string;
  toku2: string;
  is_valid: string;
}

interface TextEntry {
  LabelName: string;
  OriginalText: string;
}

interface TextDataFile {
  mSDataSet: TextEntry[];
}

// --- Type ID mapping (Pokemon internal type ordering) ---

const TYPE_ID_TO_JA: Record<string, string> = {
  '0': 'ノーマル', '1': 'かくとう', '2': 'ひこう', '3': 'どく', '4': 'じめん',
  '5': 'いわ', '6': 'むし', '7': 'ゴースト', '8': 'はがね', '9': 'ほのお',
  '10': 'みず', '11': 'くさ', '12': 'でんき', '13': 'エスパー', '14': 'こおり',
  '15': 'ドラゴン', '16': 'あく', '17': 'フェアリー',
};

// --- Cosmetic form filtering ---

/**
 * 同一 no 内でベースフォームと種族値・特性が一致するフォームを除外する。
 * champout の personal.json にはコスメティックフォーム（ビビヨン模様、トリミアンカット等）や
 * バトル中のみの変身フォーム（ポワルン天候フォーム等）も含まれているため、
 * 種族値と特性が同一のフォームを自動検出してフィルタする。タイプのみ異なるフォームも除外対象。
 */
export function filterCosmeticForms(entries: PersonalEntry[]): PersonalEntry[] {
  const byNo = new Map<string, PersonalEntry[]>();
  for (const e of entries) {
    const list = byNo.get(e.no) ?? [];
    list.push(e);
    byNo.set(e.no, list);
  }

  const result: PersonalEntry[] = [];
  for (const group of byNo.values()) {
    if (group.length <= 1) {
      result.push(...group);
      continue;
    }
    const base = group.find((e) => e.fo === '0');
    if (!base) {
      result.push(...group);
      continue;
    }
    result.push(base);
    for (const e of group) {
      if (e.fo === '0') continue;
      if (isCosmeticForm(base, e)) continue;
      result.push(e);
    }
  }
  return result;
}

export function isCosmeticForm(a: PersonalEntry, b: PersonalEntry): boolean {
  return (
    a.hp === b.hp && a.atk === b.atk && a.def === b.def &&
    a.spatk === b.spatk && a.spdef === b.spdef && a.agi === b.agi &&
    a.toku0 === b.toku0 && a.toku1 === b.toku1 && a.toku2 === b.toku2
  );
}

// --- Text data loading ---

function loadTextMap(path: string): Map<string, string> {
  const data: TextDataFile = JSON.parse(readFileSync(path, 'utf-8'));
  const map = new Map<string, string>();
  for (const entry of data.mSDataSet) {
    map.set(entry.LabelName, entry.OriginalText);
  }
  return map;
}

// --- Display name construction ---

export function buildDisplayName(baseName: string, formName: string): string {
  if (!formName) return baseName;
  if (formName.startsWith('メガ') || formName.startsWith('ゲンシ')) return formName;
  if (formName.includes(baseName)) return formName;
  return `${baseName}(${formName})`;
}

/**
 * ベースフォーム (fo=0) で formName が「{baseName}のすがた」のようなパターンの場合、
 * フォーム名を無視して baseName をそのまま使う。
 */
export function isRedundantBaseFormName(baseName: string, formName: string, fo: string): boolean {
  if (fo !== '0') return false;
  if (!formName) return false;
  if (formName === `${baseName}のすがた`) return true;
  return false;
}

// --- Main parser ---

export function parseChampout(champoutBase: string): {
  pokemon: Map<string, ChampoutPokemon>;
  nameToNatNum: Map<string, number>;
} {
  const personal: PersonalEntry[] = JSON.parse(
    readFileSync(resolve(champoutBase, 'masterdata/personal.json'), 'utf-8'),
  );

  const jpnNames = loadTextMap(resolve(champoutBase, 'rom-txt/jpn/monsname_syn.json'));
  const engNames = loadTextMap(resolve(champoutBase, 'rom-txt/usa/monsname_syn.json'));
  const jpnAbilities = loadTextMap(resolve(champoutBase, 'rom-txt/jpn/tokusei.json'));
  const jpnForms = loadTextMap(resolve(champoutBase, 'rom-txt/jpn/zkn_form_syn.json'));

  const filtered = filterCosmeticForms(personal.filter((e) => e.is_valid === '1'));

  const pokemon = new Map<string, ChampoutPokemon>();
  const nameToNatNum = new Map<string, number>();

  for (const entry of filtered) {
    const baseName = jpnNames.get(entry.ms_name_lbl) ?? '';
    if (!baseName) {
      console.log(`  WARNING: no name for ${entry.ms_name_lbl}`);
      continue;
    }

    let formName = jpnForms.get(entry.ms_form_lbl) ?? '';
    if (isRedundantBaseFormName(baseName, formName, entry.fo)) {
      formName = '';
    }

    const displayName = buildDisplayName(baseName, formName);
    if (pokemon.has(displayName)) {
      console.log(`  WARNING: duplicate displayName skipped: ${displayName} (entry ${entry.id})`);
      continue;
    }

    const nameEng = engNames.get(entry.ms_name_lbl) ?? '';
    const natNum = parseInt(entry.no);

    const type1 = TYPE_ID_TO_JA[entry.type1];
    const type2 = TYPE_ID_TO_JA[entry.type2];
    if (!type1) {
      console.log(`  WARNING: unknown type ID ${entry.type1} for ${displayName}`);
      continue;
    }
    if (entry.type2 !== entry.type1 && !type2) {
      console.log(`  WARNING: unknown type2 ID ${entry.type2} for ${displayName}`);
    }
    const types = type1 === type2 ? [type1] : type2 ? [type1, type2] : [type1];

    const abilities: string[] = [];
    for (const key of [entry.toku0, entry.toku1, entry.toku2]) {
      const id = parseInt(key);
      if (id <= 0) continue;
      const name = jpnAbilities.get(`TOKUSEI_${String(id).padStart(3, '0')}`);
      if (name && !abilities.includes(name)) {
        abilities.push(name);
      }
    }

    pokemon.set(displayName, {
      displayName,
      natNum,
      nameEng,
      types,
      abilities,
      baseStats: {
        H: parseInt(entry.hp),
        A: parseInt(entry.atk),
        B: parseInt(entry.def),
        C: parseInt(entry.spatk),
        D: parseInt(entry.spdef),
        S: parseInt(entry.agi),
      },
      source: 'Champions',
    });
    nameToNatNum.set(displayName, natNum);
  }

  return { pokemon, nameToNatNum };
}
