import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Core middleware function
export async function middleware(request: NextRequest) {
  // Get the current path
  const path = request.nextUrl.pathname

  // Skip processing static assets and API routes
  if (
    path.includes('/_next/') ||
    path.includes('/api/') ||
    path.includes('favicon') ||
    path.endsWith('.svg') ||
    path.endsWith('.png') ||
    path.endsWith('.jpg')
  ) {
    return NextResponse.next()
  }

  // Define routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/settings',
    '/profile',
    '/accounts',
    '/transactions',
    '/goals',
  ]

  // Define authentication routes that should redirect to dashboard if logged in
  const authRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
  ]

  // Check if current path is protected or auth route
  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route)
  )
  const isAuthRoute = authRoutes.some((route) => path === route)

  // If it's not a protected or auth route, skip further processing
  if (!isProtectedRoute && !isAuthRoute) {
    return NextResponse.next()
  }

  // Prepare response object for cookie manipulation
  let response = NextResponse.next()

  try {
    // Create server client with cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return request.cookies.get(name)?.value
          },
          set(name, value, options) {
            // Set cookie in request for current middleware chain
            request.cookies.set({
              name,
              value,
              ...options,
            })

            // Set cookie in response for next request
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name, options) {
            // Remove cookie from request
            request.cookies.set({
              name,
              value: '',
              ...options,
            })

            // Remove cookie from response
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // Check for active session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Determine if user is authenticated
    const isAuthenticated = !!session

    console.log(
      `Middleware: Path=${path}, Auth=${isAuthenticated ? 'Yes' : 'No'}`
    )

    // For protected routes, redirect to login if not authenticated
    if (isProtectedRoute && !isAuthenticated) {
      console.log(`Redirecting to login from protected route: ${path}`)
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // For auth routes, redirect to dashboard if authenticated
    if (isAuthRoute && isAuthenticated) {
      console.log(`Redirecting to dashboard from auth route: ${path}`)
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Add auth state to headers for components to use
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set(
      'x-auth-state',
      isAuthenticated ? 'authenticated' : 'unauthenticated'
    )

    // Return response with updated headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch (error) {
    console.error('Middleware error:', error)

    // On error with protected route, redirect to login as a precaution
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Otherwise just continue
    return NextResponse.next()
  }
}

// Run middleware on all routes
export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
