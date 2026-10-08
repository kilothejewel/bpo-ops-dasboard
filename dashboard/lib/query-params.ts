import { InteractionSort } from './types';

/**
 * Validation for client-supplied query params. These only ever NARROW a
 * query within the session's already-verified access scope (see
 * getEnforcedCampaignFilter in data-access.ts, which ignores a requested
 * campaignId entirely for role === 'standard'). They are still checked
 * against an allowlist/pattern so malformed input fails loudly (400)
 * instead of silently returning an empty result set.
 */

export const ALLOWED_CHANNELS = new Set(['ALL', 'phone', 'email', 'ticket', 'chat']);
export const ALLOWED_SORTS = new Set<InteractionSort>([
  'opened_desc',
  'opened_asc',
  'delay_asc',
  'delay_desc',
  'csat_desc',
  'csat_asc',
]);
// CMP-101 style campaign IDs, or the literal 'ALL' sentinel.
export const CAMPAIGN_ID_PATTERN = /^(ALL|CMP-\d{3,})$/;

export interface DashboardQuery {
  campaignId: string;
  channel: string;
  sort: InteractionSort;
  page: number;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseDashboardQuery(searchParams: URLSearchParams): ParseResult<DashboardQuery> {
  const campaignId = searchParams.get('campaignId') || 'ALL';
  const channel = searchParams.get('channel') || 'ALL';
  const sort = (searchParams.get('sort') || 'opened_desc') as InteractionSort;
  const pageParam = Number.parseInt(searchParams.get('page') || '1', 10);

  if (!CAMPAIGN_ID_PATTERN.test(campaignId)) return { ok: false, error: 'Invalid campaignId' };
  if (!ALLOWED_CHANNELS.has(channel)) return { ok: false, error: 'Invalid channel' };
  if (!ALLOWED_SORTS.has(sort)) return { ok: false, error: 'Invalid sort' };
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  return { ok: true, value: { campaignId, channel, sort, page } };
}
