/**
 * data.generated.json 生成スクリプト
 *
 * vendor/champout (projectpokemon/champout) と src/pokeinfo/yakkun-map.json から
 * ボットが使用するポケモンデータを生成する。
 * Champions 未収録のポケモンは @pkmn/dex から補完する。
 *
 * 使用方法: npx tsx scripts/generate-pokemon-data.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseChampout, type ChampoutPokemon } from './lib/champout-parser';
import { supplementNonChampionsPokemon } from './lib/fallback';

const ROOT = resolve(import.meta.dirname, '..');
const CHAMPOUT_BASE = resolve(ROOT, 'vendor/champout');
const ERRATA_PATH = resolve(import.meta.dirname, 'pokedex-errata.json');
const YAKKUN_MAP_PATH = resolve(ROOT, 'src/pokeinfo/yakkun-map.json');
const OUTPUT_PATH = resolve(ROOT, 'src/pokeinfo/data.generated.json');

// --- Types ---

interface OutputEntry {
  index: number;
  types: string[];
  abilities: string[];
  baseStats: { H: number; A: number; B: number; C: number; D: number; S: number };
  source: { game: string; pokedex: string };
  yakkun?: { url: string; key: string };
}

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
syncYakkunMap(sorted, yakkunMap);
printSummary(sorted);

// --- Functions ---

function applyErrata(
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

function buildOutput(
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

function sortByNatNum(
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

function writeGeneratedData(sorted: Record<string, OutputEntry>): void {
  writeFileSync(OUTPUT_PATH, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
}

function syncYakkunMap(
  sorted: Record<string, OutputEntry>,
  yakkunMap: Record<string, string | null>,
): void {
  const synced: Record<string, string | null> = {};
  for (const name of Object.keys(sorted)) {
    synced[name] = yakkunMap[name] ?? null;
  }
  writeFileSync(YAKKUN_MAP_PATH, JSON.stringify(synced, null, 2) + '\n', 'utf-8');
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
