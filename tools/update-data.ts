import { readFile, writeFile } from 'fs/promises';
import iconv from 'iconv-lite';
import { JSDOM } from 'jsdom';
import path from 'path';
import { request } from 'undici';
import { PokemonDataJSON, PokemonNamesMap } from '../src/pokemon/types';

async function fetchAllPokemonURLs(): Promise<PokemonNamesMap> {
  const map: PokemonNamesMap = {};

  const allPokemonsPage = await loadYakkunPage(
    'https://yakkun.com/sv/zukan/#sort=paldea,filter=0',
  );

  const pokemonNodes = Array.from(
    allPokemonsPage.window.document.body.querySelectorAll<HTMLLIElement>(
      'ul[class=pokemon_list] li[data-no]',
    ),
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
    const url = href.startsWith('https://')
      ? href
      : `https://yakkun.com${href}`;

    const pokemonDetailPage = await loadYakkunPage(url);

    const types = Array.from(
      pokemonDetailPage.window.document.body.querySelectorAll(
        'ul#type_list li img',
      ),
    ).map((img) => img.getAttribute('alt')!);

    const baseStats = Array.from(
      pokemonDetailPage.window.document.body.querySelectorAll(
        '#status_block table.base_table tbody tr td:nth-child(2)',
      ),
    )
      .map((td) => Number(td.textContent))
      .slice(0, 6);

    map[textContent.trim()] = {
      dexNumber,
      url,
      types,
      baseStats,
    };
  }
  return map;
}

async function loadYakkunPage(url: string): Promise<JSDOM> {
  console.log(`Requesting ${url}`);
  const response = await request(url, {
    method: 'GET',
    maxRedirections: 1,
    headers: {
      'User-Agent':
        // iPhone
        'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
    },
  });
  console.log(`Response status: ${response.statusCode}`);

  // yakkun.com のcharsetが EUC-JP なので UTF-8 に変換する
  const body = await response.body
    .arrayBuffer()
    .then((buf) => iconv.decode(Buffer.from(buf), 'EUC-JP'));
  return new JSDOM(body);
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
