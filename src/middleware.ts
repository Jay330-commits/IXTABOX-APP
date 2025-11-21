import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// import { verifyToken } from './lib/jwt';

// Define protected routes
// const protectedRoutes = ['/customer', '/distributer', '/admin'];
// const authRoutes = ['/auth/login', '/auth/signup'];

export function middleware(request: NextRequest) {
  // const { pathname } = request.nextUrl;
  
  // TEMPORARILY DISABLED FOR TESTING - ENABLE THIS BEFORE PRODUCTION!
  return NextResponse.next();
  
  // Check if the route is protected
  // const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  // const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // Get token from cookies or Authorization header
  // const token = request.cookies.get('auth-token')?.value || 
  //               request.headers.get('authorization')?.replace('Bearer ', '');

  // If accessing protected route without token, redirect to login
  // if (isProtectedRoute && !token) {
  //   return NextResponse.redirect(new URL('/auth/login', request.url));
  // }

  // If accessing auth routes with valid token, redirect to appropriate dashboard
  // if (isAuthRoute && token) {
  //   const decoded = verifyToken(token);
  //   if (decoded) {
  //     const redirectPath = decoded.role === 'CUSTOMER' ? '/customer' : 
  //                         decoded.role === 'DISTRIBUTOR' ? '/distributer' : 
  //                         decoded.role === 'ADMIN' ? '/admin' : '/';
  //     return NextResponse.redirect(new URL(redirectPath, request.url));
  //   }
  // }

  // If accessing protected route with invalid token, redirect to login
  // if (isProtectedRoute && token) {
  //   const decoded = verifyToken(token);
  //   if (!decoded) {
  //     const response = NextResponse.redirect(new URL('/auth/login', request.url));
  //     response.cookies.delete('auth-token');
  //     return response;
  //   }
  // }

  // return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
