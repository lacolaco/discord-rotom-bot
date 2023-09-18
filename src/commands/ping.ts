import { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord-api-types/v10';

export default {
  name: 'ping',
  description: 'Replies with Pong!',
} satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;
