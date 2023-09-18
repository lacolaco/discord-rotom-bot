import {
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandInteraction,
  APIApplicationCommandInteractionDataStringOption,
  APIInteraction,
  APIInteractionResponse,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionResponseType,
  InteractionType,
} from 'discord-api-types/v10';
import {
  formatBaseStats,
  getAllPokemonNames,
  searchPokemonByName,
} from '../pokeinfo';
import { bold } from './utils';

export type Interaction = APIInteraction;
export { verifyKey } from 'discord-interactions';

// https://discord.com/developers/docs/interactions/receiving-and-responding#interactions
export async function onInteractionRequest(
  interaction: Interaction,
): Promise<APIInteractionResponse | null> {
  console.log(`onInteractionRequest: ${interaction.type} ${interaction.id}`);
  switch (interaction.type) {
    case InteractionType.Ping:
      return { type: InteractionResponseType.Pong };
    case InteractionType.ApplicationCommand:
      return await handleApplicationCommandInteraction(interaction);
    case InteractionType.ApplicationCommandAutocomplete:
      return await handleApplicationCommandAutocompleteInteraction(interaction);
  }
  throw new Error('Unknown interaction');
}

async function handleApplicationCommandInteraction(
  interaction: APIApplicationCommandInteraction,
): Promise<APIInteractionResponse | null> {
  const commandName = interaction.data.name;
  switch (commandName) {
    case 'ping':
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: 'Pong!' },
      };
    case 'pokeinfo':
      if (interaction.data.type !== ApplicationCommandType.ChatInput) {
        return null;
      }
      // Get name option
      const options = interaction.data.options ?? [];
      const nameOption = options.find((option) => option.name === 'name');
      if (
        nameOption == null ||
        nameOption.type !== ApplicationCommandOptionType.String
      ) {
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
        await {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: `"${name}" の情報は見つからなかったロトね...` },
        };
      }
      return null;
  }
  return { type: InteractionResponseType.Pong };
}

async function handleApplicationCommandAutocompleteInteraction(
  interaction: APIApplicationCommandAutocompleteInteraction,
): Promise<APIInteractionResponse | null> {
  const commandName = interaction.data.name;
  const options = interaction.data.options ?? [];
  switch (commandName) {
    case 'pokeinfo':
      const focusedValue = options.find(
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
  return null;
}
