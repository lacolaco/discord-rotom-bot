/**
 * data.generated.json 生成スクリプト
 *
 * vendor/pokedex (towakey/pokedex) をベースデータとして使用し、
 * vendor/champout (projectpokemon/champout) の最新データをオーバーレイする。
 *
 * 優先順位: champout（最新） > pokedex（ベース） > @pkmn/dex（フォールバック）
 *
 * 使用方法: pnpm exec tsx scripts/generate-pokemon-data.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseGlobalPokedex, loadGameStats } from './lib/pokedex-parser';
import { applyErrata, injectMissingForms, supplementMissingStats, supplementMissingTypes } from './lib/fallback';
import { parseChampout } from './lib/champout-parser';
import {
  applyDisplayNameOverrides,
  applyOutputErrata,
  buildPokedexOutput,
  overlayChampionsData,
  sortByNatNum,
  syncYakkunMap,
  type OutputEntry,
} from './lib/pipeline';

const ROOT = resolve(import.meta.dirname, '..');
const POKEDEX_BASE = resolve(ROOT, 'vendor/pokedex/pokedex');
const CHAMPOUT_BASE = resolve(ROOT, 'vendor/champout');
const ERRATA_PATH = resolve(import.meta.dirname, 'pokedex-errata.json');
const CHAMPIONS_ERRATA_PATH = resolve(import.meta.dirname, 'champions-errata.json');
const OVERRIDES_PATH = resolve(import.meta.dirname, 'display-name-overrides.json');
const YAKKUN_MAP_PATH = resolve(ROOT, 'src/pokeinfo/yakkun-map.json');
const OUTPUT_PATH = resolve(ROOT, 'src/pokeinfo/data.generated.json');

const yakkunMap: Record<string, string | null> = JSON.parse(
  readFileSync(YAKKUN_MAP_PATH, 'utf-8'),
);

// --- Phase 1: Pokedex base data ---

console.log('Phase 1: Pokedex base data');
const { entryIdToInfo, nameToNatNum } = parseGlobalPokedex(POKEDEX_BASE);
const statsMap = loadGameStats(POKEDEX_BASE);

const pokedexErrata = JSON.parse(readFileSync(ERRATA_PATH, 'utf-8'));
applyErrata(entryIdToInfo, statsMap, pokedexErrata);

injectMissingForms(entryIdToInfo, statsMap, nameToNatNum, POKEDEX_BASE);
supplementMissingStats(entryIdToInfo, statsMap, POKEDEX_BASE);
supplementMissingTypes(entryIdToInfo, statsMap, POKEDEX_BASE);

const { output, noStats } = buildPokedexOutput(entryIdToInfo, statsMap, yakkunMap);
console.log(`  Pokedex base: ${Object.keys(output).length} entries`);
if (noStats.length > 0) {
  console.log(`  Dropped (no stats): ${noStats.length}`);
  for (const name of noStats) console.log(`    - ${name}`);
}

// --- Phase 2: Champions overlay ---

console.log('\nPhase 2: Champions overlay');
const { pokemon: champoutData, nameToNatNum: champoutNatNums } = parseChampout(CHAMPOUT_BASE);
console.log(`  Champions data: ${champoutData.size} entries`);

const overrides: Record<string, string> = JSON.parse(readFileSync(OVERRIDES_PATH, 'utf-8'));
applyDisplayNameOverrides(champoutData, champoutNatNums, overrides);

overlayChampionsData(output, champoutData, nameToNatNum, yakkunMap);

// --- Phase 3: Post-processing ---

console.log('\nPhase 3: Post-processing');

let championsErrataData: Record<string, Partial<{ types: string[]; abilities: string[]; baseStats: Partial<OutputEntry['baseStats']> }>> = {};
try {
  championsErrataData = JSON.parse(readFileSync(CHAMPIONS_ERRATA_PATH, 'utf-8'));
} catch {
  // champions-errata.json is optional
}
if (Object.keys(championsErrataData).length > 0) {
  applyOutputErrata(output, championsErrataData);
}

const sorted = sortByNatNum(output, nameToNatNum);

writeGeneratedData(sorted);
const syncedYakkun = syncYakkunMap(sorted, yakkunMap);
writeFileSync(YAKKUN_MAP_PATH, JSON.stringify(syncedYakkun, null, 2) + '\n', 'utf-8');
printSummary(sorted);

// --- Functions ---

function writeGeneratedData(sorted: Record<string, OutputEntry>): void {
  writeFileSync(OUTPUT_PATH, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
}

function printSummary(sorted: Record<string, OutputEntry>): void {
  const total = Object.keys(sorted).length;
  const withYakkun = Object.values(sorted).filter((e) => e.yakkun).length;

  const sourceDist = new Map<string, number>();
  for (const entry of Object.values(sorted)) {
    const key = entry.source.game;
    sourceDist.set(key, (sourceDist.get(key) ?? 0) + 1);
  }

  console.log(`\ndata.generated.json: ${total} entries`);
  console.log(`  yakkun URL: ${withYakkun} resolved, ${total - withYakkun} pending`);
  console.log(`  source distribution:`);
  for (const [game, count] of [...sourceDist.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${game}: ${count}`);
  }
}
