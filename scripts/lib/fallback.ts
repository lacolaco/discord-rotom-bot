/**
 * フォールバック補完モジュール
 *
 * Champions 未収録のポケモンを @pkmn/dex から補完する。
 * champout の monsname_syn.json に日本語名があるが personal.json にエントリがないポケモンが対象。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Dex } from '@pkmn/dex';
import type { ChampoutPokemon } from './champout-parser';

const dex = Dex.forGen(9);

// --- Type translation ---

const TYPE_EN_TO_JA: Record<string, string> = {
  Normal: 'ノーマル', Fire: 'ほのお', Water: 'みず', Grass: 'くさ',
  Electric: 'でんき', Ice: 'こおり', Fighting: 'かくとう', Poison: 'どく',
  Ground: 'じめん', Flying: 'ひこう', Psychic: 'エスパー', Bug: 'むし',
  Rock: 'いわ', Ghost: 'ゴースト', Dark: 'あく', Dragon: 'ドラゴン',
  Steel: 'はがね', Fairy: 'フェアリー',
};

// --- Ability translation ---

interface TextDataFile {
  mSDataSet: Array<{ LabelName: string; OriginalText: string }>;
}

let champoutAbilityMap: Map<string, string> | null = null;

function loadChampoutAbilities(champoutBase: string): Map<string, string> {
  if (champoutAbilityMap) return champoutAbilityMap;
  const data: TextDataFile = JSON.parse(
    readFileSync(resolve(champoutBase, 'rom-txt/jpn/tokusei.json'), 'utf-8'),
  );
  champoutAbilityMap = new Map<string, string>();
  for (const entry of data.mSDataSet) {
    champoutAbilityMap.set(entry.LabelName, entry.OriginalText);
  }
  return champoutAbilityMap;
}

let abilityEnToJaMap: Map<string, string> | null = null;

/**
 * @pkmn/dex の全特性について英語名→日本語名のマッピングを構築する。
 * champout の tokusei.json をベースに、特性番号でマッチングする。
 * champout に含まれない特性（Champions未使用）は英語名のまま返す。
 */
function buildAbilityTranslation(champoutBase: string): Map<string, string> {
  if (abilityEnToJaMap) return abilityEnToJaMap;
  abilityEnToJaMap = new Map<string, string>();

  const champoutAbilities = loadChampoutAbilities(champoutBase);

  // champout のラベル (TOKUSEI_NNN) から Index → 日本語名 のマップを作成
  const idToJa = new Map<number, string>();
  for (const [label, name] of champoutAbilities) {
    const num = parseInt(label.replace('TOKUSEI_', ''));
    if (!isNaN(num)) idToJa.set(num, name);
  }

  for (const ability of dex.abilities.all()) {
    if (!ability.exists || ability.isNonstandard) continue;
    const jaName = idToJa.get(ability.num);
    if (jaName) {
      abilityEnToJaMap.set(ability.name, jaName);
    }
  }

  return abilityEnToJaMap;
}

function getAbilityJaName(englishName: string, champoutBase: string): string {
  const map = buildAbilityTranslation(champoutBase);
  return map.get(englishName) ?? englishName;
}

// --- Fallback ---

/**
 * Champions 未収録のポケモンを @pkmn/dex から補完する。
 * champout の monsname_syn.json に含まれる全1026種のうち、
 * personal.json にエントリがないものを検出し、@pkmn/dex で解決する。
 */
export function supplementNonChampionsPokemon(
  pokemon: Map<string, ChampoutPokemon>,
  nameToNatNum: Map<string, number>,
  champoutBase: string,
): void {
  const namesData: TextDataFile = JSON.parse(
    readFileSync(resolve(champoutBase, 'rom-txt/jpn/monsname_syn.json'), 'utf-8'),
  );
  const engNamesData: TextDataFile = JSON.parse(
    readFileSync(resolve(champoutBase, 'rom-txt/usa/monsname_syn.json'), 'utf-8'),
  );

  // MONSNAME_NNN → { jpn, eng, natNum }
  const allSpecies: { jpn: string; eng: string; natNum: number }[] = [];
  const engMap = new Map<string, string>();
  for (const entry of engNamesData.mSDataSet) {
    engMap.set(entry.LabelName, entry.OriginalText);
  }
  for (const entry of namesData.mSDataSet) {
    const numStr = entry.LabelName.replace('MONSNAME_', '');
    const natNum = parseInt(numStr);
    if (natNum <= 0) continue;
    allSpecies.push({
      jpn: entry.OriginalText,
      eng: engMap.get(entry.LabelName) ?? '',
      natNum,
    });
  }

  // Champions に存在する natNum を収集
  const championsNatNums = new Set<number>();
  for (const poke of pokemon.values()) {
    championsNatNums.add(poke.natNum);
  }

  let count = 0;
  for (const { jpn, eng, natNum } of allSpecies) {
    if (championsNatNums.has(natNum)) continue;
    if (!eng) continue;

    const species = dex.species.get(eng);
    if (!species?.exists) continue;
    if (species.forme) continue;

    const types = species.types.map((t) => TYPE_EN_TO_JA[t] ?? t);
    const deduped = types[0] === types[1] ? [types[0]] : types;

    const abilities: string[] = [];
    for (const slot of ['0', '1', 'H'] as const) {
      const abilityEng = species.abilities[slot];
      if (!abilityEng) continue;
      const ja = getAbilityJaName(abilityEng, champoutBase);
      if (!abilities.includes(ja)) abilities.push(ja);
    }

    const poke: ChampoutPokemon = {
      displayName: jpn,
      natNum,
      nameEng: eng,
      types: deduped,
      abilities,
      baseStats: {
        H: species.baseStats.hp,
        A: species.baseStats.atk,
        B: species.baseStats.def,
        C: species.baseStats.spa,
        D: species.baseStats.spd,
        S: species.baseStats.spe,
      },
      source: 'Showdown',
    };

    pokemon.set(jpn, poke);
    nameToNatNum.set(jpn, natNum);
    count++;
  }

  if (count > 0) {
    console.log(`  Fallback: ${count} non-Champions species from @pkmn/dex`);
  }
}
