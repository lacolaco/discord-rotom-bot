/**
 * フォールバック補完モジュール
 *
 * Champions 未収録のポケモンを @pkmn/dex から補完する。
 * champout の monsname_syn.json に日本語名があるが personal.json にエントリがないポケモンが対象。
 * ベースフォームだけでなく、リージョンフォーム・メガ進化・バトルフォーム等の
 * 別フォームも @pkmn/dex から補完する。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Dex } from '@pkmn/dex';
import type { ChampoutPokemon } from './champout-parser';
import { buildDisplayName } from './champout-parser';

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

// --- Forme name mapping ---

const FORME_SUFFIX_TO_JA: Record<string, string> = {
  'Alola': 'アローラのすがた',
  'Galar': 'ガラルのすがた',
  'Hisui': 'ヒスイのすがた',
  'Paldea': 'パルデアのすがた',
  'Origin': 'オリジンフォルム',
  'Therian': 'れいじゅうフォルム',
  'Sky': 'スカイフォルム',
  'Resolute': 'かくごのすがた',
  'Attack': 'アタックフォルム',
  'Defense': 'ディフェンスフォルム',
  'Speed': 'スピードフォルム',
  'Pirouette': 'ステップフォルム',
  'Unbound': 'ときはなたれしフーパ',
  'School': 'むれたすがた',
  'Noice': 'ナイスフェイス',
  'Low-Key': 'ローなすがた',
  'Blue-Striped': 'あおすじのすがた',
  'White-Striped': 'しろすじのすがた',
  'Sandy': 'すなちのミノ',
  'Trash': 'ゴミのミノ',
  'Roaming': 'とほフォルム',
  'Terastal': 'テラスタルフォルム',
  'Stellar': 'ステラフォルム',
  'Paldea-Combat': 'パルデアのすがた・コンバットしゅ',
  'Paldea-Blaze': 'パルデアのすがた・ブレイズしゅ',
  'Paldea-Aqua': 'パルデアのすがた・ウォーターしゅ',
  'Small': 'こだましゅ',
  'Large': 'おおだましゅ',
  'Super': 'ギガだましゅ',
  'Bloodmoon': 'アカツキ',
};

const SPECIFIC_FORME_NAMES: Record<string, string> = {
  'Kyurem-Black': 'ブラックキュレム',
  'Kyurem-White': 'ホワイトキュレム',
  'Necrozma-Dusk-Mane': 'たそがれのたてがみ',
  'Necrozma-Dawn-Wings': 'あかつきのつばさ',
  'Necrozma-Ultra': 'ウルトラネクロズマ',
  'Zacian-Crowned': 'けんのおう',
  'Zamazenta-Crowned': 'たてのおう',
  'Calyrex-Ice': 'はくばじょうのすがた',
  'Calyrex-Shadow': 'こくばじょうのすがた',
  'Urshifu-Rapid-Strike': 'れんげきのかた',
  'Oricorio-Pom-Pom': 'ぱちぱちスタイル',
  'Oricorio-Pa\'u': 'ふらふらスタイル',
  'Oricorio-Sensu': 'まいまいスタイル',
  'Ogerpon-Wellspring': 'いどのめん',
  'Ogerpon-Hearthflame': 'かまどのめん',
  'Ogerpon-Cornerstone': 'いしずえのめん',
  'Zygarde-10%': '１０％フォルム',
  'Zygarde-Complete': 'パーフェクトフォルム',
  'Indeedee-F': 'メスのすがた',
  'Oinkologne-F': 'メスのすがた',
  'Wormadam-Sandy': 'すなちのミノ',
  'Wormadam-Trash': 'ゴミのミノ',
  'Gimmighoul-Roaming': 'とほフォルム',
  'Wishiwashi-School': 'むれたすがた',
};

const BASE_FORM_OVERRIDES: Record<string, string> = {
  'Deoxys': 'ノーマルフォルム',
  'Shaymin': 'ランドフォルム',
  'Giratina': 'アナザーフォルム',
  'Tornadus': 'けしんフォルム',
  'Thundurus': 'けしんフォルム',
  'Landorus': 'けしんフォルム',
  'Enamorus': 'けしんフォルム',
  'Meloetta': 'ボイスフォルム',
  'Hoopa': 'いましめられしフーパ',
  'Keldeo': 'いつものすがた',
  'Zacian': 'れきせんのゆうしゃ',
  'Zamazenta': 'れきせんのゆうしゃ',
  'Urshifu': 'いちげきのかた',
  'Oricorio': 'めらめらスタイル',
  'Wishiwashi': 'たんどくのすがた',
  'Eiscue': 'アイスフェイス',
  'Indeedee': 'オスのすがた',
  'Oinkologne': 'オスのすがた',
  'Toxtricity': 'ハイなすがた',
  'Basculin': 'あかすじのすがた',
  'Wormadam': 'くさきのミノ',
  'Pumpkaboo': 'ちゅうだましゅ',
  'Gimmighoul': 'はこフォルム',
  'Ogerpon': 'みどりのめん',
  'Terapagos': 'ノーマルフォルム',
  'Zygarde': '５０％フォルム',
};

export function resolveFormeDisplayName(
  speciesName: string,
  forme: string,
  baseName: string,
  champoutFormName: string | null,
): string | null {
  if (champoutFormName) {
    return buildDisplayName(baseName, champoutFormName);
  }

  if (!forme) {
    const override = BASE_FORM_OVERRIDES[speciesName];
    if (override) return buildDisplayName(baseName, override);
    return baseName;
  }

  if (speciesName in SPECIFIC_FORME_NAMES) {
    return buildDisplayName(baseName, SPECIFIC_FORME_NAMES[speciesName]);
  }

  if (forme === 'Mega') return `メガ${baseName}`;
  if (forme === 'Mega-X') return `メガ${baseName}Ｘ`;
  if (forme === 'Mega-Y') return `メガ${baseName}Ｙ`;
  if (forme === 'Primal') return `ゲンシ${baseName}`;

  if (forme in FORME_SUFFIX_TO_JA) {
    return buildDisplayName(baseName, FORME_SUFFIX_TO_JA[forme]);
  }

  return null;
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

  // Champions にベースフォーム (fo=0) が存在する natNum を収集
  const personalData: Array<{ no: string; fo: string; is_valid: string }> = JSON.parse(
    readFileSync(resolve(champoutBase, 'masterdata/personal.json'), 'utf-8'),
  );
  const championsBaseNatNums = new Set<number>();
  for (const entry of personalData) {
    if (entry.is_valid === '1' && entry.fo === '0') {
      championsBaseNatNums.add(parseInt(entry.no));
    }
  }

  // natNum → @pkmn/dex species のインデックスを構築（英語名不一致時のフォールバック用）
  const dexByNum = new Map<number, typeof dex.species extends { get(id: string): infer R } ? R : never>();
  for (const s of dex.species.all()) {
    if (!s.exists || s.forme) continue;
    if (s.isNonstandard && s.isNonstandard !== 'Past') continue;
    if (!dexByNum.has(s.num)) dexByNum.set(s.num, s);
  }

  let count = 0;
  for (const { jpn, eng, natNum } of allSpecies) {
    if (pokemon.has(jpn)) continue;
    if (championsBaseNatNums.has(natNum)) continue;
    if (!eng) continue;

    let species = dex.species.get(eng);
    if (!species?.exists || species.num === 0) {
      species = dexByNum.get(natNum) ?? species;
    }
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

/**
 * @pkmn/dex の別フォーム（リージョン・メガ・バトルフォーム等）を補完する。
 * Champions や既存のフォールバックでカバーされていないフォームを追加する。
 * ベースフォームのうち、複数フォームを持つポケモンのベースフォーム名も補正する。
 */
