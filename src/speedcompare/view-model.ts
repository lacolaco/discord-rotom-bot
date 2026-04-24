import type { Pokemon } from '../pokeinfo';
import { calcActuals } from '../pokeinfo/stats';
import {
  findMinimalReversal,
  type Nature,
  type ReversalResult,
} from './compare';
import { effectiveSpeed } from './speed';

export type AInput = {
  name: string;
  pokemon: Pokemon;
  sp: number;
  nature: Nature;
  /** Aの能力ランク補正 (-6〜+6、省略時は0) */
  rank?: number;
};

export type BInput = {
  name: string;
  pokemon: Pokemon;
};

export type RankReversal = {
  rank: number;
  result: ReversalResult;
};

export type SpeedCompareViewModel = {
  aName: string;
  aConfig: string;
  aBase: number;
  aSpeed: number;
  bName: string;
  bBase: number;
  /** [速, 準, 無, 遅] の参考実数値 */
  bReferenceSpeeds: [number, number, number, number];
  reversals: RankReversal[];
};

const RANK_RANGE = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6] as const;

function formatNature(nature: Nature): string {
  if (nature === 1.1) return '↑補正';
  if (nature === 0.9) return '↓補正';
  return '無補正';
}

function formatRankSuffix(rank: number): string {
  if (rank === 0) return '';
  if (rank > 0) return ` ランク+${rank}`;
  return ` ランク${rank}`;
}

export function buildSpeedCompareViewModel(input: {
  a: AInput;
  b: BInput;
}): SpeedCompareViewModel {
  const { a, b } = input;
  const aRank = a.rank ?? 0;
  const aSpeed = effectiveSpeed(a.pokemon.baseStats.S, a.sp, a.nature, aRank);
  const bBase = b.pokemon.baseStats.S;
  const bActuals = calcActuals('S', bBase) as [number, number, number, number];

  const reversals: RankReversal[] = RANK_RANGE.map((rank) => ({
    rank,
    result: findMinimalReversal(aSpeed, bBase, rank),
  }));

  return {
    aName: a.name,
    aConfig: `SP${a.sp} ${formatNature(a.nature)}${formatRankSuffix(aRank)}`,
    aBase: a.pokemon.baseStats.S,
    aSpeed,
    bName: b.name,
    bBase,
    bReferenceSpeeds: bActuals,
    reversals,
  };
}
