import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useHrCapability } from '../../api/hr'
import { Badge, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { hrNav } from '../../layout/navConfigs'

const TIERS = ['gold', 'silver', 'bronze', 'growth'] as const

const TIER_BAR: Record<string, string> = {
  gold: 'bg-tier-gold',
  silver: 'bg-tier-silver',
  bronze: 'bg-tier-bronze',
  growth: 'bg-tier-growth',
}

export function H02bProfessionalCapability() {
  const { t } = useTranslation()
  const [deptId, setDeptId] = useState<number | undefined>()
  const [showAlerts, setShowAlerts] = useState(true)
  const { data, isLoading, isError } = useHrCapability(
    deptId ? { department_id: deptId } : undefined,
  )

  const spectrum = useMemo(() => {
    const dots = data?.spectrum ?? []
    return showAlerts ? dots : dots.filter((d) => !d.wellbeing_alert)
  }, [data, showAlerts])

  return (
    <AppShell
      config={hrNav}
      activePath="/hr/organization"
      chrome={{
        breadcrumbPrimary: t('h02b.breadcrumbOrg'),
        breadcrumbPage: t('h02b.title'),
      }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('h02b.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('h02b.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/hr/performance"
            className="rounded-[11px] border border-border bg-white px-3.5 py-2 text-[14px] font-semibold"
          >
            {t('h02b.invest')}
          </Link>
          <Link
            to="/hr/employees"
            className="rounded-[11px] bg-navy px-3.5 py-2 text-[14px] font-semibold text-white"
          >
            {t('h02b.planDev')}
          </Link>
        </div>
      </div>

      <p className="mb-4 rounded-xl border border-amber/30 bg-amber/10 px-3 py-2 text-[12px] text-ink">
        {t('h02b.notLeaderboard')}
      </p>

      {isLoading ? <p className="text-muted">{t('h02b.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TIERS.map((tier) => {
              const row = data.tiers[tier]
              return (
                <Card key={tier} className="!rounded-[14px]">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                    {t(`h02b.tiers.${tier}`)}
                  </p>
                  <p className="mt-1 text-[28px] font-semibold ltr-nums">
                    {row?.pct ?? 0}%
                  </p>
                  <p className="text-[12px] text-muted ltr-nums">
                    {t('h02b.peopleN', { n: row?.count ?? 0 })}
                    {row != null ? (
                      <span className="ms-1 text-teal">
                        {row.delta_pp_vs_q2 >= 0 ? '+' : ''}
                        {row.delta_pp_vs_q2} {t('h02b.vsQ2')}
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-surface-3">
                    <div
                      className={`h-1.5 rounded-full ${TIER_BAR[tier]}`}
                      style={{ width: `${Math.min(100, row?.pct ?? 0)}%` }}
                    />
                  </div>
                </Card>
              )
            })}
          </div>

          <Card className="mb-4 !rounded-[14px]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{t('h02b.spectrum')}</h2>
                <p className="text-[13px] text-muted">
                  {t('h02b.spectrumSub', { n: data.scope.n })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-[13px]">
                  <span className="text-muted">{t('h02b.filterDept')}</span>
                  <select
                    className="rounded-lg border border-border bg-white px-2 py-1.5"
                    value={deptId ?? ''}
                    onChange={(e) =>
                      setDeptId(e.target.value ? Number(e.target.value) : undefined)
                    }
                  >
                    <option value="">{t('h02b.allPeople', { n: data.scope.n })}</option>
                    {data.filters.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={showAlerts}
                    onChange={(e) => setShowAlerts(e.target.checked)}
                  />
                  {t('h02b.showAlerts', { n: data.alerts.total })}
                </label>
              </div>
            </div>

            {data.executive_individuals_hidden ? (
              <p className="text-[13px] text-muted">{t('h02b.execNoDots')}</p>
            ) : (
              <div
                className="relative h-24 rounded-xl border border-border bg-surface"
                dir="ltr"
              >
                {[60, 70, 80, 90, 100].map((m) => (
                  <span
                    key={m}
                    className="absolute bottom-1 -translate-x-1/2 font-mono text-[9px] text-faint"
                    style={{ left: `${m}%` }}
                  >
                    {m}
                  </span>
                ))}
                {spectrum.slice(0, 400).map((d, i) => (
                  <span
                    key={i}
                    title={d.tier}
                    className={[
                      'absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80',
                      d.wellbeing_alert ? 'bg-coral' : TIER_BAR[d.tier] || 'bg-navy2',
                    ].join(' ')}
                    style={{
                      left: `${Math.min(98, Math.max(2, d.performance_score))}%`,
                    }}
                  />
                ))}
              </div>
            )}
            <p className="mt-2 text-[11px] text-faint">{t('h02b.spectrumHint')}</p>
          </Card>

          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Card className="!rounded-[14px] border-coral/30 bg-coral/5">
              <h2 className="text-base font-semibold">{t('h02b.tierNever')}</h2>
              <p className="mt-2 text-[13px] text-ink">
                {t('h02b.goldAlertBody', {
                  gold: data.alerts.gold_elevated,
                  total: data.alerts.total,
                  g: data.alerts.by_tier.gold ?? 0,
                  s: data.alerts.by_tier.silver ?? 0,
                  b: data.alerts.by_tier.bronze ?? 0,
                  gr: data.alerts.by_tier.growth ?? 0,
                })}
              </p>
              <Link
                to="/hr/burnout"
                className="mt-3 inline-flex text-[13px] font-semibold text-teal"
              >
                {t('h02b.reviewGold')}
              </Link>
            </Card>

            <Card className="!rounded-[14px]">
              <h2 className="text-base font-semibold">{t('h02b.movement')}</h2>
              <p className="mb-3 text-[13px] text-muted">{t('h02b.movementSub')}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-teal/15 px-2 py-3">
                  <p className="text-[22px] font-semibold text-teal ltr-nums">
                    {data.movement.up}
                  </p>
                  <p className="text-[11px] text-muted">{t('h02b.movedUp')}</p>
                </div>
                <div className="rounded-xl bg-surface-3 px-2 py-3">
                  <p className="text-[22px] font-semibold ltr-nums">
                    {data.movement.same}
                  </p>
                  <p className="text-[11px] text-muted">{t('h02b.same')}</p>
                </div>
                <div className="rounded-xl bg-coral/15 px-2 py-3">
                  <p className="text-[22px] font-semibold text-coral ltr-nums">
                    {data.movement.down}
                  </p>
                  <p className="text-[11px] text-muted">{t('h02b.movedDown')}</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Card className="!rounded-[14px]">
              <h2 className="text-base font-semibold">{t('h02b.byDept')}</h2>
              <p className="mb-3 text-[13px] text-muted">{t('h02b.byDeptSub')}</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-start text-[13px]">
                  <thead>
                    <tr className="border-b border-border font-mono text-[10px] uppercase text-muted">
                      <th className="py-2 pe-2 font-medium">{t('h02b.colDept')}</th>
                      {TIERS.map((tier) => (
                        <th key={tier} className="py-2 pe-2 font-medium">
                          {t(`h02b.tiers.${tier}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_department.map((d) => (
                      <tr key={d.department_id} className="border-b border-surface-2">
                        <td className="py-2 pe-2 font-medium">{d.department}</td>
                        {TIERS.map((tier) => (
                          <td key={tier} className="py-2 pe-2 font-mono ltr-nums">
                            {d.tiers[tier] ?? 0}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="!rounded-[14px]">
              <h2 className="text-base font-semibold">{t('h02b.byLevel')}</h2>
              <p className="mb-3 text-[13px] text-muted">{t('h02b.byLevelSub')}</p>
              <ul className="space-y-3">
                {data.by_job_level.map((row) => {
                  const total = Math.max(1, row.n)
                  return (
                    <li key={row.job_level}>
                      <p className="mb-1 text-[13px] font-medium">
                        {t('h02b.levelN', { n: row.job_level })} ·{' '}
                        <span className="text-muted ltr-nums">
                          {t('h02b.peopleN', { n: row.n })}
                        </span>
                      </p>
                      <div className="flex h-3 overflow-hidden rounded-full" dir="ltr">
                        {TIERS.map((tier) => {
                          const c = row.tiers[tier] ?? 0
                          if (!c) return null
                          return (
                            <div
                              key={tier}
                              className={TIER_BAR[tier]}
                              style={{ width: `${(100 * c) / total}%` }}
                              title={`${tier}: ${c}`}
                            />
                          )
                        })}
                      </div>
                    </li>
                  )
                })}
              </ul>
              <Badge tone="slate" className="mt-3" uppercase={false}>
                {t('h02b.countsOnly')}
              </Badge>
            </Card>
          </div>
        </>
      ) : null}
    </AppShell>
  )
}
