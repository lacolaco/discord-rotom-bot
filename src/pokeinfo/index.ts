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

  const table = new Table({
    chars: TABLE_CHARS,
    style: { head: [], border: [] },
    colAligns: ['left', 'right', 'right', 'right', 'right'],
  });

  // Header: name (left) + type (right)
  table.push([
    { content: name, colSpan: 3 },
    { content: typeStr, colSpan: 2, hAlign: 'right' as const },
  ]);

  // Stat rows: bar + 4 actual values
  for (const key of STAT_KEYS) {
    const base = baseStats[key];
    const barLen = Math.round((base / MAX_STAT) * BAR_WIDTH);
    const bar = '='.repeat(barLen) + ' '.repeat(BAR_WIDTH - barLen);
    const barStr = `${key} ${bar} ${base.toString().padStart(3)}`;
    const actuals = calcActuals(key, base);
    table.push([barStr, ...actuals.map(String)]);
  }

  // Abilities
  table.push([{ colSpan: 5, content: abilityLine }]);

  return '```\n' + table.toString() + '\n```';
}

/**
 * カタカナをひらがなに変換する
 */
function kataToHira(str: string): string {
  return str.replace(/[\u30A1-\u30FA]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );
}
