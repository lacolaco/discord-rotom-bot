import Table from 'cli-table3';
import pokemonData from './data.generated.json';
import { calcActuals } from './stats';

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
// Display width utility (for header alignment)
// ---------------------------------------------------------------------------

function displayWidth(str: string): number {
  let width = 0;
  for (const ch of str) {
    const code = ch.codePointAt(0)!;
    width += isFullWidth(code) ? 2 : 1;
  }
  return width;
}

function isFullWidth(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0x303e) ||
    (code >= 0x3040 && code <= 0x309f) ||
    (code >= 0x30a0 && code <= 0x30ff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xff01 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6)
  );
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
const BAR_WIDTH = 14;

const TABLE_CHARS = {
  top: '-',
  'top-mid': '+',
  'top-left': '+',
  'top-right': '+',
  bottom: '-',
  'bottom-mid': '+',
  'bottom-left': '+',
  'bottom-right': '+',
  left: '|',
  'left-mid': '+',
  mid: '-',
  'mid-mid': '+',
  right: '|',
  'right-mid': '+',
  middle: '|',
};

export function formatPokemonInfoBox(params: {
  name: string;
  types: string[];
  baseStats: Pokemon['baseStats'];
  abilities: string[];
}): string {
  const { name, types, baseStats, abilities } = params;
  const typeStr = types.join('・');
  const abilityLine = `特性 ${abilities.join(' / ')}`;

  // Build body table (stats + abilities)
  const bodyTable = new Table({
    chars: TABLE_CHARS,
    style: { head: [], border: [] },
    colAligns: ['left', 'right', 'right', 'right', 'right'],
  });

  for (const key of STAT_KEYS) {
    const base = baseStats[key];
    const barLen = Math.round((base / MAX_STAT) * BAR_WIDTH);
    const bar = '='.repeat(barLen) + ' '.repeat(BAR_WIDTH - barLen);
    const barStr = `${key} ${bar} ${base.toString().padStart(3)}`;
    const actuals = calcActuals(key, base);
    const cells =
      key === 'H'
        ? ['', String(actuals[1]), String(actuals[2]), '']
        : actuals.map(String);
    bodyTable.push([barStr, ...cells]);
  }

  bodyTable.push([{ colSpan: 5, content: abilityLine }]);

  const bodyStr = bodyTable.toString();

  // Build header: name (left) + type (right), width matching body
  const totalWidth = bodyStr.split('\n')[0]!.length;
  const innerWidth = totalWidth - 2; // minus '|' borders
  const padLen = innerWidth - displayWidth(name) - displayWidth(typeStr) - 2; // -2 for cell padding
  const headerContent =
    ' ' + name + ' '.repeat(Math.max(1, padLen)) + typeStr + ' ';
  const headerBorder = '+' + '-'.repeat(innerWidth) + '+';
  const headerLine = '|' + headerContent + '|';

  return '```\n' + headerBorder + '\n' + headerLine + '\n' + bodyStr + '\n```';
}

/**
 * カタカナをひらがなに変換する
 */
function kataToHira(str: string): string {
  return str.replace(/[\u30A1-\u30FA]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );
}
