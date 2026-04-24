import {
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandAutocompleteResponse,
  APIApplicationCommandInteraction,
  APIInteractionResponse,
  APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import DiscordApi from '../discord/api';
import * as ping from './ping';
import * as pokeinfo from './pokeinfo';
import * as speedcompare from './speedcompare';

export type ComponentFollowupContext = {
  applicationId: string;
  interactionToken: string;
  discord: DiscordApi;
};

export type ComponentResult = {
  response: APIInteractionResponse;
  followup?: (ctx: ComponentFollowupContext) => Promise<void>;
};

type Command = {
  default: {
    name: string;
    description: string;
  };
  createResponse: (
    interaction: APIApplicationCommandInteraction,
  ) => Promise<APIInteractionResponse | null>;
  createAutocompleteResponse?: (
    interaction: APIApplicationCommandAutocompleteInteraction,
  ) => Promise<APIApplicationCommandAutocompleteResponse | null>;
  createComponentResponse?: (
    interaction: APIMessageComponentInteraction,
  ) => Promise<ComponentResult | null>;
};

export const commands: Command[] = [ping, pokeinfo, speedcompare];

export function getCommandByName(name: string) {
  return commands.find((c) => c.default.name === name);
}
