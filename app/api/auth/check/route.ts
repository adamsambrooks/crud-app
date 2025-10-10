import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const authToken = request.cookies.get(AUTH_COOKIE);

  return NextResponse.json({
    isAuthenticated: !!authToken,
  });
}
