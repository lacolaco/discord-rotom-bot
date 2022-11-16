import { Client, Routes } from 'discord.js';
import ping from './ping/command';
import pokeinfo from './pokeinfo/command';
import { ChatInputCommand } from './types';

export const chatInputCommands: Record<string, ChatInputCommand> = {
  [ping.data.name]: ping,
  [pokeinfo.data.name]: pokeinfo,
};

export async function registerGuildCommands(
  client: Client,
  appId: string,
  guildId: string,
) {
  console.log(`Installing commands...`);
  const commands = Object.values(chatInputCommands).map((command) =>
    command.data.toJSON(),
  );
  await client.rest.put(Routes.applicationGuildCommands(appId, guildId), {
    body: commands,
  });
}

export function getChatInputCommand(name: string): ChatInputCommand | null {
  return chatInputCommands[name] ?? null;
}
