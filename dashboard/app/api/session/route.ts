import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, verifySessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/session';
import { getAvailableMockUsers } from '@/lib/auth-constants';

/**
 * Demo "login" endpoint.
 *
 * IMPORTANT: this does NOT verify any credentials — it issues a signed
 * session for whichever known persona ID (see auth-constants.ts) is
 * requested. What it fixes is narrower but real: once issued, the resulting
 * session cannot be forged or escalated by editing a URL, header, or cookie
 * value by hand (see lib/session.ts for how the signature/re-resolution
 * works). Every other route (in particular /api/dashboard, which touches
 * real data) trusts this session instead of re-trusting client input on
 * every call.
 *
 * In a production deployment this endpoint would sit behind real
 * authentication (Azure AD SSO, per this project's own Azure target
 * architecture in the README), and would derive the persona/role from the
 * verified identity's claims — never from an unauthenticated request body.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === 'string' ? body.userId : '';

  const token = createSessionToken(userId);
  if (!token) {
    return NextResponse.json({ error: 'Unknown persona' }, { status: 400 });
  }

  // Re-derive the canonical session from the token we just issued, rather
  // than trusting the request body, so the client's UI state is always in
  // sync with what the server will actually enforce.
  const session = verifySessionToken(token);

  const response = NextResponse.json({ session });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  });
  return response;
}

/**
 * Returns the public-safe list of demo personas the UI can offer to
 * "log in as". This is demo data (names/titles/campaign assignments), not
 * sensitive — it's the same information already visible in
 * lib/auth-constants.ts source.
 */
export async function GET() {
  return NextResponse.json({ personas: getAvailableMockUsers() });
}
