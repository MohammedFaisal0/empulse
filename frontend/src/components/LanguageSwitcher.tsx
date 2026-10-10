import { useTranslation } from 'react-i18next'

import { normalizeLanguage, setAppLanguage, type AppLanguage } from '../i18n'

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { t, i18n } = useTranslation()
  const current: AppLanguage = normalizeLanguage(
    i18n.resolvedLanguage ?? i18n.language,
  )

  return (
    <div
      role="group"
      aria-label={t('language.switchTo')}
      className={[
        'inline-flex items-center gap-1 rounded-lg border border-border bg-white p-0.5 font-mono text-[11px]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        onClick={() => setAppLanguage('en')}
        className={[
          'rounded-md px-2 py-1 transition-colors',
          current === 'en'
            ? 'bg-navy text-white'
            : 'text-muted hover:bg-surface-4 hover:text-ink',
        ].join(' ')}
      >
        {t('language.en')}
      </button>
      <button
        type="button"
        onClick={() => setAppLanguage('ar')}
        className={[
          'rounded-md px-2 py-1 transition-colors',
          current === 'ar'
            ? 'bg-navy text-white'
            : 'text-muted hover:bg-surface-4 hover:text-ink',
        ].join(' ')}
      >
        {t('language.ar')}
      </button>
    </div>
  )
}
