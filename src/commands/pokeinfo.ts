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
  formatBaseStatsGraph,
  formatSpeedLines,
  getAllPokemonNames,
  searchPokemonByName,
} from '../pokeinfo';

export default {
  name: 'pokeinfo',
  description: 'ポケモンの情報を日本語名で検索します',
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
    console.log(`[pokeinfo] found pokemon: ${data.yakkun?.url ?? name}`);
    const lines = [
      `${bold(name)} の情報ロト！ ${data.types.join('・')}`,
      formatBaseStatsGraph(data.baseStats),
      formatSpeedLines(data.baseStats.S),
      `特性: ${data.abilities.join(' / ')}`,
    ];
    if (data.yakkun?.url) {
      lines.push(data.yakkun.url);
    }
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: lines.join('\n'),
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