export function supplementPokemonFormes(
  pokemon: Map<string, ChampoutPokemon>,
  nameToNatNum: Map<string, number>,
  champoutBase: string,
): void {
  const namesData: TextDataFile = JSON.parse(
    readFileSync(resolve(champoutBase, 'rom-txt/jpn/monsname_syn.json'), 'utf-8'),
  );
  const nameByNum = new Map<number, string>();
  for (const entry of namesData.mSDataSet) {
    const num = parseInt(entry.LabelName.replace('MONSNAME_', ''));
    if (num > 0) nameByNum.set(num, entry.OriginalText);
  }

  const formData: TextDataFile = JSON.parse(
    readFileSync(resolve(champoutBase, 'rom-txt/jpn/zkn_form_syn.json'), 'utf-8'),
  );
  const champoutForms = new Map<string, string>();
  for (const entry of formData.mSDataSet) {
    if (entry.OriginalText) champoutForms.set(entry.LabelName, entry.OriginalText);
  }

  const EXCLUDED_FORMES = new Set([
    'Gmax', 'Totem', 'Cosplay', 'Rock-Star', 'Belle', 'Pop-Star', 'PhD',
    'Libre', 'Original', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Partner',
    'World', 'Starter', 'Eternamax', 'Dada', 'Bond', 'Ash',
    'Spiky-eared', 'Zen', 'Galar-Zen',
    'Sunshine', 'East', 'Busted', 'Busted-Totem', 'Dusk',
    'Antique', 'Artisan',
    'Gulping', 'Gorging',
    'Rapid-Strike-Gmax', 'Low-Key-Gmax',
    'Teal-Tera', 'Wellspring-Tera', 'Hearthflame-Tera', 'Cornerstone-Tera',
    'Meteor',
    'Three-Segment', 'Four',
    'Droopy', 'Stretchy',
  ]);
  const EXCLUDED_BASE_SPECIES = new Set(['Arceus', 'Silvally', 'Genesect', 'Minior', 'Squawkabilly']);

  let formeCount = 0;
  let renameCount = 0;

  for (const species of dex.species.all()) {
    if (!species.exists) continue;
    if (species.isNonstandard && species.isNonstandard !== 'Past') continue;

    const baseName = nameByNum.get(species.num);
    if (!baseName) continue;

    if (species.forme) {
      if (EXCLUDED_FORMES.has(species.forme)) continue;
      if (species.forme.includes('Gmax')) continue;
      if (species.forme.includes('Totem')) continue;
      if (EXCLUDED_BASE_SPECIES.has(species.baseSpecies)) continue;

      const base = dex.species.get(species.baseSpecies);
      const formeIdx = base?.formeOrder?.indexOf(species.name) ?? -1;
      const paddedNum = String(species.num).padStart(3, '0');
      const formLabel = formeIdx >= 0
        ? `ZKN_FORM_${paddedNum}_${String(formeIdx).padStart(3, '0')}`
        : null;
      const champoutFormName = formLabel ? (champoutForms.get(formLabel) ?? null) : null;

      const displayName = resolveFormeDisplayName(species.name, species.forme, baseName, champoutFormName);
      if (!displayName) continue;
      if (pokemon.has(displayName)) continue;

      const types = species.types.map((t) => TYPE_EN_TO_JA[t] ?? t);
      const deduped = types[0] === types[1] ? [types[0]] : types;

      const abilities: string[] = [];
      for (const slot of ['0', '1', 'H'] as const) {
        const abilityEng = species.abilities[slot];
        if (!abilityEng) continue;
        const ja = getAbilityJaName(abilityEng, champoutBase);
        if (!abilities.includes(ja)) abilities.push(ja);
      }

      pokemon.set(displayName, {
        displayName,
        natNum: species.num,
        nameEng: species.name,
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
      });
      nameToNatNum.set(displayName, species.num);
      formeCount++;
    } else {
      const override = BASE_FORM_OVERRIDES[species.name];
      if (!override) continue;

      const newDisplayName = buildDisplayName(baseName, override);
      if (pokemon.has(newDisplayName)) continue;

      const existingEntry = pokemon.get(baseName);
      if (!existingEntry) continue;
      if (existingEntry.source !== 'Showdown') continue;

      pokemon.delete(baseName);
      nameToNatNum.delete(baseName);
      existingEntry.displayName = newDisplayName;
      pokemon.set(newDisplayName, existingEntry);
      nameToNatNum.set(newDisplayName, existingEntry.natNum);
      renameCount++;
    }
  }

  if (formeCount > 0) {
    console.log(`  Fallback formes: ${formeCount} alternate forms from @pkmn/dex`);
  }
  if (renameCount > 0) {
    console.log(`  Fallback renames: ${renameCount} base forms renamed for multi-form species`);
  }
}
