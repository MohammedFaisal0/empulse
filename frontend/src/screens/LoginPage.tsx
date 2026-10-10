import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { Button, Card } from '../components/ui'

export function LoginPage() {
  const { t } = useTranslation()

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="absolute end-6 top-6">
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-navy">
            <span className="h-2.5 w-3.5 rounded-sm bg-teal" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-wide text-ink">
            {t('brand')}
          </span>
        </div>

        <h1 className="text-xl font-semibold text-ink">{t('login.title')}</h1>
        <p className="mt-1 text-muted">{t('login.subtitle')}</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
              {t('login.email')}
            </span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              placeholder={t('login.emailPlaceholder')}
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-ink placeholder:text-faint focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
              {t('login.password')}
            </span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder={t('login.passwordPlaceholder')}
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-ink placeholder:text-faint focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
            />
          </label>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="text-[12px] text-teal-dark hover:underline"
            >
              {t('login.forgotPassword')}
            </button>
          </div>

          <Button type="submit" variant="primary" className="w-full">
            {t('login.submit')}
          </Button>
        </form>

        <p className="mt-4 font-mono text-[11px] text-muted">{t('login.demoHint')}</p>

        <p className="mt-4 text-xs text-muted">
          <Link className="text-teal-dark underline" to="/design-preview">
            {t('health.openPreview')}
          </Link>
        </p>
      </Card>
    </main>
  )
}
