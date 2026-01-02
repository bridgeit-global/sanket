import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isDevelopmentEnvironment } from './lib/constants';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith('/ping')) {
    return new Response('pong', { status: 200 });
  }

  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Allow access to login and register pages without authentication
  if (['/login', '/register'].includes(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  if (!token) {
    const redirectUrl = encodeURIComponent(request.url);

    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${redirectUrl}`, request.url),
    );
  }

  if (token && ['/login', '/register'].includes(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Module-based access control
  const modules = (token.modules as string[]) || [];
  const defaultLandingModule = token.defaultLandingModule as string | undefined;

  // Root path - redirect to default landing module or first available module
  if (pathname === '/') {
    if (modules.length > 0) {
      // Check if default landing module exists and is accessible
      if (defaultLandingModule && modules.includes(defaultLandingModule)) {
        return NextResponse.redirect(
          new URL(`/modules/${defaultLandingModule}`, request.url),
        );
      }
      // Fall back to first module
      const firstModule = modules[0];
      return NextResponse.redirect(new URL(`/modules/${firstModule}`, request.url));
    }
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  // Base /chat path without ID - redirect to modules/chat
  if (pathname === '/chat') {
    return NextResponse.redirect(new URL('/modules/chat', request.url));
  }

  // /chat/{id} paths - allow through (handled by Next.js route)

  // Module routes - simple token-based check
  if (pathname.startsWith('/modules/')) {
    const moduleKey = pathname.replace('/modules/', '').split('/')[0];

    // Profile is accessible to all authenticated users
    if (moduleKey === 'profile') {
      return NextResponse.next();
    }

    // Allow back-office users to access voter routes (for viewing voter profiles from search)
    if (moduleKey === 'voter' && modules.includes('back-office')) {
      return NextResponse.next();
    }

    if (!modules.includes(moduleKey)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/chat/:id',
    '/api/:path*',
    '/login',
    '/register',

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
