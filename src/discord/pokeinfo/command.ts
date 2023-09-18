import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pokeinfo')
    .addStringOption((option) =>
      option
        .setName('name')
        .setDescription('ポケモンの日本語名')
        .setRequired(true)
        .setAutocomplete(true),
    )
    .setDescription('ポケモン徹底攻略のページを日本語名で検索します'),
};
