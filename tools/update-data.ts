import { readFile, writeFile } from 'fs/promises';
import iconv from 'iconv-lite';
import { JSDOM } from 'jsdom';
import path from 'path';
import { request } from 'undici';
import { PokemonDataJSON, PokemonNamesMap } from '../src/pokemon/types';

async function fetchAllPokemonURLs(): Promise<PokemonNamesMap> {
  const pokemonDataPageURL =
    'https://yakkun.com/sv/zukan/#sort=paldea,filter=0';
  console.log(`Requesting ${pokemonDataPageURL}`);
  const response = await request(pokemonDataPageURL, { method: 'GET' });
  console.log(`Response status: ${response.statusCode}`);
  // yakkun.com のcharsetが EUC-JP なので UTF-8 に変換する
  const body = await response.body
    .arrayBuffer()
    .then((buf) => iconv.decode(Buffer.from(buf), 'EUC-JP'));
  const dom = new JSDOM(body);

  const map: PokemonNamesMap = {};
  const pokemonNodes = dom.window.document.body.querySelectorAll<HTMLLIElement>(
    'ul[class=pokemon_list] li[data-no]',
  );
  for (const pokemon of pokemonNodes) {
    const dexNumber = Number(pokemon.getAttribute('data-no'));
    const link = pokemon.querySelector<HTMLAnchorElement>('a[href]');
    if (!link) {
      continue;
    }
    const { href, textContent } = link;
    if (!href || !textContent) {
      continue;
    }

    map[textContent.trim()] = {
      dexNumber,
      url: href.startsWith('https://') ? href : `https://yakkun.com${href}`,
    };
  }
  return map;
}

async function updateDataJSON(namesMap: PokemonNamesMap) {
  const filePath = path.resolve(__dirname, '../src/pokemon/data.json');
  const dataJSON = await readFile(filePath, 'utf-8');
  const data = JSON.parse(dataJSON) as PokemonDataJSON;
  const lastUpdatedAt = new Date().toISOString();
  const newData = {
    updatedAt: lastUpdatedAt,
    ...data,
    namesMap: {
      ...data.namesMap,
      ...namesMap,
    },
  };
  await writeFile(filePath, JSON.stringify(newData, null, 2));
}

async function main() {
  const map = await fetchAllPokemonURLs();
  console.log(map);
  await updateDataJSON(map);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
