// frontend/src/context/LanguageContext.tsx
'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useAuth } from './AuthContext'
import { languages, Locale, defaultLocale } from '@/i18n/config'
import toast from 'react-hot-toast'

// Import translations
import enTranslations from '@/i18n/en.json'
import daTranslations from '@/i18n/da.json'

const translations = {
  en: enTranslations,
  da: daTranslations,
}

type LanguageContextType = {
  locale: Locale
  setLocale: (locale: Locale) => Promise<void>
  t: (key: string) => string
  languages: typeof languages
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const supabase = createClient()

  // Load user's language preference from localStorage or database
  useEffect(() => {
    async function loadLanguagePreference() {
      // First check localStorage
      const storedLocale = localStorage.getItem('locale') as Locale | null

      if (storedLocale && Object.keys(languages).includes(storedLocale)) {
        setLocaleState(storedLocale)
        return
      }

      // If authenticated, check database
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('language_preference')
            .eq('id', user.id)
            .single()

          if (error) throw error

          if (
            data?.language_preference &&
            Object.keys(languages).includes(data.language_preference)
          ) {
            setLocaleState(data.language_preference as Locale)
            localStorage.setItem('locale', data.language_preference)
          }
        } catch (error) {
          console.error('Error loading language preference:', error)
        }
      }

      // If no preference found, try to use browser language
      const browserLang = navigator.language.split('-')[0] as Locale
      if (Object.keys(languages).includes(browserLang)) {
        setLocaleState(browserLang)
        localStorage.setItem('locale', browserLang)
      }
    }

    loadLanguagePreference()
  }, [user, supabase])

  // Function to change language
  const setLocale = async (newLocale: Locale) => {
    // Update local state
    setLocaleState(newLocale)

    // Save to localStorage
    localStorage.setItem('locale', newLocale)

    // If authenticated, save to database
    if (user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ language_preference: newLocale })
          .eq('id', user.id)

        if (error) throw error

        toast.success(`Language changed to ${languages[newLocale].name}`)
      } catch (error) {
        console.error('Error saving language preference:', error)
        toast.error('Failed to save language preference')
      }
    }
  }

  // Translation function
  const t = (key: string) => {
    const keys = key.split('.')
    let value = translations[locale]

    for (const k of keys) {
      if (value[k] === undefined) {
        console.warn(`Translation key not found: ${key}`)
        return key
      }
      value = value[k]
    }

    return value as string
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, languages }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
