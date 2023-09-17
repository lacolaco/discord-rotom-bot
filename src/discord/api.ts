import type { MessageCreateOptions } from 'discord.js';

/**
 * @see https://discord.com/developers/docs/reference#api-versioning
 */
const baseUrl = 'https://discord.com/api/v10';

export default class DiscordClient {
  #token: string;
  constructor(token: string) {
    this.#token = token;
  }

  /**
   * @see https://discord.com/developers/docs/resources/channel#create-message
   * @param channelId
   * @param message
   * @returns
   */
  async createChannelMessage(channelId: string, message: MessageCreateOptions) {
    const url = `${baseUrl}/channels/${channelId}/messages`;
    return await this.#request(url, 'POST', message);
  }

  async #request<T>(
    url: string,
    method: string,
    body: unknown,
    headers = {},
  ): Promise<T> {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${this.#token}`,
        ...headers,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(
        `Failed to request ${url}: ${response.status} ${response.statusText}`,
      );
    }
    return response.json();
  }
}
