import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('firebase-auth-token');
  const { pathname } = request.nextUrl;

  const authRoutes = ['/login', '/register', '/forgot-password', '/terms', '/help'];
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  const protectedRoutes = ['/home', '/my', '/order', '/rewards', '/buy'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  if (!token && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
