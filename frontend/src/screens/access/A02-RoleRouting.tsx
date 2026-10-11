import { Activity, ArrowLeft, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { homePathForRole } from '../../api/auth'
import { ApiRequestError } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { RtlFlip } from '../../components/RtlFlip'
import { translateError } from '../../i18n/errors'
import { demoPersona } from '../../layout/demoPersona'

const DEMO_PASSWORD = 'empulse123'

const demos = [
  {
    key: 'employee' as const,
    email: 'layla@horizon.demo',
    name: demoPersona.employee.name,
    initials: 'LH',
    avatarClass: 'bg-violet-light border-teal',
    cardClass: 'bg-white text-ink border-border',
    badgeClass: 'bg-teal-light text-teal-dark',
    continueClass: 'text-teal-dark',
    dark: false,
  },
  {
    key: 'manager' as const,
    email: 'yasmin@horizon.demo',
    name: demoPersona.manager.name,
    initials: 'YH',
    avatarClass: 'bg-coral-light border-white',
    cardClass: 'bg-white text-ink border-border',
    badgeClass: 'bg-surface-3 text-navy',
    continueClass: 'text-teal-dark',
    dark: false,
  },
  {
    key: 'hr' as const,
    email: 'rana@horizon.demo',
    name: demoPersona.hr.name,
    initials: 'RA',
    avatarClass: 'bg-border-blue border-white',
    cardClass: 'bg-navy text-white border-navy',
    badgeClass: 'bg-teal-light text-teal-dark',
    continueClass: 'text-teal',
    dark: true,
  },
]

export function A02RoleRouting() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)

  const continueAs = async (email: string) => {
    setError(null)
    setPending(email)
    try {
      const me = await login(email, DEMO_PASSWORD)
      navigate(homePathForRole(me.role), { replace: true })
    } catch (err) {
      const code =
        err instanceof ApiRequestError ? err.code : 'error.unknown'
      setError(translateError(t, code))
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="min-h-screen bg-surface px-8 py-10 md:px-[72px]">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-navy">
            <Activity className="h-[15px] w-[15px] text-teal" strokeWidth={2.4} />
          </span>
          <span className="text-[17px] font-bold tracking-[0.16em] text-navy">
            {t('brand')}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-[13px] text-teal-dark"
          >
            <RtlFlip>
              <ArrowLeft className="h-[15px] w-[15px]" />
            </RtlFlip>
            {t('roleRouting.back')}
          </Link>
        </div>
      </div>

      <div className="mx-auto mb-10 max-w-[680px] space-y-3 text-center">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-teal-dark">
          {t('roleRouting.overline')}
        </p>
        <h1 className="text-[40px] font-semibold tracking-[-0.03em] text-ink">
          {t('roleRouting.title')}
        </h1>
        <p className="text-[15px] leading-relaxed text-muted">
          {t('roleRouting.description')}
        </p>
      </div>

      {error ? (
        <p className="mx-auto mb-4 max-w-lg rounded-lg bg-coral-light px-3 py-2 text-center text-[13px] text-coral-dark">
          {error}
        </p>
      ) : null}

      <div className="mx-auto grid max-w-[1296px] gap-6 lg:grid-cols-3">
        {demos.map((demo) => {
          const badge =
            demo.key === 'employee'
              ? t('roleRouting.employeeBadge')
              : demo.key === 'manager'
                ? t('roleRouting.managerBadge')
                : t('roleRouting.hrBadge')
          const title =
            demo.key === 'employee'
              ? t('roleRouting.employeeTitle')
              : demo.key === 'manager'
                ? t('roleRouting.managerTitle')
                : t('roleRouting.hrTitle')
          const question =
            demo.key === 'employee'
              ? t('roleRouting.employeeQuestion')
              : demo.key === 'manager'
                ? t('roleRouting.managerQuestion')
                : t('roleRouting.hrQuestion')
          const rows = [
            [
              t('roleRouting.focus'),
              demo.key === 'employee'
                ? t('roleRouting.employeeFocus')
                : demo.key === 'manager'
                  ? t('roleRouting.managerFocus')
                  : t('roleRouting.hrFocus'),
            ],
            [
              t('roleRouting.dataScope'),
              demo.key === 'employee'
                ? t('roleRouting.employeeScope')
                : demo.key === 'manager'
                  ? t('roleRouting.managerScope')
                  : t('roleRouting.hrScope'),
            ],
            [
              t('roleRouting.startsAt'),
              demo.key === 'employee'
                ? t('roleRouting.employeeStarts')
                : demo.key === 'manager'
                  ? t('roleRouting.managerStarts')
                  : t('roleRouting.hrStarts'),
            ],
            [
              t('roleRouting.feel'),
              demo.key === 'employee'
                ? t('roleRouting.employeeFeel')
                : demo.key === 'manager'
                  ? t('roleRouting.managerFeel')
                  : t('roleRouting.hrFeel'),
            ],
          ]

          return (
            <article
              key={demo.key}
              className={[
                'flex flex-col gap-4 rounded-[18px] border p-6 shadow-raised',
                demo.cardClass,
              ].join(' ')}
            >
              <div className="flex items-center justify-between">
                <span
                  className={[
                    'rounded-md px-2 py-1 text-xs font-semibold',
                    demo.badgeClass,
                  ].join(' ')}
                >
                  {badge}
                </span>
                <span className={demo.dark ? 'text-teal' : 'text-teal-dark'}>♧</span>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={[
                    'inline-flex h-11 w-11 items-center justify-center rounded-full border-2 font-semibold text-navy',
                    demo.avatarClass,
                  ].join(' ')}
                >
                  {demo.initials}
                </span>
                <div>
                  <p className="text-lg font-semibold">{demo.name}</p>
                  <p
                    className={[
                      'text-[13px]',
                      demo.dark ? 'text-white/70' : 'text-muted',
                    ].join(' ')}
                  >
                    {title}
                  </p>
                </div>
              </div>

              <p className="text-xl font-semibold leading-snug">{question}</p>

              <div
                className={[
                  'space-y-1 border-t pt-3.5 text-[13px]',
                  demo.dark ? 'border-white/15' : 'border-border',
                ].join(' ')}
              >
                {rows.map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[110px_1fr] gap-2">
                    <span className={demo.dark ? 'text-white/70' : 'text-muted'}>
                      {label}
                    </span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={pending === demo.email}
                onClick={() => void continueAs(demo.email)}
                className={[
                  'mt-auto inline-flex items-center gap-2 text-sm font-semibold',
                  demo.continueClass,
                ].join(' ')}
              >
                {t('roleRouting.continueAs', { name: demo.name.split(' ')[0] })}
                <RtlFlip>
                  <ArrowRight className="h-4 w-4" />
                </RtlFlip>
              </button>
            </article>
          )
        })}
      </div>

      <div className="mx-auto mt-10 flex flex-wrap justify-center gap-8 text-[13px] text-muted">
        <span>{t('roleRouting.summaryEmployee')}</span>
        <span>{t('roleRouting.summaryManager')}</span>
        <span>{t('roleRouting.summaryHr')}</span>
      </div>
    </div>
  )
}
