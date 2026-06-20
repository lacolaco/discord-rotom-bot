import type { ChampoutPokemon } from './champout-parser';
import type { EntryInfo, StatsEntry } from './pokedex-parser';

interface OutputEntry {
  index: number;
  types: string[];
  abilities: string[];
  baseStats: { H: number; A: number; B: number; C: number; D: number; S: number };
  source: { game: string; pokedex: string };
  yakkun?: { url: string; key: string };
}

export type { OutputEntry };

function buildYakkunEntry(url: string): { url: string; key: string } {
  return { url, key: url.split('/').pop()! };
}

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
      ...(yakkunUrl ? { yakkun: buildYakkunEntry(yakkunUrl) } : {}),
    };
  }

  return { output, noStats };
}

// --- Champions overlay ---

function baseName(name: string): string {
  const idx = name.indexOf('(');
  return idx >= 0 ? name.slice(0, idx) : name;
}

function normalizeOverlayName(name: string): string {
  return name.replace(/[・\s]/g, '');
}

export function resolveOverlayTarget(
  champName: string,
  natNum: number,
  outputByNatNum: Map<number, string[]>,
  matched: Set<string>,
): string | null {
  const candidates = outputByNatNum.get(natNum);
  if (!candidates) return null;
  const unmatched = candidates.filter((n) => !matched.has(n));
  if (unmatched.length === 0) return null;

  const normChamp = normalizeOverlayName(champName);
  for (const outputName of unmatched) {
    if (normalizeOverlayName(outputName) === normChamp) return outputName;
  }

  for (const outputName of unmatched) {
    const parenContent = outputName.match(/\((.+)\)$/)?.[1];
    if (parenContent && normalizeOverlayName(parenContent) === normChamp) return outputName;
  }

  const champBase = baseName(champName);
  if (champName.includes('(')) {
    const sameBase = unmatched.filter((n) => n === champBase);
    if (sameBase.length === 1) return sameBase[0];
  }

  const sameBase = unmatched.filter((n) => baseName(n) === champBase);
  if (sameBase.length === 1) return sameBase[0];

  if (unmatched.length === 1) return unmatched[0];

  return null;
}

export function overlayChampionsData(
  output: Record<string, OutputEntry>,
  champoutData: Map<string, ChampoutPokemon>,
  nameToNatNum: Map<string, number>,
  yakkunMap: Record<string, string | null>,
): void {
  let overridden = 0;
  let added = 0;
  let renamed = 0;

  const outputByNatNum = new Map<number, string[]>();
  for (const [name, entry] of Object.entries(output)) {
    const list = outputByNatNum.get(entry.index) ?? [];
    list.push(name);
    outputByNatNum.set(entry.index, list);
  }

  const matched = new Set<string>();

  const deferred: [string, ChampoutPokemon][] = [];
  for (const [displayName, poke] of champoutData) {
    if (displayName in output) {
      applyOverlay(output, displayName, poke, yakkunMap[displayName]);
      matched.add(displayName);
      overridden++;
    } else {
      deferred.push([displayName, poke]);
    }
  }

  const stillDeferred: [string, ChampoutPokemon][] = [];
  for (const [displayName, poke] of deferred) {
    const target = resolveOverlayTarget(displayName, poke.natNum, outputByNatNum, matched);
    if (target) {
      applyOverlay(output, target, poke, yakkunMap[target]);
      matched.add(target);
      overridden++;
      renamed++;
    } else {
      stillDeferred.push([displayName, poke]);
    }
  }

  const groupedDeferred = new Map<string, [string, ChampoutPokemon][]>();
  for (const item of stillDeferred) {
    const key = `${item[1].natNum}:${baseName(item[0])}`;
    const list = groupedDeferred.get(key) ?? [];
    list.push(item);
    groupedDeferred.set(key, list);
  }

  for (const [, group] of groupedDeferred) {
    const natNum = group[0][1].natNum;
    const base = baseName(group[0][0]);
    const candidates = outputByNatNum.get(natNum);
    const unmatchedOutputs = candidates?.filter((n) => !matched.has(n) && baseName(n) === base) ?? [];
    if (unmatchedOutputs.length === group.length) {
      for (let i = 0; i < group.length; i++) {
        const [, poke] = group[i];
        const target = unmatchedOutputs[i];
        applyOverlay(output, target, poke, yakkunMap[target]);
        matched.add(target);
        overridden++;
        renamed++;
      }
    } else {
      for (const [displayName, poke] of group) {
        const yakkunUrl = yakkunMap[displayName];
        output[displayName] = {
          index: poke.natNum,
          types: poke.types,
          abilities: poke.abilities,
          baseStats: poke.baseStats,
          source: { game: 'Champions', pokedex: '' },
          ...(yakkunUrl ? { yakkun: buildYakkunEntry(yakkunUrl) } : {}),
        };
        nameToNatNum.set(displayName, poke.natNum);
        added++;
      }
    }
  }

  console.log(`  Champions overlay: ${overridden} overridden (${renamed} by natNum match), ${added} added`);
}

function applyOverlay(
  output: Record<string, OutputEntry>,
  targetName: string,
  poke: ChampoutPokemon,
  yakkunUrl: string | null | undefined,
): void {
  output[targetName].types = poke.types;
  output[targetName].abilities = poke.abilities;
  output[targetName].baseStats = poke.baseStats;
  output[targetName].source = { game: 'Champions', pokedex: '' };
  if (yakkunUrl && !output[targetName].yakkun) {
    output[targetName].yakkun = buildYakkunEntry(yakkunUrl);
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
        const [oldName, orphanUrl] = candidates.entries().next().value!;
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
