/**
 * フォールバック補完モジュール
 *
 * pokedex にstatsがないポケモンを自動検出し、
 * @pkmn/dex から補完する。
 */
import { fetchEntry } from './showdown';
import type { EntryInfo, StatsEntry } from './pokedex-parser';

/**
 * statsMapに存在しないポケモンを @pkmn/dex から取得してstatsMapに追加する。
 */
export function supplementMissingStats(
  entryIdToInfo: Map<string, EntryInfo>,
  statsMap: Map<string, StatsEntry>,
  pokedexBase: string,
): void {
  const drops = findGenuineDrops(entryIdToInfo, statsMap);
  if (drops.size === 0) return;

  console.log(`  Fallback: resolving ${drops.size} entries from @pkmn/dex...`);
  for (const [entryId, info] of drops) {
    const entry = fetchEntry(info.nameEng, info.formEng, pokedexBase);
    if (!entry) {
      console.log(`    WARNING: ${info.displayName} not found (${info.nameEng} / ${info.formEng})`);
      continue;
    }
    statsMap.set(entryId, { stats: entry, game: 'Showdown', pokedex: 'Showdown' });
    console.log(`    ${info.displayName}`);
  }
}

/**
 * statsMapに存在せず、同じdisplayNameの別エントリにもstatsがないものを抽出。
 */
function findGenuineDrops(
  entryIdToInfo: Map<string, EntryInfo>,
  statsMap: Map<string, StatsEntry>,
): Map<string, EntryInfo> {
  const displayNameHasStats = new Set<string>();
  for (const [entryId, info] of entryIdToInfo) {
    if (statsMap.has(entryId)) {
      displayNameHasStats.add(info.displayName);
    }
  }

  const drops = new Map<string, EntryInfo>();
  const seen = new Set<string>();
  for (const [entryId, info] of entryIdToInfo) {
    if (seen.has(info.displayName)) continue;
    seen.add(info.displayName);
    if (!displayNameHasStats.has(info.displayName)) {
      drops.set(entryId, info);
    }
  }
  return drops;
}
