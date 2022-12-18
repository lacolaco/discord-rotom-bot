import { MessageCreateOptions } from 'discord.js';
import { fetch } from 'undici';
import { firestore } from '../firestore';
import { NewsItemJSON, NewsJSON } from './types';

const newsBaseUrl = 'https://sv-news.pokemon.co.jp/ja/';
const newsJSONUrl = `${newsBaseUrl}json/list.json`;

export async function getNewsNotification(): Promise<MessageCreateOptions | null> {
  const response = await fetch(newsJSONUrl);
  const json = (await response.json()) as NewsJSON;
  const news = json.data;

  // check each news item is not in the database
  // if not, add it to the database and send a message to discord
  const newsToNotify = [];
  for (const item of news) {
    if (!isNewly(item)) {
      console.log(`News item ${item.id} is not newly`);
      continue;
    }
    const exists = await isAlreadyNotified(item);
    if (exists) {
      console.log(`News item ${item.id} is already notified`);
      continue;
    }
    await saveToCache(item);
    newsToNotify.push(item);
  }
  if (newsToNotify.length === 0) {
    return null;
  }
  return buildNotificationMessage(newsToNotify);
}

/**
 * ニュースの開始日時 (stAt) と終了日時 (stAt + newAt) が現在時刻 (now) に含まれているかどうかを判定する
 * @param item
 * @returns
 */
function isNewly(item: NewsItemJSON) {
  const now = Date.now();
  const startAt = parseInt(item.stAt, 10) * 1000; // convert to milliseconds
  const endAt = startAt + parseInt(item.newAt, 10) * 1000; // convert to milliseconds
  return startAt <= now && now <= endAt;
}

const collectionName = 'news_already_notified';

async function isAlreadyNotified(item: NewsItemJSON) {
  const doc = await firestore.collection(collectionName).doc(item.id).get();
  return doc.exists;
}

async function saveToCache(item: NewsItemJSON) {
  await firestore.collection(collectionName).doc(item.id).set(item);
}

function buildNotificationMessage(items: NewsItemJSON[]): MessageCreateOptions {
  return {
    content: `新着情報ロト！`,
    embeds: items.map((item) => ({
      title: `[${item.kindTxt}] ${item.title}`,
      image: {
        url: `${newsBaseUrl}${item.banner}`,
      },
      timestamp: new Date(parseInt(item.stAt, 10) * 1000).toISOString(),
      url: `${newsBaseUrl}${item.link}`,
    })),
  };
}
