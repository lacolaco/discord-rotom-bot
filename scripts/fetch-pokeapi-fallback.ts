/**
 * PokéAPI フォールバックデータ取得スクリプト
 *
 * towakey/pokedex にstatsが存在しないポケモンのデータを PokéAPI から取得し、
 * pokeapi-fallback.generated.json として出力する。
 *
 * 使用方法: npx tsx scripts/fetch-pokeapi-fallback.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUTPUT_PATH = resolve(ROOT, 'scripts/pokeapi-fallback.generated.json');

// --- PokéAPI slug mapping ---

const POKEAPI_SLUG_MAP: Record<string, string> = {
  '0254_00000100_0_000_0': 'sceptile-mega',
  '0257_00000100_0_000_0': 'blaziken-mega',
  '0260_00000100_0_000_0': 'swampert-mega',
  '0380_00000100_0_000_0': 'latias-mega',
  '0381_00000100_0_000_0': 'latios-mega',
  '0382_00000001_0_000_0': 'kyogre-primal',
  '0383_00000001_0_000_0': 'groudon-primal',
  '0384_00000100_0_000_0': 'rayquaza-mega',
  '0550_00000002_0_000_0': 'basculin-white-striped',
  '0646_00000001_0_000_0': 'kyurem-white',
  '0646_00000002_0_000_0': 'kyurem-black',
  '0647_00000001_0_000_0': 'keldeo-resolute',
  '0648_00000001_0_000_0': 'meloetta-pirouette',
  '0800_00000001_0_000_0': 'necrozma-dusk',
  '0800_00000002_0_000_0': 'necrozma-dawn',
  '0800_00000003_0_000_0': 'necrozma-ultra',
  '0808_00000000_0_000_0': 'meltan',
  '0809_00000000_0_000_0': 'melmetal',
  '0901_00000001_0_000_0': 'ursaluna-bloodmoon',
  '0905_00000001_0_000_0': 'enamorus-therian',
};

// --- Type translation ---

const TYPE_EN_TO_JA: Record<string, string> = {
  normal: 'ノーマル',
  fire: 'ほのお',
  water: 'みず',
  grass: 'くさ',
  electric: 'でんき',
  ice: 'こおり',
  fighting: 'かくとう',
  poison: 'どく',
  ground: 'じめん',
  flying: 'ひこう',
  psychic: 'エスパー',
  bug: 'むし',
  rock: 'いわ',
  ghost: 'ゴースト',
  dark: 'あく',
  dragon: 'ドラゴン',
  steel: 'はがね',
  fairy: 'フェアリー',
};

// --- PokéAPI types ---

interface PokeAPIPokemon {
  stats: Array<{ base_stat: number; stat: { name: string } }>;
  types: Array<{ slot: number; type: { name: string } }>;
  abilities: Array<{
    ability: { name: string; url: string };
    is_hidden: boolean;
    slot: number;
  }>;
}

interface PokeAPIAbility {
  names: Array<{ name: string; language: { name: string } }>;
}

// --- Helpers ---

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`PokéAPI ${res.status}: ${url}`);
  }
  return res.json() as Promise<T>;
}

const abilityCache = new Map<string, string>();

async function getAbilityJaName(slug: string): Promise<string> {
  if (abilityCache.has(slug)) {
    return abilityCache.get(slug)!;
  }
  const data = await fetchJSON<PokeAPIAbility>(
    `https://pokeapi.co/api/v2/ability/${slug}`,
  );
  const jaName =
    data.names.find((n) => n.language.name === 'ja-Hrkt')?.name ??
    data.names.find((n) => n.language.name === 'ja')?.name ??
    slug;
  abilityCache.set(slug, jaName);
  return jaName;
}

// --- Main ---

interface FallbackEntry {
  type1: string;
  type2: string;
  hp: number;
  attack: number;
  defense: number;
  special_attack: number;
  special_defense: number;
  speed: number;
  ability1: string;
  ability2: string;
  dream_ability: string;
}

async function main() {
  const result: Record<string, FallbackEntry> = {};
  const entries = Object.entries(POKEAPI_SLUG_MAP);

  for (const [entryId, slug] of entries) {
    process.stdout.write(`  fetching ${slug}...`);
    const pokemon = await fetchJSON<PokeAPIPokemon>(
      `https://pokeapi.co/api/v2/pokemon/${slug}`,
    );

    // Stats
    const statMap = new Map<string, number>();
    for (const s of pokemon.stats) {
      statMap.set(s.stat.name, s.base_stat);
    }

    // Types
    const sortedTypes = pokemon.types.sort((a, b) => a.slot - b.slot);
    const type1 = TYPE_EN_TO_JA[sortedTypes[0].type.name] ?? sortedTypes[0].type.name;
    const type2 =
      sortedTypes.length > 1
        ? (TYPE_EN_TO_JA[sortedTypes[1].type.name] ?? sortedTypes[1].type.name)
        : '';

    // Abilities
    const regularAbilities = pokemon.abilities
      .filter((a) => !a.is_hidden)
      .sort((a, b) => a.slot - b.slot);
    const hiddenAbility = pokemon.abilities.find((a) => a.is_hidden);

    const ability1 =
      regularAbilities.length > 0
        ? await getAbilityJaName(regularAbilities[0].ability.name)
        : '';
    const ability2 =
      regularAbilities.length > 1
        ? await getAbilityJaName(regularAbilities[1].ability.name)
        : '';
    const dreamAbility = hiddenAbility
      ? await getAbilityJaName(hiddenAbility.ability.name)
      : '';

    result[entryId] = {
      type1,
      type2,
      hp: statMap.get('hp') ?? 0,
      attack: statMap.get('attack') ?? 0,
      defense: statMap.get('defense') ?? 0,
      special_attack: statMap.get('special-attack') ?? 0,
      special_defense: statMap.get('special-defense') ?? 0,
      speed: statMap.get('speed') ?? 0,
      ability1,
      ability2,
      dream_ability: dreamAbility,
    };
    console.log(' done');
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2) + '\n', 'utf-8');
  console.log(
    `\npokeapi-fallback.generated.json: ${Object.keys(result).length} entries`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
