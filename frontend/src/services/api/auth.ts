// frontend/src/services/api/auth.ts
import { createClient } from '@/lib/supabase-browser'

/**
 * Get authentication token from Supabase
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || null
  } catch (error) {
    console.error('Error getting auth token:', error)
    return null
  }
}
