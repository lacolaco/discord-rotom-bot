import {
  APIActionRowComponent,
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandAutocompleteResponse,
  APIApplicationCommandInteraction,
  APIApplicationCommandInteractionDataStringOption,
  APIInteractionResponse,
  APIComponentInMessageActionRow,
  APIMessageComponentInteraction,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
  MessageFlags,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import { ComponentResult } from '.';
import { buildPokemonViewModel } from '../pokeinfo/view-model';
import { formatPokemonEmbed } from '../pokeinfo/embed';
import { getAllPokemonNames, searchPokemonByName } from '../pokeinfo';

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

const SHARE_ACTION = 'share';

export async function createResponse(
  interaction: APIApplicationCommandInteraction,
): Promise<APIInteractionResponse | null> {
  if (interaction.data.type !== ApplicationCommandType.ChatInput) {
    return null;
  }
  const options = interaction.data.options ?? [];
  const nameOption = options.find((option) => option.name === 'name');
  if (nameOption?.type !== ApplicationCommandOptionType.String) {
    return null;
  }
  const name = nameOption.value;
  console.log(`[pokeinfo] name: ${name}`);

  const data = await searchPokemonByName(name);
  if (!data) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `"${name}" の情報は見つからなかったロトね...`,
        flags: MessageFlags.Ephemeral,
      },
    };
  }
  console.log(`[pokeinfo] found pokemon: ${data.yakkun?.url ?? name}`);
  const viewModel = buildPokemonViewModel(name, data);
  const embed = formatPokemonEmbed(viewModel);
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      embeds: [embed],
      components: [buildShareActionRow(name)],
      flags: MessageFlags.Ephemeral,
    },
  };
}

export async function createComponentResponse(
  interaction: APIMessageComponentInteraction,
): Promise<ComponentResult | null> {
  const customId = interaction.data.custom_id;
  const [, action, ...rest] = customId.split(':');
  if (action !== SHARE_ACTION) {
    return null;
  }
  const name = rest.join(':');
  if (!name) {
    return null;
  }
  const data = await searchPokemonByName(name);
  if (!data) {
    return {
      response: {
        type: InteractionResponseType.UpdateMessage,
        data: {
          content: `"${name}" の情報は見つからなかったロトね...`,
          embeds: [],
          components: [],
        },
      },
    };
  }
  const viewModel = buildPokemonViewModel(name, data);
  const embed = formatPokemonEmbed(viewModel);
  return {
    response: {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: 'チャンネルにシェアしたロト！',
        embeds: [],
        components: [],
      },
    },
    followup: async ({ applicationId, interactionToken, discord }) => {
      try {
        await discord.postInteractionFollowup(applicationId, interactionToken, {
          embeds: [embed],
        });
      } catch (e) {
        await discord
          .patchOriginalInteractionResponse(applicationId, interactionToken, {
            content: `シェアに失敗したロト... (${name})`,
            embeds: [embed],
            components: [buildShareActionRow(name)],
          })
          .catch((e2) => console.error('Rollback failed:', e2));
        throw e;
      }
    },
  };
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

function buildShareActionRow(
  name: string,
): APIActionRowComponent<APIComponentInMessageActionRow> {
  return {
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.Button,
        style: ButtonStyle.Primary,
        label: 'チャンネルにシェア',
        custom_id: `pokeinfo:${SHARE_ACTION}:${name}`,
      },
    ],
  };
}
