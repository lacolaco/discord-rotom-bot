/**
 * data.generated.json 生成スクリプト
 *
 * vendor/pokedex (git submodule) と src/pokeinfo/yakkun-map.json から
 * ボットが使用するポケモンデータを生成する。
 *
 * 使用方法: npx tsx scripts/generate-pokemon-data.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const POKEDEX_BASE = resolve(ROOT, 'vendor/pokedex/pokedex');
const YAKKUN_MAP_PATH = resolve(ROOT, 'src/pokeinfo/yakkun-map.json');
const OUTPUT_PATH = resolve(ROOT, 'src/pokeinfo/data.generated.json');

// --- Types ---

interface GlobalPokedexEntry {
  name: Record<string, string>;
  forms: Record<string, string>;
}

interface GamePokedexEntry {
  type1: string;
  type2: string;
  hp: number;
  attack: number;
  defense: number;
  special_attack: number;
  special_defense: number;
  speed: number;
  ability1: string;
  ability2: string;
  dream_ability: string;
}

interface OutputEntry {
  index: number;
  types: string[];
  abilities: string[];
  baseStats: { H: number; A: number; B: number; C: number; D: number; S: number };
  source: { game: string; pokedex: string };
  yakkun?: { url: string; key: string };
}

// --- Config ---

/**
 * コスチューム違いのみのフォーム（ステータス・タイプ・特性が同一で見た目だけ異なる）を除外する。
 * base nameの完全一致で判定。該当するポケモンのフォーム違いは全て除外され、base formのみ残る。
 */
const COSMETIC_ONLY_BASE_NAMES = [
  'アンノーン',       // 文字フォーム
  'ビビヨン',         // 模様
  'フラベベ',         // 花の色
  'フラエッテ',       // 花の色
  'フラージェス',     // 花の色
  'トリミアン',       // カット
  'シルヴァディ',     // タイプ
  'メテノ',           // コアの色
  'マホイップ',       // フレーバー
  'ピカチュウ',       // キャップ
  'ポワルン',         // 天候フォーム
  'ミノムッチ',       // ミノ違い（yakkun URL同一）
  'シキジカ',         // 季節フォーム
  'メブキジカ',       // 季節フォーム
  'ゲノセクト',       // カセット違い
  'ノココッチ',       // 節数違い
  'イッカネズミ',     // 匹数違い
  'シャリタツ',       // 姿勢違い
  'イキリンコ',       // 羽色違い
  'チェリム',         // フォルム違い（天候）
  'カラナクシ',       // 東西
  'トリトドン',       // 東西
  'ゼルネアス',       // モード違い（見た目のみ）
  'モルペコ',         // 模様違い
  'ヤバチャ',         // 真贋（見た目のみ）
  'ポットデス',       // 真贋（見た目のみ）
  'ミミッキュ',       // ばけた/ばれた
  'マギアナ',         // 色違い
  'ウッウ',           // 飲み込みフォーム
  'ムゲンダイナ',     // ムゲンダイマックス
  'ザルード',         // とうちゃん
  'チャデス',         // 真贋（見た目のみ）
  'ヤバソチャ',       // 真贋（見た目のみ）
];

/** フォーム名に含まれていたら除外するサフィックスパターン */
const EXCLUDED_FORM_SUFFIXES = [
  'キョダイマックス', // 種族値同一、個別ページなし
  'ダルマモード',     // バトル中一時変身
];

/** 特定のフォームを個別に除外（displayName完全一致） */
const EXCLUDED_FORMS = [
  'ゲッコウガ(サトシゲッコウガ)', // アニメ限定、通常入手不可
];

const POKEAPI_FALLBACK_PATH = resolve(ROOT, 'scripts/pokeapi-fallback.generated.json');

const GAME_PRIORITY = [
  'Scarlet_Violet',
  'LegendsZA',
  'Sword_Shield',
  'UltraSun_UltraMoon',
  'Sun_Moon',
  'X_Y',
  'Black2_White2',
  'Black_White',
  'HeartGold_SoulSilver',
  'Diamond_Pearl_Platinum',
  'Ruby_Sapphire_Emerald',
  'LegendsArceus',
  'FireRed_LeafGreen',
  'Gold_Silver_Crystal',
  'Red_Green_Blue_Pikachu',
];

