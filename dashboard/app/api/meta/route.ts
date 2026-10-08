import { NextRequest, NextResponse } from 'next/server';
import nextPackage from 'next/package.json';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session';
import { readDbtStatus } from '@/lib/dbt-status';

/** Build/pipeline metadata for the status strip and footer. */
export async function GET(request: NextRequest) {
  if (!verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return NextResponse.json({
    nextVersion: nextPackage.version,
    dbt: await readDbtStatus(),
  });
}
