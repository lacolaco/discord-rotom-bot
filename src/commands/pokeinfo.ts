import {
  ApplicationCommandOptionType,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';

export default {
  name: 'pokeinfo',
  description: 'ポケモン徹底攻略のページを日本語名で検索します',
  options: [
    {
      name: 'name',
      description: 'ポケモンの日本語名',
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
  ],
} satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;
