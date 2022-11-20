import dataJSON from '../../pokemon/data.json';
import { PokemonDataJSON } from '../../pokemon/types';

const data = dataJSON as PokemonDataJSON;

/**
 * 名前を受け取って対応するポケモンのページのURLを返す
 * @param name ポケモンの日本語名
 */
export async function searchURLByName(name: string): Promise<string | null> {
  const pokemon = data.namesMap[name];
  if (!pokemon) {
    return null;
  }
  return pokemon.url;
}

export async function getAllPokemonNames(params: {
  prefix?: string;
}): Promise<string[]> {
  return Object.keys(data.namesMap).filter((name) => {
    if (params.prefix) {
      return name.startsWith(params.prefix);
    }
    return true;
  });
}
