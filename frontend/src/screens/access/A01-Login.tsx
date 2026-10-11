import { Activity, ArrowRight, AtSign, Check, Lock, Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { ApiRequestError } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { RtlFlip } from '../../components/RtlFlip'
import { translateError } from '../../i18n/errors'

export function A01Login() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('yasmin@horizon.demo')
  const [password, setPassword] = useState('empulse123')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      await login(email.trim(), password)
      navigate('/role', { replace: true })
    } catch (err) {
      const code =
        err instanceof ApiRequestError ? err.code : 'error.unknown'
      setError(translateError(t, code))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <section className="relative hidden w-[min(56vw,800px)] shrink-0 flex-col justify-between bg-navy px-14 py-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-white">
            <Activity className="h-[15px] w-[15px] text-teal" strokeWidth={2.4} />
          </span>
          <span className="text-[17px] font-bold tracking-[0.16em]">{t('brand')}</span>
        </div>

        <div className="max-w-[600px] space-y-[18px] py-16">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-teal">
            {t('login.overline')}
          </p>
          <h1 className="text-[50px] font-semibold leading-[1.06] tracking-[-0.035em]">
            {t('login.headline')}
          </h1>
          <p className="max-w-[520px] text-base leading-relaxed text-white/70">
            {t('login.story')}
          </p>
        </div>

        <div className="relative h-[260px]">
          <div className="absolute inset-x-0 top-10 space-y-[30px] opacity-40">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-px w-full bg-white/10" />
            ))}
          </div>
          <svg
            className="absolute inset-x-0 top-0 h-[200px] w-[92%] text-teal"
            viewBox="0 0 650 200"
            fill="none"
            aria-hidden
          >
            <path
              d="M0 120 H80 L100 120 L120 40 L150 160 L180 90 L210 120 H320 L340 120 L360 70 L390 150 L420 100 L450 120 H650"
              stroke="currentColor"
              strokeWidth="2.2"
            />
          </svg>
          <InsightCard
            icon="!"
            iconClass="bg-teal"
            title={t('login.insightBurnoutTitle')}
            note={t('login.insightBurnoutNote')}
            className="absolute start-8 top-2"
          />
          <InsightCard
            icon="✧"
            iconClass="bg-violet-light text-navy"
            title={t('login.insightIdeaTitle')}
            note={t('login.insightIdeaNote')}
            className="absolute end-4 top-16"
          />
          <InsightCard
            icon="$"
            iconClass="bg-teal-lighter text-navy"
            title={t('login.insightImpactTitle')}
            note={t('login.insightImpactNote')}
            className="absolute start-[28%] bottom-2"
          />
        </div>
      </section>

      <section className="relative flex flex-1 items-center justify-center px-6 py-10 sm:px-16">
        <div className="absolute end-6 top-6">
          <LanguageSwitcher />
        </div>

        <form className="w-full max-w-[422px] space-y-[22px]" onSubmit={onSubmit}>
          <div className="space-y-2">
            <h2 className="text-[28px] font-semibold text-ink">{t('login.welcome')}</h2>
            <p className="text-sm text-muted">{t('login.workspace')}</p>
          </div>

          <button
            type="button"
            className="flex h-[46px] w-full items-center justify-center gap-2.5 rounded-[11px] border border-border bg-white text-sm font-semibold text-ink"
          >
            <span className="text-navy">⌕</span>
            {t('login.sso')}
          </button>

          <div className="flex items-center gap-3 text-xs text-faint">
            <span className="h-px flex-1 bg-border" />
            {t('login.orEmail')}
            <span className="h-px flex-1 bg-border" />
          </div>

          <label className="block space-y-1.5">
            <span className="text-[13px] font-semibold text-ink">{t('login.email')}</span>
            <span className="flex h-[46px] items-center gap-2.5 rounded-[11px] border border-border bg-white px-3.5">
              <AtSign className="h-4 w-4 text-muted" strokeWidth={1.75} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder')}
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                autoComplete="username"
                required
              />
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-[13px] font-semibold text-ink">{t('login.password')}</span>
            <span className="flex h-[46px] items-center gap-2.5 rounded-[11px] border border-border bg-white px-3.5">
              <Lock className="h-4 w-4 text-muted" strokeWidth={1.75} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.passwordPlaceholder')}
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                autoComplete="current-password"
                required
              />
            </span>
          </label>

          <div className="flex items-center justify-between gap-3 text-[13px]">
            <label className="flex items-center gap-2 text-muted">
              <button
                type="button"
                role="checkbox"
                aria-checked={remember}
                onClick={() => setRemember((v) => !v)}
                className={[
                  'flex h-4 w-4 items-center justify-center rounded',
                  remember ? 'bg-teal' : 'border border-border bg-white',
                ].join(' ')}
              >
                {remember ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
              </button>
              {t('login.remember')}
            </label>
            <button type="button" className="text-teal-dark">
              {t('login.forgotPassword')}
            </button>
          </div>

          {error ? (
            <p className="rounded-lg bg-coral-light px-3 py-2 text-[13px] text-coral-dark">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="flex h-[50px] w-full items-center justify-between rounded-2xl bg-navy px-4 text-white shadow-[0_24px_48px_rgba(14,41,68,0.32)] disabled:opacity-60"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-teal text-navy">
                <Sparkles className="h-4 w-4" strokeWidth={2} />
              </span>
              <span className="text-[15px] font-semibold">
                {pending ? t('login.signingIn') : t('login.submit')}
              </span>
            </span>
            <RtlFlip>
              <ArrowRight className="h-[18px] w-[18px] text-teal-lighter" />
            </RtlFlip>
          </button>

          <div className="space-y-2.5 rounded-2xl border border-border bg-white p-4">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-teal-dark" strokeWidth={2.5} />
              <span className="text-[13px] font-semibold text-ink">{t('login.trustTitle')}</span>
            </div>
            <p className="text-[12.5px] leading-relaxed text-muted">{t('login.trustBody')}</p>
          </div>

          <p className="font-mono text-[11px] tracking-wide text-faint">{t('login.security')}</p>
          <p className="text-[11px] text-muted">
            {t('login.demoHint')}{' '}
            <Link to="/role" className="text-teal-dark underline">
              {t('roleRouting.title')}
            </Link>
          </p>
        </form>
      </section>
    </div>
  )
}

function InsightCard({
  icon,
  iconClass,
  title,
  note,
  className,
}: {
  icon: string
  iconClass: string
  title: string
  note: string
  className?: string
}) {
  return (
    <div
      className={[
        'flex max-w-[256px] items-center gap-2.5 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-2.5 backdrop-blur-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        className={[
          'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] text-sm font-semibold text-navy',
          iconClass,
        ].join(' ')}
      >
        {icon}
      </span>
      <div>
        <p className="text-[13px] font-semibold text-white">{title}</p>
        <p className="text-[11.5px] text-white/60">{note}</p>
      </div>
    </div>
  )
}
