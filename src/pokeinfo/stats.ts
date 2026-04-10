/**
 * ポケモンのステータス実数値計算（Lv.50）
 */

/** HP実数値: (2*base + IV + EV/4) * Lv/100 + Lv + 10 */
export function calcHP(base: number, ev: number): number {
  return (
    Math.floor(((2 * base + 31 + Math.floor(ev / 4)) * 50) / 100) + 50 + 10
  );
}

/** HP以外の実数値: ((2*base + IV + EV/4) * Lv/100 + 5) * nature */
export function calcStat(base: number, ev: number, nature: number): number {
  return Math.floor(
    (Math.floor(((2 * base + 31 + Math.floor(ev / 4)) * 50) / 100) + 5) *
      nature,
  );
}

/** 4段階の実数値を計算: [速(+性格252EV), 準(無性格252EV), 無(無性格0EV), 遅(-性格0EV)] */
export function calcActuals(
  key: string,
  base: number,
): [number, number, number, number] {
  if (key === 'H') {
    const max = calcHP(base, 252);
    const min = calcHP(base, 0);
    return [max, max, min, min];
  }
  return [
    calcStat(base, 252, 1.1),
    calcStat(base, 252, 1.0),
    calcStat(base, 0, 1.0),
    calcStat(base, 0, 0.9),
  ];
}
