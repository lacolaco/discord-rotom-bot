import {
  ChatInputCommandInteraction,
  Collection,
  Interaction,
  MessageInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { capitalize, DiscordRequest } from './utils';

export async function HasGuildCommands(appId: string, guildId: string, commands: any[]) {
  if (guildId === '' || appId === '') return;

  commands.forEach((c) => HasGuildCommand(appId, guildId, c));
}

// Checks for a command
async function HasGuildCommand(appId: string, guildId: string, command: any) {
  // API endpoint to get and post guild commands
  const endpoint = `applications/${appId}/guilds/${guildId}/commands`;

  try {
    const res = await DiscordRequest(endpoint, { method: 'GET' });
    const data = (await res.json()) as any[];

    if (data) {
      const installedNames = data.map((c) => c['name']);
      // This is just matching on the name, so it's not good for updates
      if (!installedNames.includes(command['name'])) {
        console.log(`Installing "${command['name']}"`);
        InstallGuildCommand(appId, guildId, command);
      } else {
        console.log(`"${command['name']}" command already installed`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

// Installs a command
export async function InstallGuildCommand(appId: string, guildId: string, command: any) {
  // API endpoint to get and post guild commands
  const endpoint = `applications/${appId}/guilds/${guildId}/commands`;
  // install command
  try {
    await DiscordRequest(endpoint, { method: 'POST', body: command });
  } catch (err) {
    console.error(err);
  }
}

export type ChatInputCommand = {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};

export const ping = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply('Pong!');
  },
};

export const chatInputCommands: Record<string, ChatInputCommand> = {
  ping,
};
