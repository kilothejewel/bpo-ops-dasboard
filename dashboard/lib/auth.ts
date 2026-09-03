/**
 * @deprecated Superseded by lib/session.ts.
 *
 * This file originally resolved identity from an UNSIGNED value — a
 * request header, cookie, or query param whose value was looked up
 * directly against MOCK_USERS. That means anyone who could see the source
 * (or just guess a persona ID like 'mgmt-exec') could set
 * `?userId=mgmt-exec` and get management access — the same class of bug
 * (client-supplied identity trusted as-is) that this project's RBAC review
 * was meant to fix, just moved to a different parameter name.
 *
 * lib/session.ts replaces this with HMAC-signed, httpOnly session cookies:
 * identity still resolves to one of the MOCK_USERS personas, but a client
 * can no longer forge or escalate a session by editing a URL, header, or
 * cookie value — tampering invalidates the signature.
 *
 * This file is kept only so a stale import fails loudly at build time
 * rather than silently reintroducing the vulnerability. Import from
 * lib/session.ts instead: createSessionToken(userId), verifySessionToken(token).
 */

export function resolveAuthenticatedSession(): never {
  throw new Error(
    'lib/auth.ts is deprecated and insecure (unsigned identity resolution). ' +
      'Use verifySessionToken() from lib/session.ts instead.'
  );
}
