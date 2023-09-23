import {
  RESTPostAPIChannelMessageJSONBody,
  RESTPutAPIApplicationGuildCommandsJSONBody,
} from 'discord-api-types/v10';

/**
 * @see https://discord.com/developers/docs/reference#api-versioning
 */
const baseUrl = 'https://discord.com/api/v10';

export default class DiscordApi {
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
  async createChannelMessage(
    channelId: string,
    message: RESTPostAPIChannelMessageJSONBody,
  ) {
    const url = `${baseUrl}/channels/${channelId}/messages`;
    return await this.#request(url, 'POST', message);
  }

  /**
   * Bulk Overwrite Guild Application Commands
   * @see https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-guild-application-commands
   */
  async putGuildApplicationCommands(
    applicationId: string,
    guildId: string,
    commands: RESTPutAPIApplicationGuildCommandsJSONBody,
  ) {
    const url = `${baseUrl}/applications/${applicationId}/guilds/${guildId}/commands`;
    return await this.#request(url, 'PUT', commands);
  }

  async #request<T>(
    url: string,
    method: string,
    body: unknown,
    headers = {},
  ): Promise<Response> {
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
      const text = await response.text();
      console.error(text);
      throw new Error(
        `Failed to request ${url}: ${response.status} ${response.statusText}`,
      );
    }
    return response;
  }
}
