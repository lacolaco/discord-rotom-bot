export type PokemonDataJSON = {
  namesMap: PokemonNamesMap;
};

export type PokemonNamesMap = {
  [key: string]: {
    dexNumber: number;
    url: string;
  };
};
