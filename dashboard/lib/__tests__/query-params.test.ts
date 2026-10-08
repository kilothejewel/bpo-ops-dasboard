import { describe, expect, it } from 'vitest';
import { parseDashboardQuery } from '@/lib/query-params';

const parse = (qs: string) => parseDashboardQuery(new URLSearchParams(qs));

describe('parseDashboardQuery', () => {
  it('applies defaults', () => {
    expect(parse('')).toEqual({
      ok: true,
      value: { campaignId: 'ALL', channel: 'ALL', sort: 'opened_desc', page: 1, range: 'all', search: '', week: null },
    });
  });

  it('accepts valid values', () => {
    const r = parse('campaignId=CMP-104&channel=email&sort=csat_asc&page=3&range=last4&search=%20Ava%20&week=2026-W30');
    expect(r).toEqual({
      ok: true,
      value: {
        campaignId: 'CMP-104',
        channel: 'email',
        sort: 'csat_asc',
        page: 3,
        range: 'last4',
        search: 'Ava',
        week: '2026-W30',
      },
    });
  });

  it.each([
    ['campaignId=CMP-1', 'Invalid campaignId'],
    ["campaignId=CMP-101' OR 1=1--", 'Invalid campaignId'],
    ['channel=fax', 'Invalid channel'],
    ['sort=1;DROP TABLE x', 'Invalid sort'],
    ['range=ytd', 'Invalid range'],
    ['week=W30', 'Invalid week'],
    ['week=2026-W30;--', 'Invalid week'],
    [`search=${'a'.repeat(65)}`, 'Search term too long'],
  ])('rejects %s', (qs, error) => {
    expect(parse(qs)).toEqual({ ok: false, error });
  });

  it('clamps bad page numbers to 1', () => {
    for (const p of ['0', '-4', 'abc']) {
      const r = parse(`page=${p}`);
      expect(r.ok && r.value.page).toBe(1);
    }
  });
});
