import {
  APIApplicationCommandInteraction,
  APIInteractionResponse,
  InteractionResponseType,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import { Env } from '../context';

export default {
  name: 'ping',
  description: 'Replies with Pong!',
} satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

export async function createResponse(
  _interaction: APIApplicationCommandInteraction,
  _env: Env,
): Promise<APIInteractionResponse> {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: { content: 'Pong!' },
  };
}
