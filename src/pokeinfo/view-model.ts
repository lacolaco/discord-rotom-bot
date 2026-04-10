import type { Pokemon } from './index';
import { calcActuals } from './stats';

const STAT_KEYS: (keyof Pokemon['baseStats'])[] = [
  'H',
  'A',
  'B',
  'C',
  'D',
  'S',
];

export type StatActuals = {
  key: string;
  base: number;
  /** 性格↑ 努力値252 (HPは null) */
  maxPlus: number | null;
  /** 性格無 努力値252 */
  max: number;
  /** 性格無 努力値0 */
  min: number;
  /** 性格↓ 努力値0 (HPは null) */
  minMinus: number | null;
};

export type PokemonViewModel = {
  name: string;
  types: string[];
  abilities: string[];
  stats: StatActuals[];
  bst: number;
  yakkunUrl?: string;
  yakkunImageUrl?: string;
};

export function buildPokemonViewModel(
  name: string,
  pokemon: Pokemon,
): PokemonViewModel {
  const stats = STAT_KEYS.map((key) => {
    const base = pokemon.baseStats[key];
    const [maxPlus, max, min, minMinus] = calcActuals(key, base);
    return {
      key,
      base,
      maxPlus: key === 'H' ? null : maxPlus,
      max,
      min,
      minMinus: key === 'H' ? null : minMinus,
    };
  });
  const bst = stats.reduce((sum, s) => sum + s.base, 0);
  return {
    name,
    types: pokemon.types,
    abilities: pokemon.abilities,
    stats,
    bst,
    yakkunUrl: pokemon.yakkun?.url,
    yakkunImageUrl: pokemon.yakkun
      ? `https://img.yakkun.com/sprites/home/${pokemon.yakkun.key}.png`
      : undefined,
  };
}