// --- Step 1: Global pokedex → name mapping ---

const globalPokedex: {
  pokedex: Record<string, Record<string, GlobalPokedexEntry>>;
} = JSON.parse(readFileSync(resolve(POKEDEX_BASE, 'pokedex.json'), 'utf-8'));

// entry_id → { displayName, natNum }
const entryIdToInfo = new Map<string, { displayName: string; natNum: number }>();
// displayName → natNum (for sorting)
const nameToNatNum = new Map<string, number>();

for (const [natNum, entries] of Object.entries(globalPokedex.pokedex)) {
  const baseEntryId = `${natNum}_00000000_0_000_0`;
  for (const [entryId, entry] of Object.entries(entries)) {
    const jpnName = entry.name.jpn;
    let formName: string | null = entry.forms.jpn || null;
    // メガ進化: "フシギバナ(メガフシギバナ)" → "メガフシギバナ"
    // ゲンシカイキ: "カイオーガ(ゲンシカイオーガ)" → "ゲンシカイオーガ"
    // 基本形冗長: "カイオーガ(カイオーガのすがた)" → "カイオーガ"
    // 唯一形態: "コライドン(かんぜんけいたい)" → "コライドン"
    const REDUNDANT_FORMS: Record<string, string> = {
      'コライドン': 'かんぜんけいたい',
      'ミライドン': 'コンプリートモード',
    };
    // "ヒヒダルマ(ノーマルモード)" → "ヒヒダルマ"
    // "ヒヒダルマ(ガラルのすがた ノーマルモード)" → "ヒヒダルマ(ガラルのすがた)"
    if (formName?.endsWith(' ノーマルモード')) {
      formName = formName.replace(' ノーマルモード', '');
    } else if (formName === 'ノーマルモード') {
      formName = null;
    }
    // コスチューム違いフォームの除外: base entry以外をスキップ
    // base entryのformNameは既定フォーム名なので無視する
    if (COSMETIC_ONLY_BASE_NAMES.includes(jpnName)) {
      if (entryId !== baseEntryId) {
        continue;
      }
      formName = null;
    }
    const displayName =
      formName?.startsWith('メガ') || formName?.startsWith('ゲンシ')
        ? formName
        : formName === `${jpnName}のすがた` || formName === REDUNDANT_FORMS[jpnName]
          ? jpnName
          : formName
            ? `${jpnName}(${formName})`
            : jpnName;

    // 個別フォーム除外
    if (EXCLUDED_FORMS.includes(displayName)) {
      continue;
    }
    // 特定サフィックスを含むフォームの除外
    if (formName && EXCLUDED_FORM_SUFFIXES.some((s) => formName.includes(s))) {
      continue;
    }

    if (!formName) {
      if (entryId === baseEntryId) {
        entryIdToInfo.set(entryId, { displayName, natNum: parseInt(natNum) });
        nameToNatNum.set(displayName, parseInt(natNum));
      }
    } else {
      entryIdToInfo.set(entryId, { displayName, natNum: parseInt(natNum) });
      nameToNatNum.set(displayName, parseInt(natNum));
    }
  }
}

// --- Step 2: Game files → stats (first-win by priority) ---

const statsMap = new Map<
  string,
  { stats: GamePokedexEntry; game: string; pokedex: string }
>();

for (const game of GAME_PRIORITY) {
  const gamePath = resolve(POKEDEX_BASE, game, `${game}.json`);
  let gameData: { pokedex: Record<string, unknown> };
  try {
    gameData = JSON.parse(readFileSync(gamePath, 'utf-8'));
  } catch {
    continue;
  }

  for (const [sectionName, section] of Object.entries(gameData.pokedex)) {
    if (Array.isArray(section)) continue;
    const sectionObj = section as Record<string, Record<string, GamePokedexEntry>>;
    for (const entries of Object.values(sectionObj)) {
      if (typeof entries !== 'object' || entries === null) continue;
      for (const [entryId, entry] of Object.entries(entries)) {
        if (!statsMap.has(entryId) && typeof entry.hp === 'number') {
          statsMap.set(entryId, { stats: entry, game, pokedex: sectionName });
        }
      }
    }
  }
}

