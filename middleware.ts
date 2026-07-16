import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isDevelopmentEnvironment } from './lib/constants';
import { getHomePathFromModules } from './lib/auth-home-path';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // PWA assets must be publicly accessible (no auth)
  if (
    pathname.startsWith('/favicon/') ||
    pathname === '/sw.js' ||
    pathname.startsWith('/workbox-') ||
    pathname.startsWith('/serwist-')
  ) {
    return NextResponse.next();
  }

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

  if (pathname === '/api/push/vapid-public-key') {
    return NextResponse.next();
  }

  // Cron jobs authenticate with CRON_SECRET inside the route handler
  if (pathname.startsWith('/api/cron/')) {
    return NextResponse.next();
  }

  // Public static assets (required for next/image upstream fallback on the landing page)
  if (pathname.startsWith('/images/')) {
    return NextResponse.next();
  }

  // Public short-link redirects (shared externally, e.g. over WhatsApp)
  if (pathname.startsWith('/s/')) {
    return NextResponse.next();
  }

  // Landing page — public; authenticated redirect is handled in app/page.tsx
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Allow access to login and register pages without authentication
  if (['/login', '/register', '/bla-login'].includes(pathname)) {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie: !isDevelopmentEnvironment,
    });

    if (token) {
      const sessionEpoch = process.env.AUTH_SESSION_EPOCH;
      if (sessionEpoch && token.iat) {
        const epochTimestamp = Number.parseInt(sessionEpoch, 10);
        if (!Number.isNaN(epochTimestamp) && token.iat < epochTimestamp) {
          return NextResponse.next();
        }
      }

      const modules = (token.modules as string[]) || [];
      const defaultLandingModule = token.defaultLandingModule as
        | string
        | undefined;

      return NextResponse.redirect(
        new URL(
          getHomePathFromModules(modules, defaultLandingModule),
          request.url,
        ),
      );
    }

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

  // Check for global session reset epoch
  // If AUTH_SESSION_EPOCH is set, invalidate all tokens issued before that time
  const sessionEpoch = process.env.AUTH_SESSION_EPOCH;
  if (sessionEpoch && token.iat) {
    const epochTimestamp = Number.parseInt(sessionEpoch, 10);
    if (!Number.isNaN(epochTimestamp) && token.iat < epochTimestamp) {
      const redirectUrl = encodeURIComponent(request.url);

      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${redirectUrl}`, request.url),
      );
    }
  }

  const modules = (token.modules as string[]) || [];

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

    // Allow back-office and operator users to access voter routes (for viewing voter profiles from search)
    if (moduleKey === 'voter') {
      const hasAccess =
        modules.includes('back-office') ||
        modules.includes('operator') ||
        modules.includes('user-management');
      if (hasAccess) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL('/unauthorized', request.url));
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
    '/bla-login',

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|favicon/|sw.js|workbox-|serwist-|sitemap.xml|robots.txt).*)',
  ],
};
