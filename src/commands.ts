import ping from './commands/ping';
import pokeinfo from './commands/pokeinfo';
import { ChatInputCommand } from './commands/types';

export const chatInputCommands: Record<string, ChatInputCommand> = {
  [ping.data.name]: ping,
  [pokeinfo.data.name]: pokeinfo,
};
