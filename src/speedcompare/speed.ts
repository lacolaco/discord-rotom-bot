import { calcStat } from '../pokeinfo/stats';

/**
 * 能力ランク補正倍率。
 * 正: (2 + rank) / 2、負: 2 / (2 - rank)。
 * ゲーム内の他の1.5/2/0.5倍補正との等価関係:
 *   こだわりスカーフ = +1、おいかぜ = +2、まひ = -2。
 */
export function rankMult(rank: number): number {
  if (rank >= 0) return (2 + rank) / 2;
  return 2 / (2 - rank);
}

/**
 * 有効素早さ = floor(実数値 × rankMult)。
 * 中間の丸めは全て切り捨てで統一する。
 */
export function effectiveSpeed(
  base: number,
  sp: number,
  nature: number,
  rank: number,
): number {
  const actual = calcStat(base, sp, nature);
  return Math.floor(actual * rankMult(rank));
}
