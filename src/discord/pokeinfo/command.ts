import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
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
  async execute(interaction: ChatInputCommandInteraction) {
    if (interaction.isChatInputCommand()) {
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
  async autocomplete(interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused();
    console.log(`[pokeinfo] autocomplete: ${focusedValue}`);
    if (focusedValue.length < 1) {
      return;
    }
    const choices = await getAllPokemonNames({ prefix: focusedValue });
    console.log(`[pokeinfo] autocomplete choices: ${choices.length}`);
    await interaction.respond(
      choices.map((choice) => ({ name: choice, value: choice })),
    );
  },
};
