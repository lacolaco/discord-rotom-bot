import { NewsItemJSON } from './types';

/**
 * ニュースの開始日時 (stAt) と終了日時 (stAt + newAt) が現在時刻 (now) に含まれているかどうかを判定する
 * @param item
 * @returns
 */
export function isOngoingNews(item: NewsItemJSON) {
  const now = Date.now();
  const startAt = parseInt(item.stAt, 10) * 1000; // convert to milliseconds
  const endAt = startAt + parseInt(item.newAt, 10) * 1000; // convert to milliseconds
  return startAt <= now && now <= endAt;
}
