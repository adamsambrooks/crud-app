import { NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json(
    { success: true, message: 'Successfully logged out' },
    { status: 200 }
  );

  // Clear the authentication cookie
  response.cookies.delete(AUTH_COOKIE);

  return response;
}
