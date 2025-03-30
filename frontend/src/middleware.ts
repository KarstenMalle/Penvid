import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Get response object
  let response = NextResponse.next()

  // Skip asset routes
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.includes('/api/') ||
    request.nextUrl.pathname.match(/\.(ico|png|jpg|svg)$/)
  ) {
    return response
  }

  // Define routes that require auth
  const protectedRoutes = ['/dashboard', '/settings', '/profile']
  const authRoutes = ['/login', '/register', '/forgot-password']

  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some(
    (route) => request.nextUrl.pathname === route
  )

  // Skip routes that don't need auth checking
  if (!isProtectedRoute && !isAuthRoute) {
    return response
  }

  // Create server-side supabase client for auth check
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.delete({
            name,
            ...options,
          })
          response.cookies.delete({
            name,
            ...options,
          })
        },
      },
    }
  )

  try {
    // Get session from supabase
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const isAuthenticated = !!session

    console.log(
      `Middleware Auth Check: Path=${request.nextUrl.pathname}, Auth=${isAuthenticated ? 'Yes' : 'No'}`
    )

    // Handle protected routes
    if (isProtectedRoute && !isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Handle auth routes - redirect to dashboard if already authenticated
    if (isAuthRoute && isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Continue with the request
    return response
  } catch (error) {
    console.error('Middleware auth error:', error)

    // If error occurs on protected route, redirect to login
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Otherwise continue
    return response
  }
}

// Configure which paths middleware will run on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)'],
}
