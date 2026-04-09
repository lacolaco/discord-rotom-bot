import { NewsItemJSON } from './types';

/**
 * ニュースの開始日時 (stAt) と終了日時 (endAt) が現在時刻 (now) に含まれているかどうかを判定する
 * @param item
 * @returns
 */
export function isOngoingNews(item: NewsItemJSON) {
  const now = Date.now();
  const startAt = item.stAt * 1000;
  const endAt = parseInt(item.endAt, 10) * 1000;
  return startAt <= now && now <= endAt;
}
