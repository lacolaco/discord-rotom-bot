import {
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandAutocompleteResponse,
  APIApplicationCommandInteraction,
  APIInteractionResponse,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionResponseType,
  MessageFlags,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import { getAllPokemonNames, searchPokemonByName } from '../pokeinfo';
import type { Nature } from '../speedcompare/compare';
import { buildSpeedCompareViewModel } from '../speedcompare/view-model';
import { formatSpeedCompareEmbed } from '../speedcompare/embed';

const NATURE_UP = 'up';
const NATURE_NEUTRAL = 'neutral';
const NATURE_DOWN = 'down';

export default {
  name: 'speedcompare',
  description: 'ベースポケモンAと仮想敵Bのすばやさ関係を分析します',
  options: [
    {
      name: 'a',
      description: 'ベースポケモンA（自分側）',
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
    {
      name: 'a_sp',
      description: 'Aの素早さSP (0〜32)',
      type: ApplicationCommandOptionType.Integer,
      required: true,
      min_value: 0,
      max_value: 32,
    },
    {
      name: 'a_nature',
      description: 'Aの性格補正',
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: '↑補正', value: NATURE_UP },
        { name: '無補正', value: NATURE_NEUTRAL },
        { name: '↓補正', value: NATURE_DOWN },
      ],
    },
    {
      name: 'b',
      description: '仮想敵ポケモンB',
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
  ],
} satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

function parseNature(value: string): Nature {
  if (value === NATURE_UP) return 1.1;
  if (value === NATURE_DOWN) return 0.9;
  return 1.0;
}

export async function createResponse(
  interaction: APIApplicationCommandInteraction,
): Promise<APIInteractionResponse | null> {
  if (interaction.data.type !== ApplicationCommandType.ChatInput) {
    return null;
  }
  const options = interaction.data.options ?? [];
  const aOpt = options.find((o) => o.name === 'a');
  const spOpt = options.find((o) => o.name === 'a_sp');
  const natureOpt = options.find((o) => o.name === 'a_nature');
  const bOpt = options.find((o) => o.name === 'b');
  if (
    aOpt?.type !== ApplicationCommandOptionType.String ||
    spOpt?.type !== ApplicationCommandOptionType.Integer ||
    natureOpt?.type !== ApplicationCommandOptionType.String ||
    bOpt?.type !== ApplicationCommandOptionType.String
  ) {
    return null;
  }

  const aName = aOpt.value;
  const aSp = spOpt.value;
  const aNature = parseNature(natureOpt.value);
  const bName = bOpt.value;
  console.log(
    `[speedcompare] a=${aName} sp=${aSp} nature=${aNature} b=${bName}`,
  );

  const [aData, bData] = await Promise.all([
    searchPokemonByName(aName),
    searchPokemonByName(bName),
  ]);
  if (!aData || !bData) {
    const missing = [!aData && `"${aName}"`, !bData && `"${bName}"`]
      .filter(Boolean)
      .join(' と ');
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `${missing} の情報は見つからなかったロトね...`,
        flags: MessageFlags.Ephemeral,
      },
    };
  }

  const vm = buildSpeedCompareViewModel({
    a: { name: aName, pokemon: aData, sp: aSp, nature: aNature },
    b: { name: bName, pokemon: bData },
  });
  const embed = formatSpeedCompareEmbed(vm);
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    },
  };
}

export async function createAutocompleteResponse(
  interaction: APIApplicationCommandAutocompleteInteraction,
): Promise<APIApplicationCommandAutocompleteResponse | null> {
  const focused = interaction.data.options.find(
    (o) => o.type === ApplicationCommandOptionType.String && o.focused,
  );
  if (!focused || focused.type !== ApplicationCommandOptionType.String) {
    return null;
  }
  if (focused.name !== 'a' && focused.name !== 'b') {
    return null;
  }
  const choices = await getAllPokemonNames({ prefix: focused.value });
  return {
    type: InteractionResponseType.ApplicationCommandAutocompleteResult,
    data: {
      choices: choices.slice(0, 25).map((c) => ({ name: c, value: c })),
    },
  };
}
