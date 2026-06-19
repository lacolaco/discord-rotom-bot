import type { ChampoutPokemon } from './champout-parser';

interface OutputEntry {
  index: number;
  types: string[];
  abilities: string[];
  baseStats: { H: number; A: number; B: number; C: number; D: number; S: number };
  source: { game: string; pokedex: string };
  yakkun?: { url: string; key: string };
}

export type { OutputEntry };

export function applyErrata(
  data: Map<string, ChampoutPokemon>,
  errataData: Record<string, Partial<{ types: string[]; abilities: string[]; baseStats: Partial<OutputEntry['baseStats']> }>>,
): void {
  let count = 0;
  for (const [displayName, corrections] of Object.entries(errataData)) {
    const entry = data.get(displayName);
    if (!entry) {
      console.log(`    WARNING: errata target not found: ${displayName}`);
      continue;
    }
    if (corrections.types) entry.types = corrections.types;
    if (corrections.abilities) entry.abilities = corrections.abilities;
    if (corrections.baseStats) Object.assign(entry.baseStats, corrections.baseStats);
    count++;
    console.log(`    ${displayName}`);
  }
  if (count > 0) {
    console.log(`  Errata applied: ${count} entries`);
  }
}

export function supplementChampionsExclusive(
  pokemon: Map<string, ChampoutPokemon>,
  nameToNatNum: Map<string, number>,
  exclusiveData: Record<string, { index: number; types: string[]; abilities: string[]; baseStats: OutputEntry['baseStats']; source: string }>,
): void {
  let count = 0;
  for (const [displayName, data] of Object.entries(exclusiveData)) {
    if (pokemon.has(displayName)) continue;
    pokemon.set(displayName, {
      displayName,
      natNum: data.index,
      nameEng: '',
      types: data.types,
      abilities: data.abilities,
      baseStats: data.baseStats,
      source: data.source,
    });
    nameToNatNum.set(displayName, data.index);
    count++;
  }
  if (count > 0) {
    console.log(`  Champions exclusive: ${count} entries`);
  }
}

export function buildOutput(
  data: Map<string, ChampoutPokemon>,
  yakkun: Record<string, string | null>,
): Record<string, OutputEntry> {
  const output: Record<string, OutputEntry> = {};

  for (const [displayName, poke] of data) {
    const yakkunUrl = yakkun[displayName];
    output[displayName] = {
      index: poke.natNum,
      types: poke.types,
      abilities: poke.abilities,
      baseStats: poke.baseStats,
      source: { game: poke.source, pokedex: '' },
      ...(yakkunUrl ? { yakkun: { url: yakkunUrl, key: yakkunUrl.split('/').pop()! } } : {}),
    };
  }

  return output;
}

export function sortByNatNum(
  output: Record<string, OutputEntry>,
  natNums: Map<string, number>,
): Record<string, OutputEntry> {
  const sorted: Record<string, OutputEntry> = {};
  for (const [name, entry] of Object.entries(output).sort((a, b) => {
    const numA = natNums.get(a[0]) ?? Infinity;
    const numB = natNums.get(b[0]) ?? Infinity;
    return numA !== numB ? numA - numB : a[0].localeCompare(b[0]);
  })) {
    sorted[name] = entry;
  }
  return sorted;
}

function normalizeForMatch(name: string): string {
  return name.replace(/[・\s()（）]/g, '');
}

/**
 * yakkun-map.json を新しいポケモンデータに同期する。
 * - 新データに存在するポケモンは既存URLを引き継ぎ、未登録なら null で追加
 * - displayName が変更された場合、natNum + 名前の類似度で旧URLを新エントリに引き継ぐ
 * - 旧データにしかないエントリは削除する（natNum 一致で回収できなかった場合も含む）
 */
