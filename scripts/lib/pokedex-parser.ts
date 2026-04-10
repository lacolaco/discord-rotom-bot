/**
 * Pokedex 解析モジュール
 *
 * vendor/pokedex (towakey/pokedex) のグローバル図鑑とゲームデータを解析し、
 * entryIdToInfo（ポケモン名マッピング）と statsMap（種族値マッピング）を返す。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// --- Types ---

export interface GamePokedexEntry {
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

interface GlobalPokedexEntry {
  name: Record<string, string>;
  forms: Record<string, string>;
}

export interface EntryInfo {
  displayName: string;
  natNum: number;
  nameEng: string;
  formEng: string;
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
  // フラエッテは花の色がコスメだが、えいえんのはな・メガが別種族値のため個別除外で対応
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
  'フラエッテ(きいろのはな)',     // 花色コスメ
  'フラエッテ(オレンジいろのはな)', // 花色コスメ
  'フラエッテ(あおいはな)',       // 花色コスメ
  'フラエッテ(しろいはな)',       // 花色コスメ
];

const REDUNDANT_FORMS: Record<string, string> = {
  'コライドン': 'かんぜんけいたい',
  'ミライドン': 'コンプリートモード',
  'フラエッテ': 'あかいはな',
};

export interface StatsEntry {
  stats: GamePokedexEntry;
  game: string;
  pokedex: string;
}

export const GAME_PRIORITY = [
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

export function parseGlobalPokedex(pokedexBase: string): {
  entryIdToInfo: Map<string, EntryInfo>;
  nameToNatNum: Map<string, number>;
} {
  const globalPokedex: {
    pokedex: Record<string, Record<string, GlobalPokedexEntry>>;
  } = JSON.parse(readFileSync(resolve(pokedexBase, 'pokedex.json'), 'utf-8'));

  const entryIdToInfo = new Map<string, EntryInfo>();
  const nameToNatNum = new Map<string, number>();

  for (const [natNum, entries] of Object.entries(globalPokedex.pokedex)) {
    const baseEntryId = `${natNum}_00000000_0_000_0`;
    for (const [entryId, entry] of Object.entries(entries)) {
      const jpnName = entry.name.jpn;
      let formName: string | null = entry.forms.jpn || null;

      if (formName?.endsWith(' ノーマルモード')) {
        formName = formName.replace(' ノーマルモード', '');
      } else if (formName === 'ノーマルモード') {
        formName = null;
      }
      if (COSMETIC_ONLY_BASE_NAMES.includes(jpnName)) {
        if (entryId !== baseEntryId) continue;
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

      if (EXCLUDED_FORMS.includes(displayName)) continue;
      if (formName && EXCLUDED_FORM_SUFFIXES.some((s) => formName.includes(s))) continue;

      const info: EntryInfo = {
        displayName,
        natNum: parseInt(natNum),
        nameEng: entry.name.eng,
        formEng: entry.forms.eng,
      };

      if (!formName) {
        if (entryId === baseEntryId) {
          entryIdToInfo.set(entryId, info);
          nameToNatNum.set(displayName, parseInt(natNum));
        }
      } else {
        entryIdToInfo.set(entryId, info);
        nameToNatNum.set(displayName, parseInt(natNum));
      }
    }
  }

  return { entryIdToInfo, nameToNatNum };
}

// --- Step 2: Game files → stats (first-win by priority) ---

export function loadGameStats(pokedexBase: string): Map<string, StatsEntry> {
  const statsMap = new Map<string, StatsEntry>();

  for (const game of GAME_PRIORITY) {
    const gamePath = resolve(pokedexBase, game, `${game}.json`);
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

  return statsMap;
}
