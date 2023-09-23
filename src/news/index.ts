import DiscordApi from '../discord/api';
import { fetchNewsJSON } from './fetch';
import { createNotificationMessage } from './notification';
import { isOngoingNews } from './utils';

export async function notifyNews(
  newsKV: KVNamespace,
  discord: DiscordApi,
  newsSubscriberRoleID: string,
  newsNotificationChannelID: string,
) {
  const { data: news } = await fetchNewsJSON();

  const newsToNotify = [];
  for (const item of news) {
    // check a news item is available
    if (!isOngoingNews(item)) {
      console.log(`News item ${item.id} is not ongoing`);
      continue;
    }
    // check a news item is not in the database
    const exists = await newsKV.get(item.id);
    if (exists) {
      console.log(`News item ${item.id} is already notified`);
      continue;
    }
    // save a news item to the database
    await newsKV.put(item.id, JSON.stringify(item));

    newsToNotify.push(item);
  }

  if (newsToNotify.length === 0) {
    console.log('No new news');
    return;
  }

  const message = createNotificationMessage(newsToNotify, newsSubscriberRoleID);
  await discord.createChannelMessage(newsNotificationChannelID, message);

  return newsToNotify;
}
