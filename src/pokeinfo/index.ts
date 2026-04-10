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

export function formatBaseStatsGraph(baseStats: Pokemon['baseStats']): string {
  const lines = STAT_KEYS.map((key) => {
    const value = baseStats[key];
    const barLen = Math.round((value / MAX_STAT) * BAR_WIDTH);
    const bar = '='.repeat(barLen) + ' '.repeat(BAR_WIDTH - barLen);
    return `${key} |${bar}| ${value.toString().padStart(3)}`;
  });
  return '```\n' + lines.join('\n') + '\n```';
}

export function formatSpeedLines(baseS: number): string {
  const calc = (ev: number, nature: number) =>
    Math.floor(
      (Math.floor(((2 * baseS + 31 + Math.floor(ev / 4)) * 50) / 100) + 5) *
        nature,
    );
  return `S実数値: 最遅${calc(0, 0.9)} / 無振り${calc(0, 1.0)} / 準速${calc(252, 1.0)} / 最速${calc(252, 1.1)}`;
}

/**
 * カタカナをひらがなに変換する
 */
function kataToHira(str: string): string {
  return str.replace(/[\u30A1-\u30FA]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );
}
