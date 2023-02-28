import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  bold,
} from 'discord.js';
import { getAllPokemonNames, searchPokemonByName } from './search';

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

      const data = await searchPokemonByName(name);
      if (data) {
        console.log(`[pokeinfo] found pokemon: ${data.meta.url}`);
        await interaction.editReply({
          content: [
            `${bold(name)} の情報ロト！`,
            `${data.types.join('・')} ${formatBaseStats(data.baseStats)}`,
            `${data.meta.url}`,
          ].join('\n'),
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

function formatBaseStats(baseStats: {
  H: number;
  A: number;
  B: number;
  C: number;
  D: number;
  S: number;
}) {
  // join stats as H-A-B-C-D-S
  return `${baseStats.H}-${baseStats.A}-${baseStats.B}-${baseStats.C}-${baseStats.D}-${baseStats.S}`;
}
