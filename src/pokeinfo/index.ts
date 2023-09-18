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
      return (
        name.includes(params.prefix) || kataToHira(name).includes(params.prefix)
      );
    }
    return true;
  });
}

export function formatBaseStats(baseStats: {
  H: number;
  A: number;
  B: number;
  C: number;
  D: number;
  S: number;
}) {
  // join stats as H-A-B-C-D-S
  return `${baseStats.H}-${baseStats.A}-${baseStats.B}-${baseStats.C}-${baseStats.D}-${baseStats.S}`;
}

/**
 * カタカナをひらがなに変換する
 */
function kataToHira(str: string): string {
  return str.replace(/[\u30A1-\u30FA]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );
}
