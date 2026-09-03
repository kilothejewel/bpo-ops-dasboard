import { MockUserProfile } from './types';

export const MOCK_USERS: Record<string, MockUserProfile> = {
  'mgmt-exec': {
    id: 'mgmt-exec',
    name: 'Sarah Chen',
    title: 'Operations Director',
    role: 'management',
  },
  'lead-cmp101': {
    id: 'lead-cmp101',
    name: 'Marcus Vance',
    title: 'FinTechCare Lead',
    role: 'standard',
    campaignId: 'CMP-101',
    campaignName: 'FinTechCare (Apex Financial Services)',
  },
  'lead-cmp102': {
    id: 'lead-cmp102',
    name: 'Elena Rostova',
    title: 'HealthLine Team Lead',
    role: 'standard',
    campaignId: 'CMP-102',
    campaignName: 'HealthLine (BioHealth Systems)',
  },
  'lead-cmp103': {
    id: 'lead-cmp103',
    name: 'James Thornton',
    title: 'RetailPulse Supervisor',
    role: 'standard',
    campaignId: 'CMP-103',
    campaignName: 'RetailPulse (Omnichannel Retail Co)',
  },
  'lead-cmp104': {
    id: 'lead-cmp104',
    name: 'Aisha Patel',
    title: 'TechAssist Specialist',
    role: 'standard',
    campaignId: 'CMP-104',
    campaignName: 'TechAssist (CloudScale SaaS)',
  },
};

export const DEFAULT_MOCK_USER_ID = 'mgmt-exec';

export function getAvailableMockUsers(): MockUserProfile[] {
  return Object.values(MOCK_USERS);
}
