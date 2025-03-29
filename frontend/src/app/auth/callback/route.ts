import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    await supabase.auth.exchangeCodeForSession(code)

    // Redirect to appropriate page based on auth action
    const action = requestUrl.searchParams.get('action')

    if (action === 'password_reset') {
      // Redirect to reset password page
      return NextResponse.redirect(new URL('/reset-password', request.url))
    }

    // Default redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Something went wrong, redirect to login page
  return NextResponse.redirect(new URL('/login', request.url))
}
