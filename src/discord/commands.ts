import { Client, Routes } from 'discord.js';
import ping from './ping/command';
import pokeinfo from './pokeinfo/command';
import { CommandHandler } from './types';

export const commandHandlers: Record<string, CommandHandler<any>> = {
  [ping.data.name]: ping,
  [pokeinfo.data.name]: pokeinfo,
};

export async function registerGuildCommands(
  client: Client,
  appId: string,
  guildId: string,
) {
  console.log(`Installing commands...`);
  const commands = Object.values(commandHandlers).map((command) =>
    command.data.toJSON(),
  );
  await client.rest.put(Routes.applicationGuildCommands(appId, guildId), {
    body: commands,
  });
}

export function getCommand(name: string): CommandHandler<any> | null {
  return commandHandlers[name] ?? null;
}
