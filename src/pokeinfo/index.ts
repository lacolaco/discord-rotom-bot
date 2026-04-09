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
