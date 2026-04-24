import { effectiveSpeed } from './speed';

export type Nature = 0.9 | 1.0 | 1.1;

export type ReversalResult =
  | { kind: 'always_a' }
  | { kind: 'always_b' }
  | { kind: 'threshold'; sp: number; nature: Nature };

export const NATURES: readonly Nature[] = [0.9, 1.0, 1.1] as const;
export const MAX_SP = 32;

/**
 * B側のすべての調整 (SP 0〜32 × 性格 ↓/無/↑) のうち、
 * 固定された A の有効速を上回る最小の調整を返す。
 * 最小の定義: (SP 昇順, 性格 ↓→無→↑ 昇順)。
 */
export function findMinimalReversal(
  aSpeed: number,
  bBase: number,
  bRank: number,
): ReversalResult {
  // 上限: B最速調整でもAに届かない → 常にA勝ち
  if (effectiveSpeed(bBase, MAX_SP, 1.1, bRank) <= aSpeed) {
    return { kind: 'always_a' };
  }
  // 下限: B最遅調整でもAを上回る → 常にB勝ち
  if (effectiveSpeed(bBase, 0, 0.9, bRank) > aSpeed) {
    return { kind: 'always_b' };
  }
  for (let sp = 0; sp <= MAX_SP; sp++) {
    for (const nature of NATURES) {
      if (effectiveSpeed(bBase, sp, nature, bRank) > aSpeed) {
        return { kind: 'threshold', sp, nature };
      }
    }
  }
  // ここに到達する場合は論理的にありえない（上下限チェックで網羅済み）
  return { kind: 'always_a' };
}
