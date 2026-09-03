import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/session';
import { MOCK_USERS } from '@/lib/auth-constants';
import { UserRole } from '@/lib/types';

/**
 * Demo "login" endpoint.
 *
 * IMPORTANT: this does NOT verify any credentials — it accepts a role and
 * campaignId directly from the request body, same as the old query-param
 * approach did. What it fixes is narrower but real: it moves the trust
 * boundary to a single, explicit, signed-cookie-issuing endpoint, so that
 * every OTHER route (in particular /api/dashboard, which touches real data)
 * can trust the session instead of re-trusting client input on every call.
 * A client can no longer escalate role by hand-editing a URL or query
 * string against the data endpoints.
 *
 * In a production deployment, this endpoint would sit behind real
 * authentication (Azure AD SSO, per this project's own Azure target
 * architecture in the README) and would derive role/campaignId from the
 * verified identity's claims — never from an unauthenticated request body.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  let userId = typeof body?.userId === 'string' ? body.userId : '';
  if (!userId) {
    if (body?.role === 'management') {
      userId = 'mgmt-exec';
    } else {
      const cId = body?.campaignId || 'CMP-101';
      userId = cId === 'CMP-102' ? 'lead-cmp102' : cId === 'CMP-103' ? 'lead-cmp103' : cId === 'CMP-104' ? 'lead-cmp104' : 'lead-cmp101';
    }
  }

  const token = createSessionToken(userId);
  if (!token) {
    return NextResponse.json({ error: 'Invalid persona' }, { status: 400 });
  }

  const user = MOCK_USERS[userId];
  const response = NextResponse.json({ 
    userId: user.id,
    userName: user.name,
    role: user.role, 
    campaignId: user.campaignId 
  });

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  });
  return response;
}
