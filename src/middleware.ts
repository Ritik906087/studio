
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const adminPhone = request.cookies.get('admin-phone');
  const { pathname } = request.nextUrl;
  const supabaseAuthCookie = request.cookies.get(
    `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('.')[0].split('//')[1]}-auth-token`
  );

  // ===== Admin Auth Routes =====
  if (pathname.startsWith('/admin')) {
    const isAdminLoginRoute = pathname.startsWith('/admin/login');

    // If logged in, trying to access login page -> redirect to dashboard
    if (adminPhone && isAdminLoginRoute) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }

    // If not logged in, trying to access any admin page (except login) -> redirect to login
    if (!adminPhone && !isAdminLoginRoute) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    
    // Otherwise, allow access (logged in on dashboard, or not logged in on login page)
    return NextResponse.next();
  }


  // ===== User Auth Routes =====
  const authRoutes = ['/login', '/register', '/forgot-password', '/terms'];
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  const protectedRoutes = ['/home', '/my', '/order', '/rewards', '/buy', '/sell'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (supabaseAuthCookie && isAuthRoute) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  if (!supabaseAuthCookie && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
