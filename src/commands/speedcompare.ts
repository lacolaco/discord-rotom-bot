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

type History = {
  a: string[];
  aSp: number[];
  b: string[];
};

const HISTORY_LIMIT = 10;
const HISTORY_TTL_SECONDS = 60 * 60 * 24 * 30; // 30日
const AUTOCOMPLETE_LIMIT = 25;
const TYPICAL_SP_VALUES = [0, 4, 12, 20, 28, 32];

export default {
  name: 'speedcompare',
  description: 'ベースポケモンAと仮想敵Bのすばやさ関係を分析します',
  options: [
    {
      name: 'a',
      description:
        'ベースポケモンA（直近使用したポケモンが上位に表示されます）',
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
    {
      name: 'a_sp',
      description: 'Aの素早さSP (0〜32、直近使用値が上位に表示されます)',
      type: ApplicationCommandOptionType.Integer,
      required: true,
      min_value: 0,
      max_value: 32,
      autocomplete: true,
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
      description:
        '仮想敵ポケモンB（直近使用したポケモンが上位に表示されます）',
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

function getUserId(interaction: APIInteraction): string | null {
  return interaction.member?.user.id ?? interaction.user?.id ?? null;
}

function historyKey(userId: string): string {
  return `sc:history:${userId}`;
}

function emptyHistory(): History {
  return { a: [], aSp: [], b: [] };
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];
}

function toNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((v): v is number => typeof v === 'number')
    : [];
}

async function loadHistory(env: Env, userId: string): Promise<History> {
  const raw = await env.SPEEDCOMPARE_KV.get(historyKey(userId));
  if (!raw) return emptyHistory();
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      a: toStringArray(parsed.a),
      aSp: toNumberArray(parsed.aSp),
      b: toStringArray(parsed.b),
    };
  } catch {
    return emptyHistory();
  }
}

async function saveHistory(
  env: Env,
  userId: string,
  history: History,
): Promise<void> {
  await env.SPEEDCOMPARE_KV.put(historyKey(userId), JSON.stringify(history), {
    expirationTtl: HISTORY_TTL_SECONDS,
  });
}

function pushHistory<T>(list: T[], value: T): T[] {
  return [value, ...list.filter((v) => v !== value)].slice(0, HISTORY_LIMIT);
}

/** 候補リストを、historyにある値を上位にくるよう並び替える (重複なし) */
function sortByHistory<T>(choices: T[], history: T[]): T[] {
  const choiceSet = new Set(choices);
  const historyPart = history.filter((v) => choiceSet.has(v));
  const historySet = new Set(historyPart);
  const restPart = choices.filter((v) => !historySet.has(v));
  return [...historyPart, ...restPart];
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
  const userId = getUserId(interaction);
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
    const prev = await loadHistory(env, userId);
    const next: History = {
      a: pushHistory(prev.a, aName),
      aSp: pushHistory(prev.aSp, aSp),
      b: pushHistory(prev.b, bName),
    };
    await saveHistory(env, userId, next);
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
  env: Env,
): Promise<APIApplicationCommandAutocompleteResponse | null> {
  const focused = interaction.data.options.find(
    (o) =>
      (o.type === ApplicationCommandOptionType.String ||
        o.type === ApplicationCommandOptionType.Integer) &&
      o.focused,
  );
  if (!focused) return null;

  const userId = getUserId(interaction);
  const history = userId ? await loadHistory(env, userId) : emptyHistory();

  if (
    focused.type === ApplicationCommandOptionType.String &&
    (focused.name === 'a' || focused.name === 'b')
  ) {
    const query = focused.value;
    const hits = await getAllPokemonNames({ prefix: query });
    const histList = focused.name === 'a' ? history.a : history.b;
    const sorted = sortByHistory(hits, histList).slice(0, AUTOCOMPLETE_LIMIT);
    return {
      type: InteractionResponseType.ApplicationCommandAutocompleteResult,
      data: {
        choices: sorted.map((c) => ({ name: c, value: c })),
      },
    };
  }

  if (
    focused.type === ApplicationCommandOptionType.Integer &&
    focused.name === 'a_sp'
  ) {
    // a_sp の候補は少数固定 (typical 6 + history 10) のため、入力値でのフィルタは行わず全件提示する
    const candidates = Array.from(
      new Set([...history.aSp, ...TYPICAL_SP_VALUES]),
    ).filter((n) => n >= 0 && n <= 32);
    const sorted = sortByHistory(candidates, history.aSp).slice(
      0,
      AUTOCOMPLETE_LIMIT,
    );
    return {
      type: InteractionResponseType.ApplicationCommandAutocompleteResult,
      data: {
        choices: sorted.map((n) => ({ name: String(n), value: n })),
      },
    };
  }

  return null;
}
