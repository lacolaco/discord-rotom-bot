import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Interaction,
  AutocompleteInteraction,
} from 'discord.js';
import { getAllPokemonNames, searchURLByName } from './search';

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
  accept(interaction: Interaction) {
    return interaction.isChatInputCommand() || interaction.isAutocomplete();
  },
  async execute(
    interaction: ChatInputCommandInteraction | AutocompleteInteraction,
  ) {
    if (interaction.isAutocomplete()) {
      const focusedValue = interaction.options.getFocused();
      if (focusedValue.length < 1) {
        await interaction.respond([]);
        return;
      }
      const choices = await getAllPokemonNames({ prefix: focusedValue });
      await interaction.respond(
        choices.map((choice) => ({ name: choice, value: choice })),
      );
    } else if (interaction.isChatInputCommand()) {
      const name = interaction.options.getString('name')!;
      console.log(`[pokeinfo] name: ${name}`);
      await interaction.deferReply();

      const url = await searchURLByName(name);
      console.log(`[pokeinfo] found url: ${url}`);
      if (url) {
        await interaction.editReply({
          content: `"${name}" の情報ロト！ ${url}`,
        });
      } else {
        await interaction.editReply({
          content: `"${name}" の情報は見つからなかったロトね...`,
        });
      }
    }
  },
};
