import { describe, it, expect, vi, afterEach } from 'vitest';
import { isOngoingNews } from './utils';
import { NewsItemJSON } from './types';

function createNewsItem(overrides: Partial<NewsItemJSON> = {}): NewsItemJSON {
  return {
    id: '1',
    reg: 0,
    title: 'test',
    infoTab: 0,
    infoKind: 0,
    kindTxt: 'test',
    banner: '',
    isImportant: 0,
    stAt: 0,
    endAt: '0',
    link: '',
    pubAt: 0,
    linkRom: [],
    ...overrides,
  };
}

describe('isOngoingNews', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when now is within stAt and endAt', () => {
    // 2025-06-15 00:00:00 UTC
    vi.setSystemTime(new Date('2025-06-15T00:00:00Z'));
    const item = createNewsItem({
      stAt: new Date('2025-06-01T00:00:00Z').getTime() / 1000,
      endAt: String(new Date('2025-06-30T00:00:00Z').getTime() / 1000),
    });
    expect(isOngoingNews(item)).toBe(true);
  });

  it('returns false when now is before stAt', () => {
    vi.setSystemTime(new Date('2025-05-31T00:00:00Z'));
    const item = createNewsItem({
      stAt: new Date('2025-06-01T00:00:00Z').getTime() / 1000,
      endAt: String(new Date('2025-06-30T00:00:00Z').getTime() / 1000),
    });
    expect(isOngoingNews(item)).toBe(false);
  });

  it('returns false when now is after endAt', () => {
    vi.setSystemTime(new Date('2025-07-01T00:00:00Z'));
    const item = createNewsItem({
      stAt: new Date('2025-06-01T00:00:00Z').getTime() / 1000,
      endAt: String(new Date('2025-06-30T00:00:00Z').getTime() / 1000),
    });
    expect(isOngoingNews(item)).toBe(false);
  });
});
