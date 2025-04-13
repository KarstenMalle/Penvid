// Define supported locales
export type Locale = 'en' | 'da' | 'es'

// Define supported currencies
export type Currency = 'USD' | 'DKK' | 'EUR'

// Define supported countries
export type Country = 'US' | 'DK' | 'ES'

// Define language information
export const languages = {
  en: {
    name: 'English',
    flag: '🇺🇸',
    locale: 'en-US',
  },
  da: {
    name: 'Dansk',
    flag: '🇩🇰',
    locale: 'da-DK',
  },
  es: {
    name: 'Español',
    flag: '🇪🇸',
    locale: 'es-ES',
  },
}

// Define currency information
export const currencies = {
  USD: {
    name: 'US Dollar',
    flag: '🇺🇸',
    symbol: '$',
    locale: 'en-US',
  },
  DKK: {
    name: 'Danish Krone',
    flag: '🇩🇰',
    symbol: 'kr',
    locale: 'da-DK',
  },
  EUR: {
    name: 'Euro',
    flag: '🇪🇺',
    symbol: '€',
    locale: 'en-EU',
  },
}

// Define country information with tax and financial rules
export const countries = {
  US: {
    name: 'United States',
    flag: '🇺🇸',
    defaultCurrency: 'USD' as Currency,
    defaultLocale: 'en' as Locale,
    rules: {
      mortgageInterestDeductible: true,
      mortgageInterestDeductionRate: 1.0,
      maxMortgageInterestDeduction: 750000,
      studentLoanInterestDeductible: true,
      maxStudentLoanInterestDeduction: 2500,
    },
  },
  DK: {
    name: 'Denmark',
    flag: '🇩🇰',
    defaultCurrency: 'DKK' as Currency,
    defaultLocale: 'da' as Locale,
    rules: {
      mortgageInterestDeductible: true,
      mortgageInterestDeductionRate: 0.33,
      maxMortgageInterestDeduction: null,
      studentLoanInterestDeductible: false,
      maxStudentLoanInterestDeduction: null,
    },
  },
  ES: {
    name: 'Spain',
    flag: '🇪🇸',
    defaultCurrency: 'EUR' as Currency,
    defaultLocale: 'es' as Locale,
    rules: {
      mortgageInterestDeductible: false,
      mortgageInterestDeductionRate: 0,
      maxMortgageInterestDeduction: null,
      studentLoanInterestDeductible: false,
      maxStudentLoanInterestDeduction: null,
    },
  },
}

// Define translations
export const i18n: Record<Locale, any> = {
  en: {
    common: {
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      yes: 'Yes',
      no: 'No',
      success: 'Success',
      error: 'Error',
    },
    settings: {
      title: 'Settings',
      account: 'Account',
      appearance: 'Appearance',
      language: 'Language',
      currency: 'Currency',
      country: 'Country',
      notifications: 'Notifications',
      security: 'Security',
      selectLanguage: 'Select your preferred language',
      selectCurrency: 'Select your preferred currency',
      selectCountry: 'Select your country of residence',
      countryFinancialRules: 'Financial Rules',
      ruleDescription: 'Tax and financial regulations specific to your country',
      mortgageRules: 'Mortgage Rules',
      studentLoanRules: 'Student Loan Rules',
      mortgageInterestDeductible: 'Mortgage interest is tax deductible',
      studentLoanInterestDeductible: 'Student loan interest is tax deductible',
      maxMortgageDeduction: 'Maximum mortgage interest deduction',
      maxStudentDeduction: 'Maximum student loan interest deduction',
      deductionRate: 'Deduction rate',
      countryRuleNote: 'Note on country settings',
      countryRuleExplanation:
        'These rules affect how your finances are calculated and displayed throughout the app.',
    },
    countries: {
      US: {
        description: 'United States',
      },
      DK: {
        description: 'Denmark',
      },
      ES: {
        description: 'Spain',
      },
    },
  },
  da: {
    common: {
      loading: 'Indlæser...',
      save: 'Gem',
      cancel: 'Annuller',
      delete: 'Slet',
      edit: 'Rediger',
      yes: 'Ja',
      no: 'Nej',
      success: 'Succes',
      error: 'Fejl',
    },
    settings: {
      title: 'Indstillinger',
      account: 'Konto',
      appearance: 'Udseende',
      language: 'Sprog',
      currency: 'Valuta',
      country: 'Land',
      notifications: 'Notifikationer',
      security: 'Sikkerhed',
      selectLanguage: 'Vælg dit foretrukne sprog',
      selectCurrency: 'Vælg din foretrukne valuta',
      selectCountry: 'Vælg dit bopælsland',
      countryFinancialRules: 'Finansielle Regler',
      ruleDescription: 'Skatte- og finansielle regler specifikt for dit land',
      mortgageRules: 'Realkreditregler',
      studentLoanRules: 'SU-lån Regler',
      mortgageInterestDeductible: 'Realkreditrenter er fradragsberettigede',
      studentLoanInterestDeductible: 'SU-lån renter er fradragsberettigede',
      maxMortgageDeduction: 'Maksimalt rentefradrag for realkredit',
      maxStudentDeduction: 'Maksimalt rentefradrag for SU-lån',
      deductionRate: 'Fradragssats',
      countryRuleNote: 'Bemærkning om landeindstillinger',
      countryRuleExplanation:
        'Disse regler påvirker, hvordan dine finanser beregnes og vises i hele appen.',
    },
    countries: {
      US: {
        description: 'USA',
      },
      DK: {
        description: 'Danmark',
      },
      ES: {
        description: 'Spanien',
      },
    },
  },
  es: {
    common: {
      loading: 'Cargando...',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      yes: 'Sí',
      no: 'No',
      success: 'Éxito',
      error: 'Error',
    },
    settings: {
      title: 'Configuración',
      account: 'Cuenta',
      appearance: 'Apariencia',
      language: 'Idioma',
      currency: 'Moneda',
      country: 'País',
      notifications: 'Notificaciones',
      security: 'Seguridad',
      selectLanguage: 'Selecciona tu idioma preferido',
      selectCurrency: 'Selecciona tu moneda preferida',
      selectCountry: 'Selecciona tu país de residencia',
      countryFinancialRules: 'Reglas Financieras',
      ruleDescription:
        'Regulaciones fiscales y financieras específicas de tu país',
      mortgageRules: 'Reglas Hipotecarias',
      studentLoanRules: 'Reglas de Préstamos Estudiantiles',
      mortgageInterestDeductible:
        'Los intereses hipotecarios son deducibles de impuestos',
      studentLoanInterestDeductible:
        'Los intereses de préstamos estudiantiles son deducibles',
      maxMortgageDeduction: 'Deducción máxima de intereses hipotecarios',
      maxStudentDeduction:
        'Deducción máxima de intereses de préstamos estudiantiles',
      deductionRate: 'Tasa de deducción',
      countryRuleNote: 'Nota sobre la configuración del país',
      countryRuleExplanation:
        'Estas reglas afectan cómo se calculan y muestran sus finanzas en toda la aplicación.',
    },
    countries: {
      US: {
        description: 'Estados Unidos',
      },
      DK: {
        description: 'Dinamarca',
      },
      ES: {
        description: 'España',
      },
    },
  },
}
