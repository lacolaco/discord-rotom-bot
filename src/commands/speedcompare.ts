import {
  APIActionRowComponent,
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandAutocompleteResponse,
  APIApplicationCommandInteraction,
  APIComponentInMessageActionRow,
  APIComponentInModalActionRow,
  APIInteractionResponse,
  APIMessageComponentInteraction,
  APIModalInteractionResponseCallbackData,
  APIModalSubmitInteraction,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
  MessageFlags,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  TextInputStyle,
} from 'discord-api-types/v10';
import { ComponentResult } from '.';
import { getAllPokemonNames, searchPokemonByName } from '../pokeinfo';
import type { Nature } from '../speedcompare/compare';
import { buildSpeedCompareViewModel } from '../speedcompare/view-model';
import { formatSpeedCompareEmbed } from '../speedcompare/embed';

const NATURE_UP = 'up';
const NATURE_NEUTRAL = 'neutral';
const NATURE_DOWN = 'down';

const CHANGE_B_ACTION = 'change_b';
const SUBMIT_B_ACTION = 'submit_b';
const MODAL_B_NAME_INPUT = 'b_name';

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

function parseNature(code: string): Nature {
  if (code === NATURE_UP) return 1.1;
  if (code === NATURE_DOWN) return 0.9;
  return 1.0;
}

function natureCode(nature: Nature): string {
  if (nature === 1.1) return NATURE_UP;
  if (nature === 0.9) return NATURE_DOWN;
  return NATURE_NEUTRAL;
}

function buildChangeBRow(
  aName: string,
  aSp: number,
  aNature: Nature,
): APIActionRowComponent<APIComponentInMessageActionRow> {
  return {
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.Button,
        style: ButtonStyle.Secondary,
        label: '🔁 Bを変えて再計算',
        custom_id: `speedcompare:${CHANGE_B_ACTION}:${aName}:${aSp}:${natureCode(aNature)}`,
      },
    ],
  };
}

function buildChangeBModal(
  aName: string,
  aSp: number,
  aNature: Nature,
): APIModalInteractionResponseCallbackData {
  const row: APIActionRowComponent<APIComponentInModalActionRow> = {
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.TextInput,
        custom_id: MODAL_B_NAME_INPUT,
        label: 'ポケモンB名 (日本語正式名)',
        style: TextInputStyle.Short,
        required: true,
        max_length: 32,
      },
    ],
  };
  return {
    custom_id: `speedcompare:${SUBMIT_B_ACTION}:${aName}:${aSp}:${natureCode(aNature)}`,
    title: `vs ${aName} (SP${aSp} ${aNature === 1.1 ? '↑' : aNature === 0.9 ? '↓' : '無'})`,
    components: [row],
  };
}

async function renderResult(
  aName: string,
  aSp: number,
  aNature: Nature,
  bName: string,
): Promise<APIInteractionResponse> {
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
      components: [buildChangeBRow(aName, aSp, aNature)],
      flags: MessageFlags.Ephemeral,
    },
  };
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
  return renderResult(aName, aSp, aNature, bName);
}

export async function createComponentResponse(
  interaction: APIMessageComponentInteraction,
): Promise<ComponentResult | null> {
  const [, action, aName, aSpStr, aNatureCode] =
    interaction.data.custom_id.split(':');
  if (action !== CHANGE_B_ACTION || !aName || !aSpStr || !aNatureCode) {
    return null;
  }
  const aSp = Number(aSpStr);
  const aNature = parseNature(aNatureCode);
  return {
    response: {
      type: InteractionResponseType.Modal,
      data: buildChangeBModal(aName, aSp, aNature),
    },
  };
}

export async function createModalSubmitResponse(
  interaction: APIModalSubmitInteraction,
): Promise<ComponentResult | null> {
  const [, action, aName, aSpStr, aNatureCode] =
    interaction.data.custom_id.split(':');
  if (action !== SUBMIT_B_ACTION || !aName || !aSpStr || !aNatureCode) {
    return null;
  }
  const aSp = Number(aSpStr);
  const aNature = parseNature(aNatureCode);
  let bName: string | undefined;
  for (const row of interaction.data.components) {
    if (row.type !== ComponentType.ActionRow) continue;
    for (const comp of row.components) {
      if (
        comp.type === ComponentType.TextInput &&
        comp.custom_id === MODAL_B_NAME_INPUT
      ) {
        bName = comp.value;
      }
    }
  }
  if (!bName) {
    return null;
  }
  console.log(
    `[speedcompare:modal] a=${aName} sp=${aSp} nature=${aNature} b=${bName}`,
  );
  return { response: await renderResult(aName, aSp, aNature, bName.trim()) };
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
