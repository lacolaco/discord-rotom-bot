/**
 * data.generated.json 生成スクリプト
 *
 * vendor/champout (projectpokemon/champout) と src/pokeinfo/yakkun-map.json から
 * ボットが使用するポケモンデータを生成する。
 * Champions 未収録のポケモンは @pkmn/dex から補完する。
 *
 * 使用方法: pnpm exec tsx scripts/generate-pokemon-data.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseChampout } from './lib/champout-parser';
import { supplementNonChampionsPokemon } from './lib/fallback';
import { applyErrata, buildOutput, sortByNatNum, syncYakkunMap, type OutputEntry } from './lib/pipeline';

const ROOT = resolve(import.meta.dirname, '..');
const CHAMPOUT_BASE = resolve(ROOT, 'vendor/champout');
const ERRATA_PATH = resolve(import.meta.dirname, 'pokedex-errata.json');
const YAKKUN_MAP_PATH = resolve(ROOT, 'src/pokeinfo/yakkun-map.json');
const OUTPUT_PATH = resolve(ROOT, 'src/pokeinfo/data.generated.json');

// --- Pipeline ---

const { pokemon, nameToNatNum } = parseChampout(CHAMPOUT_BASE);
console.log(`  Champions data: ${pokemon.size} entries`);

supplementNonChampionsPokemon(pokemon, nameToNatNum, CHAMPOUT_BASE);
console.log(`  After fallback: ${pokemon.size} entries`);

const errata: Record<string, Partial<{ types: string[]; abilities: string[]; baseStats: Partial<OutputEntry['baseStats']> }>> = JSON.parse(
  readFileSync(ERRATA_PATH, 'utf-8'),
);
applyErrata(pokemon, errata);

const yakkunMap: Record<string, string | null> = JSON.parse(
  readFileSync(YAKKUN_MAP_PATH, 'utf-8'),
);

const output = buildOutput(pokemon, yakkunMap);
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
  const championsCount = Object.values(sorted).filter((e) => e.source.game !== 'Showdown').length;
  const fallbackCount = total - championsCount;

  console.log(`\ndata.generated.json: ${total} entries`);
  console.log(`  Champions: ${championsCount}, Fallback: ${fallbackCount}`);
  console.log(`  yakkun URL: ${withYakkun} resolved, ${total - withYakkun} pending`);
}
