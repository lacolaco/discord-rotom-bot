import { Interaction, SlashCommandBuilder } from 'discord.js';

export type CommandHandler<T extends Interaction> = {
  data: SlashCommandBuilder;
  accept(interaction: Interaction): boolean;
  execute: (interaction: T) => Promise<void>;
};
