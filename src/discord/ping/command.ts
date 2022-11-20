import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Interaction,
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  accept(interaction: Interaction) {
    return interaction.isChatInputCommand();
  },
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await interaction.editReply({ content: 'Pong!' });
  },
};
