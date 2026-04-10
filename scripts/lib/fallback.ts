/**
 * フォールバック補完モジュール
 *
 * pokedex にstatsがないポケモンを自動検出し、@pkmn/dex から補完する。
 * pokedex にエントリ自体がないメガ/ゲンシフォームも @pkmn/dex から注入する。
 */
import { fetchEntry, findMegaPrimalForms } from './showdown';
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
 * vendor/pokedex にエントリがないメガ/ゲンシフォームを @pkmn/dex から検出し、
 * entryIdToInfo・statsMap・nameToNatNum に注入する。
 */
export function injectMissingForms(
  entryIdToInfo: Map<string, EntryInfo>,
  statsMap: Map<string, StatsEntry>,
  nameToNatNum: Map<string, number>,
  pokedexBase: string,
): void {
  const existingDisplayNames = new Set<string>();
  for (const info of entryIdToInfo.values()) {
    existingDisplayNames.add(info.displayName);
  }

  // 基本フォーム（formEng が空）のみ対象
  const baseForms = new Map<string, EntryInfo>();
  for (const [entryId, info] of entryIdToInfo) {
    if (!info.formEng && !baseForms.has(info.nameEng)) {
      baseForms.set(info.nameEng, info);
    }
  }

  let injected = 0;
  for (const [nameEng, baseInfo] of baseForms) {
    const forms = findMegaPrimalForms(nameEng, baseInfo.displayName, pokedexBase);
    for (const form of forms) {
      if (existingDisplayNames.has(form.displayName)) continue;

      const syntheticId = `injected_${baseInfo.natNum}_${form.forme}`;
      const info: EntryInfo = {
        displayName: form.displayName,
        natNum: baseInfo.natNum,
        nameEng,
        formEng: form.forme,
      };

      entryIdToInfo.set(syntheticId, info);
      statsMap.set(syntheticId, { stats: form.data, game: 'Showdown', pokedex: 'Showdown' });
      nameToNatNum.set(form.displayName, baseInfo.natNum);
      existingDisplayNames.add(form.displayName);
      injected++;
      console.log(`    ${form.displayName}`);
    }
  }

  if (injected > 0) {
    console.log(`  Injected: ${injected} missing mega/primal forms from @pkmn/dex`);
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
