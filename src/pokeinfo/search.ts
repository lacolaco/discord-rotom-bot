import { JSDOM } from 'jsdom';
import { queryByRole } from '@testing-library/dom'; // もっと適したライブラリがあればそちらを使いたい
import { request } from 'undici';
import iconv from 'iconv-lite';

/**
 * 名前を受け取って対応するポケモンのページのURLを返す
 * @param name ポケモンの日本語名
 */
export async function searchURLByName(name: string): Promise<string | null> {
  // TODO: ポケ徹が対応したらSVに移行する
  const pokemonDataPageURL = 'https://yakkun.com/swsh/stats_list.htm';
  console.log(`Requesting ${pokemonDataPageURL}`);
  const response = await request(pokemonDataPageURL, { method: 'GET' });
  console.log(`Response status: ${response.statusCode}`);
  // yakkun.com のcharsetが EUC-JP なので UTF-8 に変換する
  const body = await response.body.arrayBuffer().then((buf) => iconv.decode(Buffer.from(buf), 'EUC-JP'));

  console.log(`Searching for a link for ${name}`);
  const dom = new JSDOM(body);
  const linkAnchor = queryByRole<HTMLAnchorElement>(dom.window.document.body, 'link', { name });
  if (!linkAnchor || !linkAnchor.href) {
    return null;
  }
  console.log(`Link Found: ${linkAnchor.href}`);
  const { href } = linkAnchor;
  if (href.startsWith('https://')) {
    return href;
  }
  return `https://yakkun.com${href}`;
}