import type { APIEmbed } from 'discord-api-types/v10';
import type { PokemonViewModel } from './view-model';

const TYPE_COLORS: Record<string, number> = {
  ノーマル: 0xa8a878,
  ほのお: 0xf08030,
  みず: 0x6890f0,
  くさ: 0x78c850,
  でんき: 0xf8d030,
  こおり: 0x98d8d8,
  かくとう: 0xc03028,
  どく: 0xa040a0,
  じめん: 0xe0c068,
  ひこう: 0xa890f0,
  エスパー: 0xf85888,
  むし: 0xa8b820,
  いわ: 0xb8a038,
  ゴースト: 0x705898,
  ドラゴン: 0x7038f8,
  あく: 0x705848,
  はがね: 0xb8b8d0,
  フェアリー: 0xee99ac,
};

export function formatPokemonEmbed(data: PokemonViewModel): APIEmbed {
  const typeStr = data.types.join('・');
  const abilityStr = data.abilities.join(' / ');

  const statLines = data.stats.map(
    (s) =>
      `${s.key} ${String(s.base).padStart(3)} | ${String(s.min).padStart(3)} ~ ${s.max}`,
  );
  statLines.push(`合計 ${data.bst}`);

  const description = [
    `タイプ: ${typeStr}`,
    `特性: ${abilityStr}`,
    '',
    '```',
    ...statLines,
    '```',
  ].join('\n');

  const color = TYPE_COLORS[data.types[0] ?? ''] ?? 0x808080;

  return {
    title: `${data.name} の情報ロト！`,
    description,
    color,
    ...(data.yakkunUrl ? { url: data.yakkunUrl } : {}),
  };
}
