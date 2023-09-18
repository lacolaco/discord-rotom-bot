import {
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandAutocompleteResponse,
  APIApplicationCommandInteraction,
  APIInteractionResponse,
} from 'discord-api-types/v10';
import * as ping from './ping';
import * as pokeinfo from './pokeinfo';

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
};

export const commands: Command[] = [ping, pokeinfo];

export function getCommandByName(name: string) {
  return commands.find((c) => c.default.name === name);
}
