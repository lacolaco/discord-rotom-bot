import type { APIEmbed, APIEmbedField } from 'discord-api-types/v10';
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

function buildMetaFields(data: PokemonViewModel): APIEmbedField[] {
  return [
    { name: 'タイプ', value: data.types.join('・'), inline: true },
    { name: '特性', value: data.abilities.join(' / '), inline: true },
  ];
}

function buildStatFields(data: PokemonViewModel): APIEmbedField[] {
  return data.stats.map((s) => ({
    name: s.key,
    value: `**${s.base}** (${s.min}~${s.max})`,
    inline: true,
  }));
}

export function formatPokemonEmbed(data: PokemonViewModel): APIEmbed {
  const color = TYPE_COLORS[data.types[0] ?? ''] ?? 0x808080;

  return {
    title: `${data.name} の情報ロト！`,
    color,
    fields: [
      ...buildMetaFields(data),
      { name: '種族値', value: 'Lv.50 実数値範囲', inline: false },
      ...buildStatFields(data),
    ],
    footer: { text: `合計: ${data.bst}` },
    ...(data.yakkunUrl ? { url: data.yakkunUrl } : {}),
  };
}
