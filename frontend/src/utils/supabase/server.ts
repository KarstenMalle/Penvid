import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(
          name: string,
          value: string,
          options: {
            path: string
            maxAge: number
            sameSite: 'lax' | 'strict' | 'none'
            domain?: string
            secure?: boolean
          }
        ) {
          cookieStore.set({ name, value, ...options })
        },
        remove(
          name: string,
          options: {
            path: string
            sameSite: 'lax' | 'strict' | 'none'
            domain?: string
            secure?: boolean
          }
        ) {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )
}
