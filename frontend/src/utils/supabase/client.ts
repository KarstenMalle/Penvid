import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

// Consistent cookie name for Supabase auth
const SUPABASE_AUTH_COOKIE = 'sb-auth-token'

// Create a single, properly configured Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Always persist session in cookies for server access
    persistSession: true,
    // Define exactly what cookie name to use
    storageKey: SUPABASE_AUTH_COOKIE,
    // Set cookie as the preferred storage method
    storage: {
      getItem: (key) => {
        // For client side, read from cookies
        if (typeof document !== 'undefined') {
          const value = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${key}=`))
            ?.split('=')[1]

          return value ? decodeURIComponent(value) : null
        }
        return null
      },
      setItem: (key, value) => {
        // For client side, set a cookie with proper attributes
        if (typeof document !== 'undefined') {
          // Set secure cookie with SameSite=Lax for 30 days
          document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=2592000; SameSite=Lax; Secure`
        }
      },
      removeItem: (key) => {
        // For client side, expire the cookie
        if (typeof document !== 'undefined') {
          document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`
        }
      },
    },
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
