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

export type StatRange = {
  key: string;
  base: number;
  min: number;
  max: number;
};

export type PokemonViewModel = {
  name: string;
  types: string[];
  abilities: string[];
  stats: StatRange[];
  bst: number;
  yakkunUrl?: string;
};

export function buildPokemonViewModel(
  name: string,
  pokemon: Pokemon,
): PokemonViewModel {
  const stats = STAT_KEYS.map((key) => {
    const base = pokemon.baseStats[key];
    const actuals = calcActuals(key, base);
    return {
      key,
      base,
      min: key === 'H' ? actuals[2] : actuals[3],
      max: key === 'H' ? actuals[1] : actuals[0],
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
  };
}
