import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Update the Supabase auth session
  const response = await updateSession(request)

  // Get the current request path
  const path = request.nextUrl.pathname

  // List of auth routes that should have no navbar and require no auth
  const authRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/auth/callback',
  ]

  // List of protected routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/settings',
    '/profile',
    '/accounts',
    '/transactions',
    '/goals',
  ]

  // Check if this is an auth route
  const isAuthRoute = authRoutes.some((route) => path === route)

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route)
  )

  // Get cookies to check auth status
  const supabaseSession = request.cookies.get('sb-session')
  const isLoggedIn = !!supabaseSession?.value

  // Check if this is a server-side process
  const isServerSideProcess = path.startsWith('/api') || path.includes('_next')

  // Only apply redirects for non-server-side processes
  if (!isServerSideProcess) {
    // Redirect if trying to access protected routes while not logged in
    if (isProtectedRoute && !isLoggedIn) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('from', path)
      return NextResponse.redirect(redirectUrl)
    }

    // Redirect to dashboard if trying to access auth routes while logged in
    if (isAuthRoute && isLoggedIn) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Set headers to let the layout know if it should show the navbar
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-auth-route', isAuthRoute.toString())

  // Return the response with the new headers
  const updatedResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Make sure to preserve cookies and headers from the supabase middleware
  response.headers.forEach((value, key) => {
    if (!updatedResponse.headers.has(key)) {
      updatedResponse.headers.set(key, value)
    }
  })

  return updatedResponse
}

// Only run middleware on these routes
export const config = {
  matcher: [
    // Match all routes except static files, api routes, and _next
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
