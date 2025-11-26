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

  // Admin-only routes - require user-management or admin module
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!modules.includes('user-management') && !modules.includes('admin')) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Operator-only routes - require operator module
  if (pathname.startsWith('/operator') || pathname.startsWith('/api/operator')) {
    if (!modules.includes('operator')) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Back-office-only routes - require back-office module
  if (pathname.startsWith('/back-office')) {
    if (!modules.includes('back-office')) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Regular chat interface - require chat module
  if (pathname === '/' || pathname.startsWith('/chat')) {
    if (!modules.includes('chat')) {
      // Redirect to appropriate module based on available modules
      if (modules.includes('operator')) {
        return NextResponse.redirect(new URL('/operator', request.url));
      }
      if (modules.includes('back-office')) {
        return NextResponse.redirect(new URL('/back-office', request.url));
      }
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Module routes - check module permissions
  if (pathname.startsWith('/modules/')) {
    // Extract module key from path
    const moduleKey = pathname.replace('/modules/', '').split('/')[0];
    
    // User management requires user-management module
    if (moduleKey === 'user-management') {
      if (!modules.includes('user-management') && !modules.includes('admin')) {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
      return NextResponse.next();
    }

    // Profile is accessible to all authenticated users
    if (moduleKey === 'profile') {
      return NextResponse.next();
    }

    // Voter profiles are accessible to users with voter, operator, or back-office modules
    if (moduleKey === 'voter') {
      if (!modules.includes('voter') && !modules.includes('operator') && !modules.includes('back-office')) {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
      return NextResponse.next();
    }

    // Check if user has access to this module
    if (!modules.includes(moduleKey)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Backward compatibility redirects
  if (pathname === '/admin') {
    return NextResponse.redirect(new URL('/modules/chat', request.url));
  }
  if (pathname === '/operator') {
    return NextResponse.redirect(new URL('/modules/operator', request.url));
  }
  if (pathname === '/back-office') {
    return NextResponse.redirect(new URL('/modules/back-office', request.url));
  }
  if (pathname === '/calendar') {
    return NextResponse.redirect(new URL('/modules/daily-programme', request.url));
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
