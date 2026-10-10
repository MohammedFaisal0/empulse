import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { ar } from './ar'
import { en } from './en'

export const LANG_STORAGE_KEY = 'empulse.lang'

export type AppLanguage = 'en' | 'ar'

export function normalizeLanguage(lng: string | undefined): AppLanguage {
  return lng?.startsWith('ar') ? 'ar' : 'en'
}

export function getStoredLanguage(): AppLanguage {
  return normalizeLanguage(localStorage.getItem(LANG_STORAGE_KEY) ?? undefined)
}

export function persistLanguage(lng: AppLanguage): void {
  localStorage.setItem(LANG_STORAGE_KEY, lng)
}

export function applyDocumentLanguage(lng: AppLanguage): void {
  const root = document.documentElement
  root.lang = lng
  root.dir = lng === 'ar' ? 'rtl' : 'ltr'
}

export function setAppLanguage(lng: AppLanguage): void {
  persistLanguage(lng)
  applyDocumentLanguage(lng)
  void i18n.changeLanguage(lng)
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: getStoredLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

const initial = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
persistLanguage(initial)
applyDocumentLanguage(initial)

i18n.on('languageChanged', (lng) => {
  const language = normalizeLanguage(lng)
  persistLanguage(language)
  applyDocumentLanguage(language)
})

export default i18n
