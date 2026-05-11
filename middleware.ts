import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Admin dashboard requires a login session, then /api/admin/college checks college ownership
    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login') && !pathname.startsWith('/admin/setup')) {
      if (!token) {
        return NextResponse.redirect(new URL('/admin/login', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;
        // Always allow: auth endpoints, login pages, public APIs
        const publicPaths = ['/api/auth', '/login', '/admin/login', '/admin/setup', '/api/colleges', '/api/settings'];
        if (publicPaths.some(p => pathname.startsWith(p))) return true;
        // Student onboard needs auth
        if (pathname === '/onboard') return !!token;
        // Admin routes need auth
        if (pathname.startsWith('/admin')) return !!token;
        // Student attendance page needs auth
        if (pathname === '/') return !!token;
        // API routes need auth (except public ones above)
        if (pathname.startsWith('/api/')) return !!token;
        return true;
      },
    },
  }
);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.webp|.*\\.png|.*\\.jpg|.*\\.svg).*)'],
};
