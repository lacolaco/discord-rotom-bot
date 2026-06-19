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
 * 既存の data.generated.json のタイプ順序を参照し、新データのタイプ順序を合わせる。
 * 旧データソース（towakey/pokedex）と新データソース（champout / @pkmn/dex）で
 * type1/type2 の格納順が異なるケースがあるため、既存出力の順序を維持する。
 */
export function normalizeTypeOrdering(
  pokemon: Map<string, ChampoutPokemon>,
  referenceData: Record<string, { types: string[] }>,
): void {
  let count = 0;
  for (const [name, poke] of pokemon) {
    const ref = referenceData[name];
    if (!ref) continue;
    if (poke.types.length !== 2 || ref.types.length !== 2) continue;
    if (
      poke.types[0] === ref.types[1] && poke.types[1] === ref.types[0]
    ) {
      poke.types = [ref.types[0], ref.types[1]];
      count++;
    }
  }
  if (count > 0) {
    console.log(`  Type ordering normalized: ${count} entries`);
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
