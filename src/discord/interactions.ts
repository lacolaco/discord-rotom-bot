import {
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandInteraction,
  APIInteraction,
  APIInteractionResponse,
  APIMessageComponentInteraction,
  InteractionResponseType,
  InteractionType,
} from 'discord-api-types/v10';
import { verifyKey } from 'discord-interactions';
import { MiddlewareHandler } from 'hono';
import { ComponentFollowupContext, getCommandByName } from '../commands';
import { Env, HonoAppContext } from '../context';

export type Interaction = APIInteraction;

export type InteractionResult = {
  response: APIInteractionResponse | null;
  followup?: (ctx: ComponentFollowupContext) => Promise<void>;
};

export const verifyKeyMiddleware =
  (): MiddlewareHandler<HonoAppContext> => async (c, next) => {
    const signature = c.req.header('X-Signature-Ed25519');
    const timestamp = c.req.header('X-Signature-Timestamp');
    const body = await c.req.raw.clone().text();
    const isValidRequest =
      signature &&
      timestamp &&
      (await verifyKey(body, signature, timestamp, c.env.DISCORD_PUBLIC_KEY));
    if (!isValidRequest) {
      console.log('Invalid request signature');
      return c.text('Bad request signature', 401);
    }
    return await next();
  };

// https://discord.com/developers/docs/interactions/receiving-and-responding#interactions
export async function handleInteractionRequest(
  interaction: Interaction,
  env: Env,
): Promise<InteractionResult> {
  console.log(
    `handleInteractionRequest: ${interaction.type} ${interaction.id}`,
  );
  switch (interaction.type) {
    case InteractionType.Ping:
      return { response: { type: InteractionResponseType.Pong } };
    case InteractionType.ApplicationCommand:
      return {
        response: await handleApplicationCommandInteraction(interaction, env),
      };
    case InteractionType.ApplicationCommandAutocomplete:
      return {
        response: await handleApplicationCommandAutocompleteInteraction(
          interaction,
          env,
        ),
      };
    case InteractionType.MessageComponent:
      return await handleMessageComponentInteraction(interaction);
  }
  throw new Error('Unknown interaction');
}

async function handleApplicationCommandInteraction(
  interaction: APIApplicationCommandInteraction,
  env: Env,
): Promise<APIInteractionResponse | null> {
  const commandName = interaction.data.name;
  const command = getCommandByName(commandName);
  if (command) {
    return await command.createResponse(interaction, env);
  }
  return { type: InteractionResponseType.Pong };
}

async function handleApplicationCommandAutocompleteInteraction(
  interaction: APIApplicationCommandAutocompleteInteraction,
  env: Env,
): Promise<APIInteractionResponse | null> {
  const commandName = interaction.data.name;
  const command = getCommandByName(commandName);
  if (command && command.createAutocompleteResponse) {
    return await command.createAutocompleteResponse(interaction, env);
  }
  return null;
}

async function handleMessageComponentInteraction(
  interaction: APIMessageComponentInteraction,
): Promise<InteractionResult> {
  const customId = interaction.data.custom_id;
  const [namespace] = customId.split(':');
  const command = namespace ? getCommandByName(namespace) : undefined;
  if (command && command.createComponentResponse) {
    const result = await command.createComponentResponse(interaction);
    if (result) {
      return result;
    }
  }
  console.warn(`No handler for component custom_id: ${customId}`);
  return { response: null };
}
