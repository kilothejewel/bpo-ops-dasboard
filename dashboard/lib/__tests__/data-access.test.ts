import { describe, expect, it } from 'vitest';
import { getEnforcedCampaignFilter, MissingCampaignAccessError } from '@/lib/data-access';

describe('getEnforcedCampaignFilter (RBAC query shaping)', () => {
  it('pins a standard session to its own campaign, ignoring the request', () => {
    const session = { role: 'standard' as const, campaignId: 'CMP-101' };
    expect(getEnforcedCampaignFilter(session, 'CMP-102')).toBe('CMP-101');
    expect(getEnforcedCampaignFilter(session, 'ALL')).toBe('CMP-101');
    expect(getEnforcedCampaignFilter(session)).toBe('CMP-101');
  });

  it('fails closed for a standard session with no campaign', () => {
    expect(() => getEnforcedCampaignFilter({ role: 'standard' }, 'CMP-101')).toThrow(MissingCampaignAccessError);
  });

  it('lets management drill into one campaign or see all', () => {
    const session = { role: 'management' as const };
    expect(getEnforcedCampaignFilter(session, 'CMP-103')).toBe('CMP-103');
    expect(getEnforcedCampaignFilter(session, 'ALL')).toBeNull();
    expect(getEnforcedCampaignFilter(session)).toBeNull();
  });
});