// --- Step 2.5: PokéAPI fallback for upstream-missing stats ---

try {
  const fallback: Record<string, GamePokedexEntry> = JSON.parse(
    readFileSync(POKEAPI_FALLBACK_PATH, 'utf-8'),
  );
  let fallbackCount = 0;
  for (const [entryId, entry] of Object.entries(fallback)) {
    if (!statsMap.has(entryId)) {
      statsMap.set(entryId, { stats: entry, game: 'PokeAPI', pokedex: 'PokeAPI' });
      fallbackCount++;
    }
  }
  if (fallbackCount > 0) {
    console.log(`  PokeAPI fallback: ${fallbackCount} entries supplemented`);
  }
} catch {
  // fallback file not found — continue without
}

// --- Step 3: yakkun-map.json ---

const yakkunMap: Record<string, string | null> = JSON.parse(
  readFileSync(YAKKUN_MAP_PATH, 'utf-8'),
);

// --- Step 4: Merge → output ---

const output: Record<string, OutputEntry> = {};
const noStats: string[] = [];

for (const [entryId, info] of entryIdToInfo) {
  const { displayName, natNum } = info;
  const statsInfo = statsMap.get(entryId);

  if (!statsInfo) {
    if (!(displayName in output)) {
      noStats.push(displayName);
    }
    continue;
  }

  const { stats, game, pokedex } = statsInfo;
  const types = [stats.type1];
  if (stats.type2) types.push(stats.type2);
  const abilities = [stats.ability1, stats.ability2, stats.dream_ability].filter(
    (a) => a !== '',
  );

  const entry: OutputEntry = {
    index: natNum,
    types,
    abilities,
    baseStats: {
      H: stats.hp,
      A: stats.attack,
      B: stats.defense,
      C: stats.special_attack,
      D: stats.special_defense,
      S: stats.speed,
    },
    source: { game, pokedex },
  };

  const yakkunUrl = yakkunMap[displayName];
  if (yakkunUrl) {
    const key = yakkunUrl.split('/').pop()!;
    entry.yakkun = { url: yakkunUrl, key };
  }

  output[displayName] = entry;
}

// --- Step 5: Sort by national dex number and write ---

const sortedOutput: Record<string, OutputEntry> = {};
const sortedEntries = Object.entries(output).sort((a, b) => {
  const numA = nameToNatNum.get(a[0]) ?? Infinity;
  const numB = nameToNatNum.get(b[0]) ?? Infinity;
  if (numA !== numB) return numA - numB;
  return a[0].localeCompare(b[0]);
});
for (const [name, entry] of sortedEntries) {
  sortedOutput[name] = entry;
}

writeFileSync(
  OUTPUT_PATH,
  JSON.stringify(sortedOutput, null, 2) + '\n',
  'utf-8',
);

// Sync yakkun-map.json: rebuild from sortedOutput keys only
const newYakkunMap: Record<string, string | null> = {};
for (const name of Object.keys(sortedOutput)) {
  newYakkunMap[name] = yakkunMap[name] ?? null;
}
writeFileSync(
  YAKKUN_MAP_PATH,
  JSON.stringify(newYakkunMap, null, 2) + '\n',
  'utf-8',
);

// --- Step 6: Summary ---

const totalEntries = Object.keys(sortedOutput).length;
const withYakkun = Object.values(sortedOutput).filter((e) => e.yakkun).length;
const withoutYakkun = totalEntries - withYakkun;

console.log(`data.generated.json: ${totalEntries} entries`);
console.log(`  yakkun URL: ${withYakkun} resolved, ${withoutYakkun} pending`);

// Source distribution
const sourceDist = new Map<string, number>();
for (const entry of Object.values(sortedOutput)) {
  const key = entry.source.game;
  sourceDist.set(key, (sourceDist.get(key) ?? 0) + 1);
}
console.log(`  source distribution:`);
for (const [game, count] of [...sourceDist.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`    ${game}: ${count}`);
}

if (noStats.length > 0) {
  console.log(`\n  dropped (no stats): ${noStats.length}`);
  for (const name of noStats) {
    console.log(`    - ${name}`);
  }
}
