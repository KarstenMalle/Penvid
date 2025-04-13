import { Cookies } from 'next/headers'
import { cookies } from 'next/headers'

export const AUTH_COOKIE_NAME = 'auth'
export const AUTH_TOKEN_COOKIE_NAME = 'auth_token'
export const USER_ID_COOKIE_NAME = 'user_id'
export const USER_EMAIL_COOKIE_NAME = 'user_email'

// Cookie options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60, // 30 days
}

// Set auth cookies
export function setAuthCookies(
  token: string,
  userId: string,
  userEmail: string,
  cookieStore = cookies()
) {
  cookieStore.set(AUTH_COOKIE_NAME, 'true', cookieOptions)
  cookieStore.set(AUTH_TOKEN_COOKIE_NAME, token, cookieOptions)
  cookieStore.set(USER_ID_COOKIE_NAME, userId, cookieOptions)
  cookieStore.set(USER_EMAIL_COOKIE_NAME, userEmail, cookieOptions)

  // Also set in localStorage for client-side access
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_COOKIE_NAME, 'true')
    localStorage.setItem(AUTH_TOKEN_COOKIE_NAME, token)
    localStorage.setItem(USER_ID_COOKIE_NAME, userId)
    localStorage.setItem(USER_EMAIL_COOKIE_NAME, userEmail)
  }
}

// Remove auth cookies
export function removeAuthCookies(cookieStore = cookies()) {
  cookieStore.delete(AUTH_COOKIE_NAME)
  cookieStore.delete(AUTH_TOKEN_COOKIE_NAME)
  cookieStore.delete(USER_ID_COOKIE_NAME)
  cookieStore.delete(USER_EMAIL_COOKIE_NAME)

  // Also remove from localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_COOKIE_NAME)
    localStorage.removeItem(AUTH_TOKEN_COOKIE_NAME)
    localStorage.removeItem(USER_ID_COOKIE_NAME)
    localStorage.removeItem(USER_EMAIL_COOKIE_NAME)
  }
}

// Check if auth cookies exist
export function checkAuthCookies(cookieStore = cookies()): boolean {
  return Boolean(
    cookieStore.get(AUTH_COOKIE_NAME) && cookieStore.get(AUTH_TOKEN_COOKIE_NAME)
  )
}

// Get auth token from cookies
export function getAuthToken(cookieStore = cookies()): string | null {
  return cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value || null
}

// Get user ID from cookies
export function getUserId(cookieStore = cookies()): string | null {
  return cookieStore.get(USER_ID_COOKIE_NAME)?.value || null
}

// Get user email from cookies
export function getUserEmail(cookieStore = cookies()): string | null {
  return cookieStore.get(USER_EMAIL_COOKIE_NAME)?.value || null
}

// Client-side auth helpers
export function getClientAuthStatus(): boolean {
  if (typeof window === 'undefined') return false

  const authFlag = localStorage.getItem(AUTH_COOKIE_NAME)
  const authToken = localStorage.getItem(AUTH_TOKEN_COOKIE_NAME)

  return Boolean(authFlag === 'true' && authToken)
}

export function getClientAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AUTH_TOKEN_COOKIE_NAME)
}

export function getClientUserId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(USER_ID_COOKIE_NAME)
}

export function getClientUserEmail(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(USER_EMAIL_COOKIE_NAME)
}
