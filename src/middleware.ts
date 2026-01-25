import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const userToken = request.cookies.get('firebase-auth-token');
  const hasAdminToken = request.cookies.has('admin-auth');
  const { pathname } = request.nextUrl;

  // ===== Admin Auth Routes =====
  if (pathname.startsWith('/admin')) {
    const isAdminLoginRoute = pathname.startsWith('/admin/login');

    // If logged in, trying to access login page -> redirect to dashboard
    if (hasAdminToken && isAdminLoginRoute) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }

    // If not logged in, trying to access any admin page (except login) -> redirect to login
    if (!hasAdminToken && !isAdminLoginRoute) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    
    // Otherwise, allow access (logged in on dashboard, or not logged in on login page)
    return NextResponse.next();
  }


  // ===== User Auth Routes =====
  const authRoutes = ['/login', '/register', '/forgot-password', '/terms', '/help'];
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  const protectedRoutes = ['/home', '/my', '/order', '/rewards', '/buy'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (userToken && isAuthRoute) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  if (!userToken && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
