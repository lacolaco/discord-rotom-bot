import { RESTPostAPIChannelMessageJSONBody } from 'discord-api-types/v10';
import { NewsItemJSON } from './types';
import { roleMention } from '../discord/utils';
import { newsBaseUrl } from './fetch';

export function createNotificationMessage(
  items: NewsItemJSON[],
  newsSubscriberRoleId: string,
): RESTPostAPIChannelMessageJSONBody {
  return {
    content: `新着情報ロト！ ${roleMention(newsSubscriberRoleId)}`,
    embeds: items.map((item) => ({
      title: `[${item.kindTxt}] ${item.title}`,
      image: {
        url: `${newsBaseUrl}/${item.banner}`,
      },
      timestamp: new Date(parseInt(item.stAt, 10) * 1000).toISOString(),
      url: `${newsBaseUrl}/${item.link}`,
    })),
  };
}
