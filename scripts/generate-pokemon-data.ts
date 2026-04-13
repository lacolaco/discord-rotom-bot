/**
 * data.generated.json 生成スクリプト
 *
 * vendor/pokedex (git submodule) と src/pokeinfo/yakkun-map.json から
 * ボットが使用するポケモンデータを生成する。
 * pokedex にstatsがないポケモンは PokéAPI から自動補完する。
 *
 * 使用方法: npx tsx scripts/generate-pokemon-data.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseGlobalPokedex, loadGameStats, type EntryInfo, type StatsEntry } from './lib/pokedex-parser';
import { applyErrata, injectMissingForms, supplementMissingStats, supplementMissingTypes } from './lib/fallback';

const ROOT = resolve(import.meta.dirname, '..');
const POKEDEX_BASE = resolve(ROOT, 'vendor/pokedex/pokedex');
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

const { entryIdToInfo, nameToNatNum } = parseGlobalPokedex(POKEDEX_BASE);
const statsMap = loadGameStats(POKEDEX_BASE);
injectMissingForms(entryIdToInfo, statsMap, nameToNatNum, POKEDEX_BASE);
supplementMissingStats(entryIdToInfo, statsMap, POKEDEX_BASE);
supplementMissingTypes(entryIdToInfo, statsMap, POKEDEX_BASE);

const errata = JSON.parse(readFileSync(ERRATA_PATH, 'utf-8'));
applyErrata(entryIdToInfo, statsMap, errata);

const yakkunMap: Record<string, string | null> = JSON.parse(
  readFileSync(YAKKUN_MAP_PATH, 'utf-8'),
);

const { output, noStats } = buildOutput(entryIdToInfo, statsMap, yakkunMap);
const sorted = sortByNatNum(output, nameToNatNum);

writeGeneratedData(sorted);
syncYakkunMap(sorted, yakkunMap);
printSummary(sorted, noStats);

// --- Functions ---

function buildOutput(
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

function sortByNatNum(
  output: Record<string, OutputEntry>,
  nameToNatNum: Map<string, number>,
): Record<string, OutputEntry> {
  const sorted: Record<string, OutputEntry> = {};
  for (const [name, entry] of Object.entries(output).sort((a, b) => {
    const numA = nameToNatNum.get(a[0]) ?? Infinity;
    const numB = nameToNatNum.get(b[0]) ?? Infinity;
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

function printSummary(sorted: Record<string, OutputEntry>, noStats: string[]): void {
  const total = Object.keys(sorted).length;
  const withYakkun = Object.values(sorted).filter((e) => e.yakkun).length;

  console.log(`data.generated.json: ${total} entries`);
  console.log(`  yakkun URL: ${withYakkun} resolved, ${total - withYakkun} pending`);

  const sourceDist = new Map<string, number>();
  for (const entry of Object.values(sorted)) {
    sourceDist.set(entry.source.game, (sourceDist.get(entry.source.game) ?? 0) + 1);
  }
  console.log(`  source distribution:`);
  for (const [game, count] of [...sourceDist.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${game}: ${count}`);
  }

  if (noStats.length > 0) {
    console.log(`\n  dropped (no stats): ${noStats.length}`);
    for (const name of noStats) console.log(`    - ${name}`);
  }
}
