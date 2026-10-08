import crypto from 'crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSessionToken, verifySessionToken, SessionConfigError } from '@/lib/session';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

function forge(payload: object, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

describe('session tokens', () => {
  it('round-trips a known persona and re-resolves role from the server table', () => {
    const token = createSessionToken('lead-cmp102');
    expect(token).not.toBeNull();
    expect(verifySessionToken(token)).toEqual({
      userId: 'lead-cmp102',
      userName: 'Elena Rostova',
      role: 'standard',
      campaignId: 'CMP-102',
    });
  });

  it('refuses to issue a token for an unknown persona', () => {
    expect(createSessionToken('not-a-user')).toBeNull();
  });

  it('rejects missing, malformed and tampered tokens', () => {
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken('')).toBeNull();
    expect(verifySessionToken('abc')).toBeNull();
    expect(verifySessionToken('a.b.c')).toBeNull();

    const token = createSessionToken('lead-cmp101')!;
    const [, sig] = token.split('.');
    const escalated = Buffer.from(JSON.stringify({ userId: 'mgmt-exec', exp: 9999999999 })).toString('base64url');
    expect(verifySessionToken(`${escalated}.${sig}`)).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    expect(verifySessionToken(forge({ userId: 'mgmt-exec', exp: 9999999999 }, 'attacker-secret'))).toBeNull();
  });

  it('rejects expired tokens', () => {
    const token = createSessionToken('mgmt-exec');
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 9 * 60 * 60 * 1000); // past the 8h max age
    expect(verifySessionToken(token)).toBeNull();
  });

  it('rejects a validly signed token for a persona that no longer exists', () => {
    const secret = 'dev-only-insecure-secret-change-me-before-any-real-deployment';
    expect(verifySessionToken(forge({ userId: 'removed-user', exp: 9999999999 }, secret))).toBeNull();
  });

  describe('in production', () => {
    it('refuses to sign without SESSION_SECRET', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('SESSION_SECRET', '');
      expect(() => createSessionToken('mgmt-exec')).toThrow(SessionConfigError);
    });

    it('refuses a short SESSION_SECRET', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('SESSION_SECRET', 'too-short');
      expect(() => createSessionToken('mgmt-exec')).toThrow(SessionConfigError);
    });

    it('signs with a strong SESSION_SECRET and does not accept dev-secret tokens', () => {
      const devToken = createSessionToken('mgmt-exec');
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('SESSION_SECRET', 'x'.repeat(48));
      const prodToken = createSessionToken('mgmt-exec');
      expect(verifySessionToken(prodToken)?.role).toBe('management');
      expect(verifySessionToken(devToken)).toBeNull();
    });
  });
});