export function syncYakkunMap(
  sorted: Record<string, OutputEntry>,
  yakkunMap: Record<string, string | null>,
): Record<string, string | null> {
  const synced: Record<string, string | null> = {};

  for (const name of Object.keys(sorted)) {
    synced[name] = yakkunMap[name] ?? null;
  }

  const recoveredOldNames = new Set<string>();

  const orphaned = new Map<string, { url: string; natNum: number }>();
  for (const [oldName, url] of Object.entries(yakkunMap)) {
    if (oldName in sorted) continue;
    if (!url) continue;
    const match = url.match(/\/n(\d+)/);
    if (match) {
      orphaned.set(oldName, { url, natNum: parseInt(match[1]) });
    }
  }

  if (orphaned.size > 0) {
    const orphansByNatNum = new Map<number, Map<string, string>>();
    for (const [oldName, { url, natNum }] of orphaned) {
      if (!orphansByNatNum.has(natNum)) orphansByNatNum.set(natNum, new Map());
      orphansByNatNum.get(natNum)!.set(oldName, url);
    }

    let recovered = 0;
    for (const [name, url] of Object.entries(synced)) {
      if (url !== null) continue;
      const natNum = sorted[name].index;
      const candidates = orphansByNatNum.get(natNum);
      if (!candidates || candidates.size === 0) continue;

      if (candidates.size === 1) {
        const [oldName, orphanUrl] = [...candidates.entries()][0];
        synced[name] = orphanUrl;
        candidates.delete(oldName);
        recoveredOldNames.add(oldName);
        recovered++;
        continue;
      }

      const normalizedNew = normalizeForMatch(name);
      for (const [oldName, orphanUrl] of candidates) {
        const normalizedOld = normalizeForMatch(oldName);
        if (normalizedOld === normalizedNew ||
            normalizedOld.includes(normalizedNew) ||
            normalizedNew.includes(normalizedOld)) {
          synced[name] = orphanUrl;
          candidates.delete(oldName);
          recoveredOldNames.add(oldName);
          recovered++;
          break;
        }
      }
    }

    if (recovered > 0) {
      console.log(`  yakkun URL recovered: ${recovered} entries from renamed displayNames`);
    }

    const unrecovered = [...orphaned.keys()].filter(n => !recoveredOldNames.has(n));
    if (unrecovered.length > 0) {
      console.log(`  yakkun URL dropped: ${unrecovered.length} entries no longer in data`);
      for (const name of unrecovered) {
        console.log(`    ${name}`);
      }
    }
  }

  return synced;
}

/**
 * 既存の data.generated.json を参照し、既存エントリのタイプ・特性・種族値を合わせる。
 * データソースの切り替え（towakey/pokedex → champout / @pkmn/dex）で
 * 出力データが変わらないよう、既存出力の値を維持する。
 * 新規エントリ（旧データに存在しないポケモン）はそのまま保持する。
 */
export function normalizeAgainstReference(
  pokemon: Map<string, ChampoutPokemon>,
  referenceData: Record<string, { types: string[]; abilities: string[]; baseStats: OutputEntry['baseStats'] }>,
): void {
  let typesNormalized = 0;
  let abilitiesNormalized = 0;
  let statsNormalized = 0;

  for (const [name, poke] of pokemon) {
    const ref = referenceData[name];
    if (!ref) continue;

    if (JSON.stringify(poke.types) !== JSON.stringify(ref.types)) {
      poke.types = [...ref.types];
      typesNormalized++;
    }

    if (JSON.stringify(poke.abilities) !== JSON.stringify(ref.abilities)) {
      poke.abilities = [...ref.abilities];
      abilitiesNormalized++;
    }

    if (JSON.stringify(poke.baseStats) !== JSON.stringify(ref.baseStats)) {
      poke.baseStats = { ...ref.baseStats };
      statsNormalized++;
    }
  }

  const total = typesNormalized + abilitiesNormalized + statsNormalized;
  if (total > 0) {
    console.log(`  Normalized against reference: types=${typesNormalized}, abilities=${abilitiesNormalized}, stats=${statsNormalized}`);
  }
}

/**
 * 既存の data.generated.json に存在しないエントリを除去する。
 * データソース移行時に新規エントリが混入するのを防ぎ、出力の差分をゼロに保つ。
 * 新しいポケモンの追加は別途明示的に行う。
 */
export function filterToReference(
  pokemon: Map<string, ChampoutPokemon>,
  nameToNatNum: Map<string, number>,
  referenceKeys: Set<string>,
): void {
  if (referenceKeys.size === 0) return;
  let count = 0;
  for (const name of [...pokemon.keys()]) {
    if (!referenceKeys.has(name)) {
      pokemon.delete(name);
      nameToNatNum.delete(name);
      count++;
    }
  }
  if (count > 0) {
    console.log(`  Filtered to reference: ${count} new entries removed`);
  }
}

export function applyDisplayNameOverrides(
  pokemon: Map<string, ChampoutPokemon>,
  nameToNatNum: Map<string, number>,
  overrides: Record<string, string>,
): void {
  let count = 0;
  for (const [champoutName, outputName] of Object.entries(overrides)) {
    const entry = pokemon.get(champoutName);
    if (!entry) continue;
    const natNum = nameToNatNum.get(champoutName);
    pokemon.delete(champoutName);
    nameToNatNum.delete(champoutName);
    entry.displayName = outputName;
    pokemon.set(outputName, entry);
    if (natNum !== undefined) nameToNatNum.set(outputName, natNum);
    count++;
  }
  if (count > 0) {
    console.log(`  Display name overrides: ${count} entries`);
  }
}
