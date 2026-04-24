/**
 * Pokémon Champions のステータス実数値計算（Lv.50、個体値31固定）
 *
 * ステータスポイント (SP): 各ステータス 0〜32 の範囲で振れる
 * (ゲーム内では合計66の制約があるが、本関数は単一ステータスのみを扱う)
 */

/** HP実数値: (2*base + 31 + SP*2) * 50/100 + 60 */
export function calcHP(base: number, sp: number): number {
  return Math.floor(((2 * base + 31 + sp * 2) * 50) / 100) + 60;
}

/** HP以外の実数値: floor((floor((2*base + 31 + SP*2) * 50/100) + 5) * nature) */
export function calcStat(base: number, sp: number, nature: number): number {
  return Math.floor(
    (Math.floor(((2 * base + 31 + sp * 2) * 50) / 100) + 5) * nature,
  );
}

/** 4段階の実数値を計算: [速(+性格32SP), 準(無性格32SP), 無(無性格0SP), 遅(-性格0SP)] */
export function calcActuals(
  key: string,
  base: number,
): [number, number, number, number] {
  if (key === 'H') {
    const max = calcHP(base, 32);
    const min = calcHP(base, 0);
    return [max, max, min, min];
  }
  return [
    calcStat(base, 32, 1.1),
    calcStat(base, 32, 1.0),
    calcStat(base, 0, 1.0),
    calcStat(base, 0, 0.9),
  ];
}
