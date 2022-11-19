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
