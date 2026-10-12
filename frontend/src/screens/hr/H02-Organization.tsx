import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useHrOrganization } from '../../api/hr'
import { Badge, Card, Stat } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { hrNav } from '../../layout/navConfigs'

function toneForBurnout(pct: number | null | undefined): 'teal' | 'amber' | 'coral' {
  if (pct == null) return 'teal'
  if (pct >= 60) return 'coral'
  if (pct >= 45) return 'amber'
  return 'teal'
}

export function H02Organization() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useHrOrganization()

  return (
    <AppShell
      config={hrNav}
      activePath="/hr/organization"
      chrome={{
        breadcrumbPrimary: t('h02.breadcrumbOrg'),
        breadcrumbPage: t('h02.title'),
      }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('h02.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('h02.subtitle')}</p>
        </div>
        <Link
          to="/hr/organization/capability"
          className="rounded-[11px] border border-border bg-white px-3.5 py-2 text-[14px] font-semibold"
        >
          {t('h02.capability')}
        </Link>
      </div>

      {isLoading ? <p className="text-muted">{t('h02.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="!rounded-[14px]">
              <Stat label={t('h02.depts')} value={String(data.counts.departments)} />
            </Card>
            <Card className="!rounded-[14px]">
              <Stat label={t('h02.teams')} value={String(data.counts.teams)} />
            </Card>
            <Card className="!rounded-[14px]">
              <Stat label={t('h02.people')} value={String(data.counts.employees)} />
            </Card>
            <Card className="!rounded-[14px]">
              <Stat label={t('h02.ideas')} value={String(data.counts.public_ideas)} />
            </Card>
            <Card className="!rounded-[14px]">
              <Stat
                label={t('h02.recognitions')}
                value={String(data.counts.public_recognitions)}
              />
            </Card>
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('h02.pulseMap')}</h2>
              <p className="mt-1 text-[13px] text-muted">{t('h02.pulseMapSub')}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {data.departments.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-xl border border-border p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-ink">{d.name}</p>
                      {d.suppressed ? (
                        <Badge tone="slate" uppercase={false}>
                          {t('h02.suppressed')}
                        </Badge>
                      ) : (
                        <Badge
                          tone={toneForBurnout(d.burnout_risk_pct)}
                          uppercase={false}
                        >
                          {d.burnout_risk_pct != null
                            ? `${Math.round(d.burnout_risk_pct)}%`
                            : '—'}
                        </Badge>
                      )}
                    </div>
                    {d.suppressed ? (
                      <p className="mt-2 text-[12px] text-muted">
                        {t('h02.underFive')}
                      </p>
                    ) : (
                      <dl className="mt-2 grid grid-cols-2 gap-1 text-[12px] text-muted">
                        <div>
                          <dt>{t('h02.perf')}</dt>
                          <dd className="ltr-nums font-semibold text-ink">
                            {d.performance != null
                              ? Math.round(d.performance)
                              : '—'}
                          </dd>
                        </div>
                        <div>
                          <dt>{t('h02.eng')}</dt>
                          <dd className="ltr-nums font-semibold text-ink">
                            {d.engagement != null
                              ? Math.round(d.engagement)
                              : '—'}
                          </dd>
                        </div>
                        <div>
                          <dt>{t('h02.well')}</dt>
                          <dd className="ltr-nums font-semibold text-ink">
                            {d.wellbeing != null
                              ? Math.round(d.wellbeing)
                              : '—'}
                          </dd>
                        </div>
                        <div>
                          <dt>{t('h02.innov')}</dt>
                          <dd className="ltr-nums font-semibold text-ink">
                            {d.innovation != null
                              ? Math.round(d.innovation)
                              : '—'}
                          </dd>
                        </div>
                      </dl>
                    )}
                    <p className="mt-2 font-mono text-[10px] text-faint">
                      {t('h02.teamsCount', {
                        n: d.teams.filter((x) => !x.suppressed).length,
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('h02.needingSupport')}</h2>
              <p className="mt-1 text-[13px] text-muted">{t('h02.needingSub')}</p>
              {data.needing_support.length === 0 ? (
                <p className="mt-4 text-muted">{t('h02.noneNeeding')}</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {data.needing_support.map((d) => (
                    <li
                      key={d.id}
                      className="flex justify-between rounded-xl bg-coral-light/40 px-3 py-2.5 text-[13px]"
                    >
                      <span className="font-semibold">{d.name}</span>
                      <span className="ltr-nums font-mono text-coral-dark">
                        {d.burnout_risk_pct != null
                          ? `${Math.round(d.burnout_risk_pct)}%`
                          : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-[11px] text-faint">{t('h02.noPeopleRank')}</p>
            </Card>
          </div>
        </>
      ) : null}
    </AppShell>
  )
}
