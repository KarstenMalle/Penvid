// frontend/src/utils/translation-util.ts

import { Locale } from '@/i18n/config'

/**
 * Utility functions for handling translations
 */

/**
 * Extract a value from a nested object using a dot-notation path
 */
export function getNestedValue(
  obj: any,
  path: string,
  defaultValue: any = undefined
): any {
  const keys = path.split('.')
  let current = obj

  for (const key of keys) {
    if (
      current === undefined ||
      current === null ||
      typeof current !== 'object'
    ) {
      return defaultValue
    }
    current = current[key]
  }

  return current === undefined ? defaultValue : current
}

/**
 * Set a value in a nested object using a dot-notation path
 * Creates the path if it doesn't exist
 */
export function setNestedValue(obj: any, path: string, value: any): any {
  const result = { ...obj }
  const keys = path.split('.')
  let current = result

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (
      !(key in current) ||
      current[key] === null ||
      typeof current[key] !== 'object'
    ) {
      current[key] = {}
    }
    current = current[key]
  }

  current[keys[keys.length - 1]] = value
  return result
}

/**
 * Find missing translation keys by comparing a translation object with a reference
 */
export function findMissingKeys(
  translations: Record<string, any>,
  reference: Record<string, any>,
  prefix: string = ''
): string[] {
  const missingKeys: string[] = []

  const processObject = (obj: any, ref: any, currentPrefix: string) => {
    for (const key in ref) {
      const currentKey = currentPrefix ? `${currentPrefix}.${key}` : key

      if (!(key in obj)) {
        missingKeys.push(currentKey)
        continue
      }

      if (
        typeof ref[key] === 'object' &&
        ref[key] !== null &&
        typeof obj[key] === 'object' &&
        obj[key] !== null
      ) {
        processObject(obj[key], ref[key], currentKey)
      }
    }
  }

  processObject(translations, reference, prefix)
  return missingKeys
}

/**
 * Fill in missing translation keys from a reference object
 */
export function fillMissingKeys(
  translations: Record<string, any>,
  reference: Record<string, any>
): Record<string, any> {
  const result = { ...translations }

  const processObject = (obj: any, ref: any, path: string = '') => {
    for (const key in ref) {
      const currentPath = path ? `${path}.${key}` : key

      if (!(key in obj)) {
        // Add missing key with value from reference
        obj[key] = ref[key]
        console.log(`Added missing key: ${currentPath}`)
        continue
      }

      if (
        typeof ref[key] === 'object' &&
        ref[key] !== null &&
        typeof obj[key] === 'object' &&
        obj[key] !== null
      ) {
        processObject(obj[key], ref[key], currentPath)
      }
    }
  }

  processObject(result, reference)
  return result
}

/**
 * Extract all translation keys from a codebase
 * For demonstration purposes, this is a simplified version
 * In a real implementation, you would scan the codebase files
 */
export function extractTranslationKeysFromCode(code: string): string[] {
  const keys: string[] = []
  const regex = /t\(['"]([^'"]+)['"]/g
  let match

  while ((match = regex.exec(code)) !== null) {
    keys.push(match[1])
  }

  return keys
}

/**
 * Validate a translation object against a set of required keys
 */
export function validateTranslations(
  translations: Record<string, any>,
  requiredKeys: string[]
): { valid: boolean; missingKeys: string[] } {
  const missingKeys: string[] = []

  for (const key of requiredKeys) {
    const value = getNestedValue(translations, key)
    if (value === undefined) {
      missingKeys.push(key)
    }
  }

  return {
    valid: missingKeys.length === 0,
    missingKeys,
  }
}

/**
 * Convert frontend translations to backend format
 */
export function convertToBackendFormat(
  frontendTranslations: Record<Locale, Record<string, any>>
): Record<string, any> {
  const result: Record<string, any> = {}

  for (const [locale, translations] of Object.entries(frontendTranslations)) {
    result[locale] = translations
  }

  return result
}

/**
 * Merge translation objects, keeping values from the primary object
 * when they exist, and falling back to the secondary object for missing keys
 */
export function mergeTranslations(
  primary: Record<string, any>,
  secondary: Record<string, any>
): Record<string, any> {
  const result = { ...primary }

  const merge = (target: any, source: any) => {
    for (const key in source) {
      if (!(key in target)) {
        target[key] = source[key]
        continue
      }

      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        typeof target[key] === 'object' &&
        target[key] !== null
      ) {
        merge(target[key], source[key])
      }
      // If target already has the key, keep its value
    }
  }

  merge(result, secondary)
  return result
}
