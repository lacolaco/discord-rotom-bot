import pokemonData from './data.generated.json';

export type Pokemon = {
  index: number;
  types: string[];
  abilities: string[];
  baseStats: {
    H: number;
    A: number;
    B: number;
    C: number;
    D: number;
    S: number;
  };
  source: { game: string; pokedex: string };
  yakkun?: { url: string; key: string };
};

const pokemonNames = Object.keys(pokemonData);

export async function searchPokemonByName(
  name: string,
): Promise<Pokemon | null> {
  return (pokemonData as Record<string, Pokemon>)[name] ?? null;
}

export async function getAllPokemonNames(params: {
  prefix?: string;
}): Promise<string[]> {
  return pokemonNames.filter((name) => {
    if (params.prefix) {
      return (
        name.includes(params.prefix) || kataToHira(name).includes(params.prefix)
      );
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// Display width utilities
// ---------------------------------------------------------------------------

export function displayWidth(str: string): number {
  let width = 0;
  for (const ch of str) {
    const code = ch.codePointAt(0)!;
    width += isFullWidth(code) ? 2 : 1;
  }
  return width;
}

function isFullWidth(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115f) || // Hangul Jamo
    (code >= 0x2e80 && code <= 0x303e) || // CJK Radicals, Kangxi, CJK Symbols
    (code >= 0x3040 && code <= 0x309f) || // Hiragana
    (code >= 0x30a0 && code <= 0x30ff) || // Katakana
    (code >= 0x3400 && code <= 0x4dbf) || // CJK Unified Ext A
    (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified
    (code >= 0xf900 && code <= 0xfaff) || // CJK Compat Ideographs
    (code >= 0xff01 && code <= 0xff60) || // Fullwidth Forms
    (code >= 0xffe0 && code <= 0xffe6) // Fullwidth Signs
  );
}

function padToWidth(str: string, width: number): string {
  const pad = width - displayWidth(str);
  return str + ' '.repeat(Math.max(0, pad));
}

// ---------------------------------------------------------------------------
// Pokemon info box
// ---------------------------------------------------------------------------

const STAT_KEYS: (keyof Pokemon['baseStats'])[] = [
  'H',
  'A',
  'B',
  'C',
  'D',
  'S',
];

const MAX_STAT = 255;
const BAR_WIDTH = 18;
const RIGHT_COL_WIDTH = 26; // ` {K} {bar:18} {val:3} `

export function formatPokemonInfoBox(params: {
  name: string;
  types: string[];
  baseStats: Pokemon['baseStats'];
  abilities: string[];
}): string {
  const { name, types, baseStats, abilities } = params;

  // -- Right column: 6 stat bar lines (fixed width) --
  const rightLines = STAT_KEYS.map((key) => {
    const value = baseStats[key];
    const barLen = Math.round((value / MAX_STAT) * BAR_WIDTH);
    const bar = '='.repeat(barLen) + ' '.repeat(BAR_WIDTH - barLen);
    return ` ${key} ${bar} ${value.toString().padStart(3)} `;
  });

  // -- Left column content (6 rows to match stats) --
  const typeStr = types.join('・');
  const leftContent = [name, typeStr, '', '', '', ''];

  // -- Bottom section --
  const abilityLine = `特性 ${abilities.join(' / ')}`;
  const speedLine = formatSpeedCompact(baseStats.S);

  // -- Width calculation --
  const leftMinWidth = Math.max(
    14,
    ...leftContent.map((l) => displayWidth(l) + 2),
  );
  const twoColWidth = leftMinWidth + 1 + RIGHT_COL_WIDTH;
  const bottomMaxWidth = Math.max(
    displayWidth(abilityLine),
    displayWidth(speedLine),
  );
  const totalInnerWidth = Math.max(twoColWidth, bottomMaxWidth + 2);
  const leftWidth = totalInnerWidth - 1 - RIGHT_COL_WIDTH;

  // -- Draw box --
  const topBorder =
    '+' + '-'.repeat(leftWidth) + '+' + '-'.repeat(RIGHT_COL_WIDTH) + '+';
  const bottomBorder = '+' + '-'.repeat(totalInnerWidth) + '+';

  const twoColLines = leftContent.map((left, i) => {
    const leftInner = ' ' + padToWidth(left, leftWidth - 2) + ' ';
    return '|' + leftInner + '|' + rightLines[i] + '|';
  });

  const bottomLines = [abilityLine, speedLine].map((line) => {
    const inner = ' ' + padToWidth(line, totalInnerWidth - 2) + ' ';
    return '|' + inner + '|';
  });

  const result = [
    topBorder,
    ...twoColLines,
    topBorder,
    ...bottomLines,
    bottomBorder,
  ];

  return '```\n' + result.join('\n') + '\n```';
}

function formatSpeedCompact(baseS: number): string {
  const calc = (ev: number, nature: number) =>
    Math.floor(
      (Math.floor(((2 * baseS + 31 + Math.floor(ev / 4)) * 50) / 100) + 5) *
        nature,
    );
  return `S実数値 遅${calc(0, 0.9)}/無${calc(0, 1.0)}/準${calc(252, 1.0)}/速${calc(252, 1.1)}`;
}

/**
 * カタカナをひらがなに変換する
 */
function kataToHira(str: string): string {
  return str.replace(/[\u30A1-\u30FA]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );
}
