import type { APIEmbed, APIEmbedField } from 'discord-api-types/v10';
import type { Nature, ReversalResult } from './compare';
import type { RankReversal, SpeedCompareViewModel } from './view-model';

function formatNatureShort(nature: Nature): string {
  if (nature === 1.1) return '↑';
  if (nature === 0.9) return '↓';
  return '';
}

function formatRank(rank: number): string {
  if (rank === 0) return '±0';
  if (rank > 0) return `+${rank}`;
  return `${rank}`;
}

function formatResult(
  result: ReversalResult,
  aName: string,
  bName: string,
): string {
  if (result.kind === 'always_a') return `${aName} > ${bName}`;
  if (result.kind === 'always_b') return `${aName} < ${bName}`;
  const nat = formatNatureShort(result.nature);
  return `${bName} SP${result.sp}${nat}以上 → ${aName} < ${bName}`;
}

function resultsEqual(a: ReversalResult, b: ReversalResult): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'threshold' && b.kind === 'threshold') {
    return a.sp === b.sp && a.nature === b.nature;
  }
  return true;
}

function formatRankRange(from: number, to: number): string {
  if (from === to) return formatRank(from);
  return `${formatRank(from)}〜${formatRank(to)}`;
}

function resultIcon(result: ReversalResult): string {
  if (result.kind === 'always_a') return '🔵';
  if (result.kind === 'always_b') return '🔴';
  return '🟡';
}

/**
 * 連続する同一結果をまとめて「アイコン + ランク + 結果」の3セクション構造にする。
 * Aが勝つ範囲 / 逆転境界 / Bが勝つ範囲 を視覚的に分離。
 */
function formatReversals(
  reversals: RankReversal[],
  aName: string,
  bName: string,
): string {
  type Group = { from: number; to: number; result: ReversalResult };
  const groups: Group[] = [];
  for (const r of reversals) {
    const last = groups[groups.length - 1];
    if (last && resultsEqual(last.result, r.result)) {
      last.to = r.rank;
    } else {
      groups.push({ from: r.rank, to: r.rank, result: r.result });
    }
  }
  return groups
    .map((g) => {
      const icon = resultIcon(g.result);
      const range = formatRankRange(g.from, g.to);
      const text = formatResult(g.result, aName, bName);
      return `${icon} **${range}** ${text}`;
    })
    .join('\n');
}

function formatBReference(speeds: [number, number, number, number]): string {
  const [max, sub, neutral, min] = speeds;
  return `**${max}** / ${sub} / ${neutral} / **${min}**`;
}

export function formatSpeedCompareEmbed(vm: SpeedCompareViewModel): APIEmbed {
  const fields: APIEmbedField[] = [
    {
      name: `A: ${vm.aName}`,
      value: `${vm.aConfig}\nS種族値 ${vm.aBase} → 実数値 **${vm.aSpeed}**`,
      inline: false,
    },
    {
      name: `B: ${vm.bName}`,
      value: `S種族値 ${vm.bBase} → 実数値 ${formatBReference(vm.bReferenceSpeeds)}`,
      inline: false,
    },
    {
      name: `${vm.bName}のランク別 逆転条件`,
      value: formatReversals(vm.reversals, vm.aName, vm.bName),
      inline: false,
    },
  ];

  return {
    title: 'すばやさ比較ロト！',
    color: 0x5865f2,
    fields,
    footer: {
      text: '補正換算: スカーフ=+1 / おいかぜ=+2 / まひ=-2',
    },
  };
}
