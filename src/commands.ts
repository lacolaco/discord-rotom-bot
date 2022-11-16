import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export type ChatInputCommand = {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};

export const ping = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Pong!', ephemeral: true });
  },
};

export const chatInputCommands: Record<string, ChatInputCommand> = {
  [ping.data.name]: ping,
};
