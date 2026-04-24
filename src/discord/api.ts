import {
  RESTPostAPIChannelMessageJSONBody,
  RESTPostAPIWebhookWithTokenJSONBody,
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
   * Create Followup Message for an Interaction (channel-visible by default).
   * interaction_token authenticates the request; bot token is not used.
   * @see https://discord.com/developers/docs/interactions/receiving-and-responding#create-followup-message
   */
  async postInteractionFollowup(
    applicationId: string,
    interactionToken: string,
    body: RESTPostAPIWebhookWithTokenJSONBody,
  ): Promise<Response> {
    const url = `${baseUrl}/webhooks/${applicationId}/${interactionToken}`;
    return await this.#requestUnauthenticated(url, 'POST', body);
  }

  /**
   * Edit the Original Interaction Response (used to roll back on followup failure).
   * @see https://discord.com/developers/docs/interactions/receiving-and-responding#edit-original-interaction-response
   */
  async patchOriginalInteractionResponse(
    applicationId: string,
    interactionToken: string,
    body: RESTPostAPIWebhookWithTokenJSONBody,
  ): Promise<Response> {
    const url = `${baseUrl}/webhooks/${applicationId}/${interactionToken}/messages/@original`;
    return await this.#requestUnauthenticated(url, 'PATCH', body);
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

  async #request(
    url: string,
    method: string,
    body: unknown,
    headers = {},
  ): Promise<Response> {
    return await sendJson(url, method, body, {
      Authorization: `Bot ${this.#token}`,
      ...headers,
    });
  }

  async #requestUnauthenticated(
    url: string,
    method: string,
    body: unknown,
  ): Promise<Response> {
    return await sendJson(url, method, body, {});
  }
}

async function sendJson(
  url: string,
  method: string,
  body: unknown,
  headers: Record<string, string>,
): Promise<Response> {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
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
