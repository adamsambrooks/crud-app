import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get(AUTH_COOKIE);
  const { pathname } = request.nextUrl;

  // Redirect to login if not authenticated and trying to access protected routes
  if ((pathname.startsWith('/dashboard') || pathname.startsWith('/employees-table')) && !authToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to dashboard if authenticated and trying to access login
  if (pathname === '/login' && authToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/employees-table/:path*', '/login'],
};
