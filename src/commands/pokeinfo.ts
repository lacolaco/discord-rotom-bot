import {
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandAutocompleteResponse,
  APIApplicationCommandInteraction,
  APIApplicationCommandInteractionDataStringOption,
  APIInteractionResponse,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionResponseType,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import { bold } from '../discord/utils';
import {
  formatBaseStats,
  getAllPokemonNames,
  searchPokemonByName,
} from '../pokeinfo';

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

export async function createResponse(
  interaction: APIApplicationCommandInteraction,
): Promise<APIInteractionResponse | null> {
  if (interaction.data.type !== ApplicationCommandType.ChatInput) {
    return null;
  }
  // Get name option
  const options = interaction.data.options ?? [];
  const nameOption = options.find((option) => option.name === 'name');
  if (nameOption?.type !== ApplicationCommandOptionType.String) {
    return null;
  }
  const name = nameOption.value;
  console.log(`[pokeinfo] name: ${name}`);

  // Search pokemon by name
  const data = await searchPokemonByName(name);
  if (data) {
    console.log(`[pokeinfo] found pokemon: ${data.meta.url}`);
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: [
          `${bold(name)} の情報ロト！`,
          `${data.types.join('・')} ${formatBaseStats(data.baseStats)}`,
          `${data.meta.url}`,
        ].join('\n'),
      },
    };
  } else {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: `"${name}" の情報は見つからなかったロトね...` },
    };
  }
}

export async function createAutocompleteResponse(
  interaction: APIApplicationCommandAutocompleteInteraction,
): Promise<APIApplicationCommandAutocompleteResponse | null> {
  const focusedValue = interaction.data.options.find(
    (option) =>
      option.type === ApplicationCommandOptionType.String && option.focused,
  ) as APIApplicationCommandInteractionDataStringOption | undefined;
  console.log(`[pokeinfo] autocomplete: ${focusedValue}`);
  if (focusedValue == null) {
    return null;
  }

  const choices = await getAllPokemonNames({ prefix: focusedValue.value });
  console.log(`[pokeinfo] autocomplete choices: ${choices.length}`);
  return {
    type: InteractionResponseType.ApplicationCommandAutocompleteResult,
    data: {
      choices: choices.map((choice) => ({ name: choice, value: choice })),
    },
  };
}
