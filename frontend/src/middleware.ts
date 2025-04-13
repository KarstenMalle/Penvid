import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Get auth status from localStorage (client-side only)
  const authCookie = request.cookies.get('auth')
  const authToken = request.cookies.get('auth_token')

  // Check if the route is protected
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/settings') ||
    request.nextUrl.pathname.startsWith('/profile')

  // If the route is protected and user is not authenticated, redirect to login
  if (isProtectedRoute && (!authCookie || !authToken)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If the user is authenticated and trying to access login/register page, redirect to dashboard
  const isAuthRoute =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register')

  if (isAuthRoute && authCookie && authToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/login',
    '/register',
  ],
}
