import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { fetchHealth } from '../api/health'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { Card } from '../components/ui'

export function HealthPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  })

  return (
    <main className="relative flex min-h-screen items-center justify-center p-8">
      <div className="absolute end-6 top-6">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <h1 className="text-lg font-semibold text-ink">{t('health.title')}</h1>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-muted">
          {t('health.label')}
        </p>
        <div className="mt-4 font-mono text-sm">
          {isLoading && <p className="text-muted">{t('health.checking')}</p>}
          {isError && (
            <p className="text-coral">
              {error instanceof Error ? error.message : t('health.failed')}
            </p>
          )}
          {data && (
            <p>
              <span>{t('health.status')}</span>:{' '}
              <span className="font-semibold text-teal">{data.status}</span>
            </p>
          )}
        </div>
        <p className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
          <Link className="text-teal-dark underline" to="/login">
            {t('login.welcome')}
          </Link>
          <Link className="text-teal-dark underline" to="/design-preview">
            {t('health.openPreview')}
          </Link>
        </p>
      </Card>
    </main>
  )
}
