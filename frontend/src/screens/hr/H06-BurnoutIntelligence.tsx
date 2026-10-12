import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useHrBurnoutIntelligence } from '../../api/hr'
import { RtlFlip } from '../../components/RtlFlip'
import { Card, Stat } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { hrNav } from '../../layout/navConfigs'
import { colors } from '../../theme/colors'

function heatBg(pct: number | undefined, suppressed?: boolean): string {
  if (suppressed || pct == null) return 'bg-surface-3 text-faint'
  if (pct >= 55) return 'bg-coral/80 text-ink'
  if (pct >= 45) return 'bg-amber/70 text-ink'
  if (pct >= 35) return 'bg-amber/40 text-ink'
  return 'bg-teal/40 text-ink'
}

const actionKey: Record<string, string> = {
  headcount_approval: 'h06.actionHeadcount',
  recognition_program: 'h06.actionRecog',
  shift_policy: 'h06.actionShift',
  policy_review: 'h06.actionPolicy',
}

export function H06BurnoutIntelligence() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useHrBurnoutIntelligence()
  const depts = [
    ...new Set(
      (data?.heatmap.cells ?? [])
        .map((c) => c.department)
        .filter((d): d is string => Boolean(d)),
    ),
  ].sort()
  const lookup = new Map(
    (data?.heatmap.cells ?? []).map((c) => [`${c.department}|${c.week}`, c]),
  )
  const forecast = data?.kpis.forecast_q4

  return (
    <AppShell
      config={hrNav}
      activePath="/hr/burnout"
      chrome={{
        breadcrumbPrimary: t('h06.breadcrumbOrg'),
        breadcrumbPage: t('h06.title'),
      }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('h06.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('h06.subtitle')}</p>
        </div>
        <Link
          to="/hr/pulseai"
          className="rounded-[11px] border border-teal bg-teal-light/40 px-3.5 py-2 text-[14px] font-semibold text-teal-dark"
        >
          {t('h06.systemicQ')}
        </Link>
      </div>

      {isLoading ? <p className="text-muted">{t('h06.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="!rounded-[14px]">
              <Stat
                label={t('h06.elevated')}
                value={String(data.kpis.elevated_count)}
                delta={t('h06.wasJuly', { n: data.kpis.elevated_was_july })}
                deltaTone="down"
              />
            </Card>
            <Card className="!rounded-[14px]">
              <Stat
                label={t('h06.share')}
                value={`${data.kpis.share_pct}%`}
                delta={t('h06.target', { n: data.kpis.target_pct })}
              />
            </Card>
            <Card className="!rounded-[14px]">
              <Stat
                label={t('h06.forecast')}
                value={
                  forecast?.low != null && forecast.high != null
                    ? `${forecast.low} – ${forecast.high}`
                    : '—'
                }
                delta={
                  forecast?.projected
                    ? t('h06.forecastNote')
                    : t('common.notCollected')
                }
              />
              {forecast?.projected ? (
                <p className="mt-1 text-[11px] text-amber-dark">
                  {t('common.projected')}
                </p>
              ) : null}
            </Card>
            <Card className="!rounded-[14px]">
              <Stat
                label={t('h06.intervSuccess')}
                value={
                  data.kpis.intervention_success_pct != null
                    ? `${data.kpis.intervention_success_pct}%`
                    : '—'
                }
                delta={
                  data.kpis.avg_risk_drop_pts != null
                    ? t('h06.riskDrop', { n: data.kpis.avg_risk_drop_pts })
                    : t('common.notCollected')
                }
              />
            </Card>
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card className="!rounded-[14px]">
              <h2 className="text-base font-semibold">{t('h06.heatmap')}</h2>
              <p className="text-[13px] text-muted">{t('h06.heatmapSub')}</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] text-[11px]">
                  <thead>
                    <tr className="font-mono text-[10px] text-muted">
                      <th className="px-1 py-1 text-start">{t('h06.department')}</th>
                      {data.heatmap.weeks.map((w, i) => (
                        <th key={w} className="px-0.5 py-1 text-center">
                          W{i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {depts.map((dept) => (
                      <tr key={dept}>
                        <td className="px-1 py-1 font-semibold">{dept}</td>
                        {data.heatmap.weeks.map((w) => {
                          const cell = lookup.get(`${dept}|${w}`)
                          return (
                            <td key={w} className="px-0.5 py-1">
                              <div
                                className={[
                                  'rounded px-0.5 py-1 text-center font-mono font-bold ltr-nums',
                                  heatBg(cell?.burnout_risk_pct, cell?.suppressed),
                                ].join(' ')}
                              >
                                {cell?.suppressed
                                  ? '—'
                                  : cell?.burnout_risk_pct != null
                                    ? Math.round(cell.burnout_risk_pct)
                                    : '—'}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] text-faint">{t('h06.heatmapFoot')}</p>
            </Card>

            <Card className="!rounded-[14px]">
              <h2 className="text-base font-semibold">{t('h06.drivers')}</h2>
              <p className="text-[13px] text-muted">{t('h06.driversSub')}</p>
              <div className="mt-3 h-[240px]" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.drivers}
                    layout="vertical"
                    margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
                  >
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={130}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip />
                    <Bar dataKey="pct" radius={[0, 6, 6, 0]}>
                      {data.drivers.map((d, i) => (
                        <Cell
                          key={d.id}
                          fill={i === 0 ? colors.coral : i < 3 ? colors.amber : colors.tealDark}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card className="mb-4 !rounded-[14px]">
            <h2 className="text-base font-semibold">{t('h06.tierTitle')}</h2>
            <p className="text-[13px] text-muted">
              {t('h06.tierSub', { n: data.kpis.elevated_count })}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(['gold', 'silver', 'bronze', 'growth'] as const).map((k) => {
                const row = data.tier_elevated[k]
                return (
                  <div
                    key={k}
                    className="rounded-xl border border-border px-3 py-3 text-center"
                  >
                    <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted">
                      {k}
                    </p>
                    <p className="mt-1 text-[22px] font-semibold ltr-nums">
                      {row?.at_risk ?? 0}{' '}
                      <span className="text-[13px] text-muted">
                        {t('h06.of')} {row?.total ?? 0}
                      </span>
                    </p>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card className="!rounded-[14px]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">{t('h06.hotspots')}</h2>
                <p className="text-[13px] text-muted">{t('h06.hotspotsSub')}</p>
              </div>
              <Link
                to="/hr/simulator?scope=organization"
                className="inline-flex items-center gap-2 rounded-[11px] bg-teal px-3.5 py-2 text-[14px] font-semibold text-navy"
              >
                {t('h06.simulatePolicy')}
                <RtlFlip>
                  <ArrowRight className="h-4 w-4" />
                </RtlFlip>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border font-mono text-[10.5px] text-muted">
                    <th className="px-3 py-2 text-start">{t('h06.colTeam')}</th>
                    <th className="px-3 py-2 text-start">{t('h06.colDept')}</th>
                    <th className="px-3 py-2 text-start">{t('h06.colRisk')}</th>
                    <th className="px-3 py-2 text-start">{t('h06.colDriver')}</th>
                    <th className="px-3 py-2 text-end">{t('h06.colAction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.hotspots.map((h) => (
                    <tr key={h.team_id} className="border-b border-surface-2">
                      <td className="px-3 py-2.5 font-semibold">{h.team}</td>
                      <td className="px-3 py-2.5 text-muted">{h.department}</td>
                      <td className="px-3 py-2.5 font-mono ltr-nums text-coral-dark">
                        {h.burnout_risk_pct != null
                          ? `${Math.round(h.burnout_risk_pct)}%`
                          : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-muted">
                        {t(`h06.driver.${h.driver}`)}
                      </td>
                      <td className="px-3 py-2.5 text-end">
                        <span className="rounded-lg bg-surface-3 px-2.5 py-1 text-[12px] font-semibold">
                          {t(actionKey[h.action] ?? 'h06.actionPolicy')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] text-faint">{t('h06.noPeopleRank')}</p>
          </Card>
        </>
      ) : null}
    </AppShell>
  )
}
