import { NewsJSON } from './types';

export const newsBaseUrl = 'https://champions-news.pokemon-home.com/ja';

export async function fetchNewsJSON(): Promise<NewsJSON> {
  const response = await fetch(`${newsBaseUrl}/json/list.json`);
  const json = (await response.json()) as NewsJSON;
  return json;
}
