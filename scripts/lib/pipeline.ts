import type { ChampoutPokemon } from './champout-parser';
import type { EntryInfo, GamePokedexEntry, StatsEntry } from './pokedex-parser';

interface OutputEntry {
  index: number;
  types: string[];
  abilities: string[];
  baseStats: { H: number; A: number; B: number; C: number; D: number; S: number };
  source: { game: string; pokedex: string };
  yakkun?: { url: string; key: string };
}

export type { OutputEntry };

// --- Pokedex base output ---

export function buildPokedexOutput(
  entries: Map<string, EntryInfo>,
  stats: Map<string, StatsEntry>,
  yakkun: Record<string, string | null>,
): { output: Record<string, OutputEntry>; noStats: string[] } {
  const output: Record<string, OutputEntry> = {};
  const noStats: string[] = [];

  for (const [entryId, info] of entries) {
    const { displayName, natNum } = info;
    const statsInfo = stats.get(entryId);

    if (!statsInfo) {
      if (!(displayName in output)) noStats.push(displayName);
      continue;
    }

    const { stats: s, game, pokedex } = statsInfo;
    const yakkunUrl = yakkun[displayName];

    output[displayName] = {
      index: natNum,
      types: [s.type1, ...(s.type2 ? [s.type2] : [])],
      abilities: [s.ability1, s.ability2, s.dream_ability].filter((a) => a !== ''),
      baseStats: { H: s.hp, A: s.attack, B: s.defense, C: s.special_attack, D: s.special_defense, S: s.speed },
      source: { game, pokedex },
      ...(yakkunUrl ? { yakkun: { url: yakkunUrl, key: yakkunUrl.split('/').pop()! } } : {}),
    };
  }

  return { output, noStats };
}

// --- Champions overlay ---

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

export function overlayChampionsData(
  output: Record<string, OutputEntry>,
  champoutData: Map<string, ChampoutPokemon>,
  nameToNatNum: Map<string, number>,
  yakkunMap: Record<string, string | null>,
): void {
  let overridden = 0;
  let added = 0;

  for (const [displayName, poke] of champoutData) {
    const yakkunUrl = yakkunMap[displayName];
    if (displayName in output) {
      output[displayName].types = poke.types;
      output[displayName].abilities = poke.abilities;
      output[displayName].baseStats = poke.baseStats;
      output[displayName].source = { game: 'Champions', pokedex: '' };
      if (yakkunUrl && !output[displayName].yakkun) {
        output[displayName].yakkun = { url: yakkunUrl, key: yakkunUrl.split('/').pop()! };
      }
      overridden++;
    } else {
      output[displayName] = {
        index: poke.natNum,
        types: poke.types,
        abilities: poke.abilities,
        baseStats: poke.baseStats,
        source: { game: 'Champions', pokedex: '' },
        ...(yakkunUrl ? { yakkun: { url: yakkunUrl, key: yakkunUrl.split('/').pop()! } } : {}),
      };
      nameToNatNum.set(displayName, poke.natNum);
      added++;
    }
  }

  console.log(`  Champions overlay: ${overridden} overridden, ${added} added`);
}

export function addChampionsExclusive(
  output: Record<string, OutputEntry>,
  nameToNatNum: Map<string, number>,
  exclusiveData: Record<string, { index: number; types: string[]; abilities: string[]; baseStats: OutputEntry['baseStats']; source: string }>,
  yakkunMap: Record<string, string | null>,
): void {
  let count = 0;
  for (const [displayName, data] of Object.entries(exclusiveData)) {
    if (displayName in output) continue;
    const yakkunUrl = yakkunMap[displayName];
    output[displayName] = {
      index: data.index,
      types: data.types,
      abilities: data.abilities,
      baseStats: data.baseStats,
      source: { game: data.source, pokedex: '' },
      ...(yakkunUrl ? { yakkun: { url: yakkunUrl, key: yakkunUrl.split('/').pop()! } } : {}),
    };
    nameToNatNum.set(displayName, data.index);
    count++;
  }
  if (count > 0) {
    console.log(`  Champions exclusive: ${count} entries`);
  }
}

// --- Post-processing ---

export function applyOutputErrata(
  output: Record<string, OutputEntry>,
  errataData: Record<string, Partial<{ types: string[]; abilities: string[]; baseStats: Partial<OutputEntry['baseStats']> }>>,
): void {
  let count = 0;
  for (const [displayName, corrections] of Object.entries(errataData)) {
    const entry = output[displayName];
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
