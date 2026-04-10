/**
 * フォールバックデータソースモジュール
 *
 * @pkmn/dex (Showdown) からstats/types/abilitiesを取得する。
 * 特性の日本語名はpokedexゲームデータから構築したマップで解決し、
 * マップにないもののみPokéAPIから取得する。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Dex } from '@pkmn/dex';
import type { GamePokedexEntry } from './pokedex-parser';

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

// drop対象ポケモン固有の特性（どのゲームファイルにも出現しない）
const EXCLUSIVE_ABILITIES: Record<string, string> = {
  'Delta Stream': 'デルタストリーム',
  'Primordial Sea': 'はじまりのうみ',
  'Desolate Land': 'おわりのだいち',
  'Neuroforce': 'ブレインフォース',
  "Mind's Eye": 'しんがん',
};

let abilityMapBuilt = false;
const abilityEnToJa = new Map<string, string>(Object.entries(EXCLUSIVE_ABILITIES));

/**
 * pokedexゲームデータから英語→日本語の特性マップを構築する。
 * 特性数が1のエントリのみ使用して曖昧マッチを防ぐ。
 */
function buildAbilityMap(pokedexBase: string): void {
  if (abilityMapBuilt) return;
  abilityMapBuilt = true;

  const globalPokedex = JSON.parse(
    readFileSync(resolve(pokedexBase, 'pokedex.json'), 'utf-8'),
  );

  // 最新のゲームファイルから優先的にスキャン
  const games = [
    'Scarlet_Violet', 'LegendsZA', 'Sword_Shield', 'UltraSun_UltraMoon',
    'Sun_Moon', 'X_Y', 'Black2_White2', 'Black_White',
  ];

  for (const game of games) {
    let gameData: { pokedex: Record<string, unknown> };
    try {
      gameData = JSON.parse(
        readFileSync(resolve(pokedexBase, game, `${game}.json`), 'utf-8'),
      );
    } catch {
      continue;
    }

    for (const section of Object.values(gameData.pokedex)) {
      if (Array.isArray(section)) continue;
      for (const entries of Object.values(section as Record<string, Record<string, any>>)) {
        if (typeof entries !== 'object' || entries === null) continue;
        for (const [entryId, entry] of Object.entries(entries)) {
          if (typeof entry.hp !== 'number') continue;
          const natNum = entryId.split('_')[0];
          const globalEntry = globalPokedex.pokedex[natNum]?.[entryId];
          if (!globalEntry?.name?.eng) continue;

          const sp = dex.species.get(
            buildLookupName(globalEntry.name.eng, globalEntry.forms?.eng ?? ''),
          );
          if (!sp?.exists) continue;

          // スロット単位でマップ（first-win: 既存エントリは上書きしない）
          if (sp.abilities['0'] && entry.ability1 && !abilityEnToJa.has(sp.abilities['0'])) {
            abilityEnToJa.set(sp.abilities['0'], entry.ability1);
          }
          if (sp.abilities['1'] && entry.ability2 && !abilityEnToJa.has(sp.abilities['1'])) {
            abilityEnToJa.set(sp.abilities['1'], entry.ability2);
          }
          if (sp.abilities['H'] && entry.dream_ability && !abilityEnToJa.has(sp.abilities['H'])) {
            abilityEnToJa.set(sp.abilities['H'], entry.dream_ability);
          }
        }
      }
    }
  }
}

function getAbilityJaName(englishName: string): string {
  return abilityEnToJa.get(englishName) ?? englishName;
}

// --- Lookup ---

function buildLookupName(nameEng: string, formEng: string): string {
  if (!formEng) return nameEng;
  if (formEng.toLowerCase().includes(nameEng.toLowerCase())) {
    const escaped = nameEng.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rest = formEng.replace(new RegExp(escaped, 'i'), '').trim();
    if (rest) return `${nameEng}-${rest}`;
    return nameEng;
  }
  const cleaned = formEng.replace(/\s*Forme?\s*$/i, '').trim();
  return `${nameEng}-${cleaned}`;
}

/**
 * @pkmn/dex からポケモンデータを取得し、GamePokedexEntry 形式で返す。
 * 初回呼び出し時にpokedexBase指定で特性マップを構築する。
 */
export function fetchEntry(
  nameEng: string,
  formEng: string,
  pokedexBase: string,
): GamePokedexEntry | null {
  buildAbilityMap(pokedexBase);

  const lookup = buildLookupName(nameEng, formEng);
  const species = dex.species.get(lookup);
  if (!species?.exists) return null;

  const types = species.types;
  const abilities = species.abilities;
  const regularSlots = [abilities['0'], abilities['1']].filter(Boolean);
  const hiddenSlot = abilities['H'] ?? '';

  return {
    type1: TYPE_EN_TO_JA[types[0]] ?? types[0],
    type2: types[1] ? (TYPE_EN_TO_JA[types[1]] ?? types[1]) : '',
    hp: species.baseStats.hp,
    attack: species.baseStats.atk,
    defense: species.baseStats.def,
    special_attack: species.baseStats.spa,
    special_defense: species.baseStats.spd,
    speed: species.baseStats.spe,
    ability1: regularSlots[0] ? getAbilityJaName(regularSlots[0]) : '',
    ability2: regularSlots[1] ? getAbilityJaName(regularSlots[1]) : '',
    dream_ability: hiddenSlot ? getAbilityJaName(hiddenSlot) : '',
  };
}
