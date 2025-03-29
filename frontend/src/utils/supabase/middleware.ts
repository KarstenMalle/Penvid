import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/supabase'

export async function updateSession(request: NextRequest) {
  console.log('Supabase middleware updateSession executing...')

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = request.cookies.get(name)
          console.log(
            `Supabase middleware: getting cookie ${name}: ${cookie ? 'found' : 'not found'}`
          )
          return cookie?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          console.log(`Supabase middleware: setting cookie ${name}`)

          // First set the cookie in the request
          request.cookies.set({
            name,
            value,
            ...options,
          })

          // Then ensure the response is updated
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })

          // Set the cookie in the response
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          console.log(`Supabase middleware: removing cookie ${name}`)

          // First update the request
          request.cookies.set({
            name,
            value: '',
            ...options,
          })

          // Then ensure the response is updated
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })

          // Set the expired cookie in the response
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  )

  // Check and log session status
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Supabase middleware: Error getting session:', error)
    } else {
      console.log(
        `Supabase middleware: Session check: ${data.session ? 'authenticated' : 'not authenticated'}`
      )
    }
  } catch (err) {
    console.error('Supabase middleware: Exception checking session:', err)
  }

  return response
}
