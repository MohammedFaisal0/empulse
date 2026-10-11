import type { TFunction } from 'i18next'

/** Map an API error code (e.g. auth.invalid_credentials) to a translated string. */
export function translateError(t: TFunction, code: string | undefined): string {
  if (!code) return t('errors.error.unknown')
  const key = `errors.${code}`
  const translated = t(key)
  return translated === key ? t('errors.error.unknown') : translated
}
