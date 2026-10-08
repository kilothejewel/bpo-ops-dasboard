import crypto from 'crypto';
import { UserSession } from './types';
import { MOCK_USERS } from './auth-constants';

/**
 * Session issuance & verification.
 *
 * Identity is modeled as a small set of named demo personas (see
 * auth-constants.ts: an Operations Director with management access, and a
 * few per-campaign leads with standard/restricted access) — this keeps the
 * "who am I" story realistic and demo-able (interviewer can plausibly
 * "log in as Marcus Vance, FinTechCare Lead") while keeping the security
 * property that actually matters for this project: once issued, a session
 * cannot be forged or escalated by editing a URL, query string, or cookie
 * value by hand.
 *
 * How that property holds:
 *   - Sessions are HMAC-signed. Tampering with the payload invalidates the
 *     signature (verified with a timing-safe comparison).
 *   - The cookie is httpOnly, so page JS can't read or rewrite it.
 *   - On every verification, the userId embedded in the token is
 *     re-resolved against MOCK_USERS rather than trusting the embedded
 *     role/campaignId verbatim — if a persona's assignment changed (or was
 *     removed) server-side, a stale-but-signature-valid token can't grant
 *     stale permissions.
 *
 * CAVEAT — this is still not real authentication: createSessionToken()
 * issues a token for whichever persona ID is requested, with no password or
 * credential check. That's an intentional, honest simplification for a demo
 * project with no user-management system. In production (per this
 * project's own README Azure mapping), /api/session would sit behind Azure
 * AD (Microsoft Entra ID) SSO, and role/campaignId would be derived from
 * verified AD claims — never from an unauthenticated request body.
 */

const DEV_FALLBACK_SECRET = 'dev-only-insecure-secret-change-me-before-any-real-deployment';
const MIN_SECRET_LENGTH = 32;

export class SessionConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionConfigError';
  }
}

/**
 * Resolved per call (not at module load) so `next build`, which runs with
 * NODE_ENV=production, can still import this module without a secret.
 * In production a missing or short secret is a hard error: the dev
 * fallback is public, so signing with it would let anyone forge a session.
 */
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret.length < MIN_SECRET_LENGTH) {
      throw new SessionConfigError(
        `SESSION_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters in production`
      );
    }
    return secret;
  }
  return secret || DEV_FALLBACK_SECRET;
}
const SESSION_COOKIE_NAME = 'bpo_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

interface SessionPayload {
  userId: string;
  exp: number; // unix seconds
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

/**
 * Issues a signed session token for a known persona ID (see MOCK_USERS).
 * Returns null if the persona ID doesn't exist — callers must treat that as
 * a rejected login attempt (400), not fall back to any default identity.
 */
export function createSessionToken(userId: string): string | null {
  const user = MOCK_USERS[userId];
  if (!user) return null;

  const payload: SessionPayload = {
    userId: user.id,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

/**
 * Verifies and decodes a session token, re-resolving it against the current
 * MOCK_USERS table (not trusting anything beyond the userId from the token
 * itself).
 *
 * Returns null for anything invalid: missing, malformed, expired, bad
 * signature, or an unknown/removed userId. Callers MUST treat null as "no
 * valid session" and fail closed (deny / 401) — never default to a role.
 */
export function verifySessionToken(token: string | undefined | null): UserSession | null {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;

  const expectedSignature = sign(encoded);
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  try {
    const payload: SessionPayload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));

    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // expired
    }

    const user = MOCK_USERS[payload.userId];
    if (!user) return null; // persona removed/renamed since token issuance

    return {
      userId: user.id,
      userName: user.name,
      role: user.role,
      campaignId: user.role === 'standard' ? user.campaignId : undefined,
    };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS };
