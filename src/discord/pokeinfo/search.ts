import {
  findPokemonByName,
  getPokemons,
  Pokemon,
} from '@lacolaco/pokemon-data';

const pokemonNames = Object.keys(getPokemons());

/**
 * 名前を受け取って対応するポケモンのページのデータを返す
 * @param name ポケモンの日本語名
 */
export async function searchPokemonByName(
  name: string,
): Promise<Pokemon | null> {
  const pokemon = findPokemonByName(name);
  if (!pokemon) {
    return null;
  }
  return pokemon;
}

export async function getAllPokemonNames(params: {
  prefix?: string;
}): Promise<string[]> {
  return pokemonNames.filter((name) => {
    if (params.prefix) {
      return name.startsWith(params.prefix);
    }
    return true;
  });
}
