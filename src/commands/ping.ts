import {
  APIApplicationCommandInteraction,
  APIInteractionResponse,
  InteractionResponseType,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';

export default {
  name: 'ping',
  description: 'Replies with Pong!',
} satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

export async function createResponse(
  interaction: APIApplicationCommandInteraction,
): Promise<APIInteractionResponse> {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: { content: 'Pong!' },
  };
}
