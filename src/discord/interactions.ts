import {
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandInteraction,
  APIInteraction,
  APIInteractionResponse,
  InteractionResponseType,
  InteractionType,
} from 'discord-api-types/v10';
import { getCommandByName } from 'src/commands';

export type Interaction = APIInteraction;
export { verifyKey } from 'discord-interactions';

// https://discord.com/developers/docs/interactions/receiving-and-responding#interactions
export async function handleInteractionRequest(
  interaction: Interaction,
): Promise<APIInteractionResponse | null> {
  console.log(
    `handleInteractionRequest: ${interaction.type} ${interaction.id}`,
  );
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
  const command = getCommandByName(commandName);
  if (command) {
    return await command.createResponse(interaction);
  }
  return { type: InteractionResponseType.Pong };
}

async function handleApplicationCommandAutocompleteInteraction(
  interaction: APIApplicationCommandAutocompleteInteraction,
): Promise<APIInteractionResponse | null> {
  const commandName = interaction.data.name;
  const command = getCommandByName(commandName);
  if (command && command.createAutocompleteResponse) {
    return await command.createAutocompleteResponse(interaction);
  }
  return null;
}
