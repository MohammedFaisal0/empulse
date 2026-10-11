import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useMeGrowth } from '../../api/me'
import { Badge, Button, Card, ProgressBar } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { employeeNav } from '../../layout/navConfigs'

export function E07MyGrowthPath() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useMeGrowth()

  return (
    <AppShell
      config={employeeNav}
      activePath="/employee/growth"
      chrome={{
        breadcrumbPrimary: data
          ? `${data.full_name}`
          : undefined,
        breadcrumbPage: t('e07.title'),
      }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('e07.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('e07.subtitle')}</p>
          {data?.manager_name ? (
            <p className="mt-1 text-xs text-muted">
              {t('e07.manager', { name: data.manager_name })}
            </p>
          ) : null}
        </div>
        <Link to="/employee/performance">
          <Button variant="primary">{t('e07.improve')}</Button>
        </Link>
      </div>

      {isLoading ? <p className="text-muted">{t('e07.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Card className="!rounded-2xl">
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                {t('e07.learning')}
              </p>
              <p className="mt-1 text-[28px] font-bold ltr-nums">
                {data.training.hours_proxy ?? '—'}
                {data.training.hours_proxy != null ? ' h' : ''}
              </p>
              <p className="text-xs text-muted">
                {t('e07.learningNote', {
                  n: data.training.times_last_year,
                  projected: data.training.hours_projected
                    ? t('common.projected')
                    : '',
                })}
              </p>
            </Card>
            <Card className="!rounded-2xl">
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                {t('e07.goals')}
              </p>
              <p className="mt-1 text-[28px] font-bold ltr-nums">
                {data.skills.length}
              </p>
              <p className="text-xs text-muted">
                {t('e07.goalsNote', { n: data.skills.length })}
              </p>
            </Card>
            <Card className="!rounded-2xl">
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                {t('e07.implemented')}
              </p>
              <p className="mt-1 text-[28px] font-bold ltr-nums">
                {data.ideas_implemented_12m}
              </p>
              <p className="text-xs text-muted">{t('e07.implementedNote')}</p>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('e07.readiness')}</h2>
              {data.readiness.length === 0 ? (
                <p className="mt-3 text-muted">{t('e07.emptySkills')}</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {data.readiness.map((r) => (
                    <li key={r.skill}>
                      <div className="mb-1 flex justify-between gap-2 text-[13px]">
                        <span className="font-semibold">{r.skill}</span>
                        <span className="ltr-nums font-mono text-muted">
                          {r.score} / {r.target}
                          {r.met ? (
                            <span className="ms-2 text-teal-dark">
                              {t('e07.targetMet')}
                            </span>
                          ) : (
                            <span className="ms-2 text-amber-dark">
                              {t('e07.gap', { n: r.target - r.score })}
                            </span>
                          )}
                        </span>
                      </div>
                      <ProgressBar value={r.score} tone={r.met ? 'teal' : 'amber'} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('e07.recommended')}</h2>
              <ul className="mt-4 space-y-3">
                {data.recommendations.map((rec) => (
                  <li
                    key={rec.title}
                    className="rounded-xl border border-border px-3 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-semibold">{rec.title}</p>
                      {rec.labelled ? (
                        <Badge tone="amber" uppercase={false}>
                          {t('e07.labelled')}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-faint">
                      {rec.reason}
                      {rec.gap != null ? ` · gap ${rec.gap}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      ) : null}
    </AppShell>
  )
}
