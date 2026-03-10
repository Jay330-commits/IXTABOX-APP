import { NextRequest, NextResponse } from 'next/server';

const IXTAOWNER_ENABLED = process.env.NEXT_PUBLIC_IXTAOWNER_ENABLED === 'true';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // IXTAowner: redirect to home when feature is disabled
  if (pathname.startsWith('/ixtaowner') && !IXTAOWNER_ENABLED) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
