import { MessageCreateOptions, roleMention } from 'discord.js';
import { firestore } from '../firestore';
import { fetchNewsJSON } from './fetch';
import { NewsItemJSON } from './types';
import { isAvailableNews } from './utils';

const newsBaseUrl = 'https://sv-news.pokemon.co.jp/ja/';

export async function getNewsNotification(
  newsSubscriberRoleId: string,
): Promise<MessageCreateOptions | null> {
  const json = await fetchNewsJSON();
  const news = json.data;

  // check each news item is not in the database
  // if not, add it to the database and send a message to discord
  const newsToNotify = [];
  for (const item of news) {
    if (!isAvailableNews(item)) {
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
  return buildNotificationMessage(newsToNotify, newsSubscriberRoleId);
}

const collectionName = 'news_already_notified';

async function isAlreadyNotified(item: NewsItemJSON) {
  const doc = await firestore.collection(collectionName).doc(item.id).get();
  return doc.exists;
}

async function saveToCache(item: NewsItemJSON) {
  await firestore.collection(collectionName).doc(item.id).set(item);
}

function buildNotificationMessage(
  items: NewsItemJSON[],
  newsSubscriberRoleId: string,
): MessageCreateOptions {
  return {
    content: `新着情報ロト！ ${roleMention(newsSubscriberRoleId)}`,
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
