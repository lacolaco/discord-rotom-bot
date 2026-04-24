import {
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandAutocompleteResponse,
  APIApplicationCommandInteraction,
  APIInteraction,
  APIInteractionResponse,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionResponseType,
  MessageFlags,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import { Env } from '../context';
import { getAllPokemonNames, searchPokemonByName } from '../pokeinfo';
import type { Nature } from '../speedcompare/compare';
import { buildSpeedCompareViewModel } from '../speedcompare/view-model';
import { formatSpeedCompareEmbed } from '../speedcompare/embed';

const NATURE_UP = 'up';
const NATURE_NEUTRAL = 'neutral';
const NATURE_DOWN = 'down';

type NatureCode = typeof NATURE_UP | typeof NATURE_NEUTRAL | typeof NATURE_DOWN;

type AState = {
  aName: string;
  aSp: number;
  aNature: NatureCode;
};

const STATE_TTL_SECONDS = 60 * 60 * 24; // 1日

export default {
  name: 'speedcompare',
  description:
    'ベースポケモンAと仮想敵Bのすばやさ関係を分析します (Aは前回の入力が保持される)',
  options: [
    {
      name: 'b',
      description: '仮想敵ポケモンB (必須)',
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
    {
      name: 'a',
      description: 'ベースポケモンA (省略時は前回の入力を使用)',
      type: ApplicationCommandOptionType.String,
      required: false,
      autocomplete: true,
    },
    {
      name: 'a_sp',
      description: 'Aの素早さSP 0〜32 (省略時は前回の入力を使用)',
      type: ApplicationCommandOptionType.Integer,
      required: false,
      min_value: 0,
      max_value: 32,
    },
    {
      name: 'a_nature',
      description: 'Aの性格補正 (省略時は前回の入力を使用)',
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        { name: '↑補正', value: NATURE_UP },
        { name: '無補正', value: NATURE_NEUTRAL },
        { name: '↓補正', value: NATURE_DOWN },
      ],
    },
  ],
} satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

function parseNature(code: NatureCode): Nature {
  if (code === NATURE_UP) return 1.1;
  if (code === NATURE_DOWN) return 0.9;
  return 1.0;
}

function getUserId(interaction: APIInteraction): string | null {
  return interaction.member?.user.id ?? interaction.user?.id ?? null;
}

function stateKey(userId: string): string {
  return `sc:a:${userId}`;
}

async function loadState(
  env: Env,
  userId: string,
): Promise<AState | null> {
  const raw = await env.NEWS_KV.get(stateKey(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AState;
  } catch {
    return null;
  }
}

async function saveState(
  env: Env,
  userId: string,
  state: AState,
): Promise<void> {
  await env.NEWS_KV.put(stateKey(userId), JSON.stringify(state), {
    expirationTtl: STATE_TTL_SECONDS,
  });
}

export async function createResponse(
  interaction: APIApplicationCommandInteraction,
  env: Env,
): Promise<APIInteractionResponse | null> {
  if (interaction.data.type !== ApplicationCommandType.ChatInput) {
    return null;
  }
  const options = interaction.data.options ?? [];
  const aOpt = options.find((o) => o.name === 'a');
  const spOpt = options.find((o) => o.name === 'a_sp');
  const natureOpt = options.find((o) => o.name === 'a_nature');
  const bOpt = options.find((o) => o.name === 'b');
  if (bOpt?.type !== ApplicationCommandOptionType.String) {
    return null;
  }

  const userId = getUserId(interaction);
  const stored = userId ? await loadState(env, userId) : null;

  const aNameIn =
    aOpt?.type === ApplicationCommandOptionType.String ? aOpt.value : undefined;
  const aSpIn =
    spOpt?.type === ApplicationCommandOptionType.Integer
      ? spOpt.value
      : undefined;
  const aNatureIn =
    natureOpt?.type === ApplicationCommandOptionType.String
      ? (natureOpt.value as NatureCode)
      : undefined;

  const aName = aNameIn ?? stored?.aName;
  const aSp = aSpIn ?? stored?.aSp;
  const aNatureCode = aNatureIn ?? stored?.aNature;

  if (aName === undefined || aSp === undefined || aNatureCode === undefined) {
    const missing = [
      aName === undefined && '`a`',
      aSp === undefined && '`a_sp`',
      aNatureCode === undefined && '`a_nature`',
    ]
      .filter(Boolean)
      .join(', ');
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content:
          `初回利用は ${missing} も指定してくださいロト。次回からは \`b\` だけで計算できるようになるロト！`,
        flags: MessageFlags.Ephemeral,
      },
    };
  }

  const aNature = parseNature(aNatureCode);
  const bName = bOpt.value;
  console.log(
    `[speedcompare] a=${aName} sp=${aSp} nature=${aNature} b=${bName} (user=${userId})`,
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

  if (userId) {
    await saveState(env, userId, {
      aName,
      aSp,
      aNature: aNatureCode,
    });
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
