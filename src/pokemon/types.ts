export type PokemonDataJSON = {
  namesMap: PokemonNamesMap;
};

export type PokemonData = {
  dexNumber: number;
  url: string;
  types: string[];
  baseStats: number[]; // H-A-B-C-D-S
};

export type PokemonNamesMap = {
  [key: string]: PokemonData;
};
