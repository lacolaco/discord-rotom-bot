import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { searchURLByName } from '../pokeinfo/search';

export default {
  data: new SlashCommandBuilder()
    .setName('pokeinfo')
    .addStringOption((option) => option.setName('name').setDescription('ポケモンの日本語名').setRequired(true))
    .setDescription('ポケモン徹底攻略のページを日本語名で検索します'),
  async execute(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString('name')!;
    await interaction.deferReply();

    const url = await searchURLByName(name);
    if (url) {
      await interaction.editReply({ content: `${url}` });
    } else {
      await interaction.editReply({ content: '見つからなかったロト...' });
    }
  },
};
