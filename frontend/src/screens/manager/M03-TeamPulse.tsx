import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts'

import { useManagerTeam } from '../../api/manager'
import { DriverBars } from '../../components/twin'
import { Button, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { managerNav } from '../../layout/navConfigs'
import { colors } from '../../theme/colors'

export function M03TeamPulse() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useManagerTeam()
  const agg = data?.aggregates
  const dept = data?.department_benchmark
  const prior = data?.trend?.[0]
  const drivers = data?.team_drivers ?? []
  const maxImpact = Math.max(1, ...drivers.map((d) => Math.abs(d.impact_pts)))

  const pulses =
    agg && !agg.suppressed
      ? [
          {
            key: 'PERF',
            label: t('m03.perf'),
            now: agg.performance_score,
            prior: prior?.performance_score ?? null,
          },
          {
            key: 'INNOV',
            label: t('m03.innov'),
            now: agg.innovation_score,
            prior: null as number | null,
          },
          {
            key: 'COLLAB',
            label: t('m03.collab'),
            now: agg.collaboration_score,
            prior: null as number | null,
          },
          {
            key: 'PROF',
            label: t('m03.prof'),
            now: null as number | null,
            prior: null,
            missing: true,
          },
          {
            key: 'DIGITAL',
            label: t('m03.digital'),
            now: null as number | null,
            prior: null,
            missing: true,
          },
          {
            key: 'ENGAGE',
            label: t('m03.engage'),
            now: agg.engagement_score,
            prior: prior?.engagement_score ?? null,
          },
          {
            key: 'WELL',
            label: t('m03.well'),
            now: agg.wellbeing_score,
            prior: prior?.wellbeing_score ?? null,
          },
        ]
      : []

  const radarData = pulses.map((p) => ({
    axis: p.key,
    now: p.now ?? 0,
    prior: p.prior ?? 0,
  }))

  const driverRows = drivers.slice(0, 6).map((d) => ({
    id: d.feature,
    label: d.label,
    ptsLabel: t('m06.signedPts', {
      sign: d.impact_pts >= 0 ? '+' : '',
      n: Math.round(Math.abs(d.impact_pts)),
    }),
    note:
      d.value != null
        ? t('m03.driverValue', { value: d.value, n: d.n })
        : t('m03.driverN', { n: d.n }),
    widthPct: (Math.abs(d.impact_pts) / maxImpact) * 100,
  }))

  return (
    <AppShell
      config={managerNav}
      activePath="/manager/pulse"
      attentionCount={data?.attention_count}
      chrome={{ breadcrumbPage: t('m03.title') }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('m03.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('m03.subtitle')}</p>
        </div>
        <Button variant="secondary">
          <Sparkles className="h-4 w-4" />
          {t('m03.explain')}
        </Button>
      </div>

      {isLoading ? <p className="text-muted">{t('m03.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('errors.error.unknown')}</p> : null}

      {agg?.suppressed ? (
        <Card>
          <p className="text-muted">{t('m03.suppressed')}</p>
        </Card>
      ) : null}

      {agg && !agg.suppressed ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">{t('m03.pulseCard')}</h2>
                <p className="text-[12.5px] text-muted">
                  {t('m03.pulseCardSub', { team: data?.team ?? '—' })}
                </p>
              </div>
              {(agg.burnout_risk_pct ?? 0) >= 45 ? (
                <span className="rounded-lg bg-coral-light px-2 py-1 text-[11px] font-semibold text-coral-dark">
                  {t('m03.wellbeingAlert')}
                </span>
              ) : null}
            </div>
            <div className="h-72" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke={colors.border} />
                  <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} />
                  <Radar
                    name={t('m03.prior')}
                    dataKey="prior"
                    stroke={colors.border}
                    fill={colors.border}
                    fillOpacity={0.25}
                    strokeDasharray="4 4"
                  />
                  <Radar
                    name={t('m03.now')}
                    dataKey="now"
                    stroke={colors.tealDark}
                    fill={colors.tealDark}
                    fillOpacity={0.2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <table className="mt-2 w-full text-[13px]">
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-wide text-faint">
                  <th className="py-1 text-start">{t('m03.colSignal')}</th>
                  <th className="py-1 text-end">{t('m03.prior')}</th>
                  <th className="py-1 text-end">{t('m03.now')}</th>
                </tr>
              </thead>
              <tbody>
                {pulses.map((p) => (
                  <tr key={p.key} className="border-t border-surface-2">
                    <td className="py-1.5">
                      {p.label}
                      {'missing' in p && p.missing ? (
                        <span className="ms-2 text-[11px] text-faint">
                          {t('common.notCollected')}
                        </span>
                      ) : null}
                    </td>
                    <td className="ltr-nums py-1.5 text-end font-mono text-muted">
                      {p.prior == null ? '—' : Math.round(p.prior)}
                    </td>
                    <td className="ltr-nums py-1.5 text-end font-mono">
                      {p.now == null ? '—' : Math.round(p.now)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="space-y-4">
            <Card>
              <h2 className="mb-2 text-sm font-semibold">{t('m03.whyChanged')}</h2>
              <p className="mb-3 text-xs text-muted">{t('m03.whyChangedSub')}</p>
              {driverRows.length > 0 ? (
                <DriverBars rows={driverRows} />
              ) : (
                <p className="text-xs text-muted">{t('m03.noDrivers')}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/manager/interventions">
                  <Button variant="primary">{t('m03.planRelief')}</Button>
                </Link>
                <Link to="/manager/recognition">
                  <Button variant="secondary">{t('m03.recognizeTeam')}</Button>
                </Link>
              </div>
            </Card>

            <Card>
              <h2 className="mb-2 text-sm font-semibold">{t('m03.vsDept')}</h2>
              {dept?.suppressed ? (
                <p className="text-xs text-muted">{t('m03.deptSuppressed')}</p>
              ) : dept && !dept.suppressed ? (
                <div className="space-y-2 text-[13px]">
                  <p className="text-xs text-muted">
                    {t('m03.deptLine', {
                      name: dept.department ?? '—',
                      n: dept.n,
                    })}
                  </p>
                  <Compare
                    label={t('m03.perf')}
                    team={agg.performance_score}
                    dept={dept.performance_score}
                  />
                  <Compare
                    label={t('m03.engage')}
                    team={agg.engagement_score}
                    dept={dept.engagement_score}
                  />
                  <Compare
                    label={t('m03.well')}
                    team={agg.wellbeing_score}
                    dept={dept.wellbeing_score}
                  />
                  <Compare
                    label={t('m03.innov')}
                    team={agg.innovation_score}
                    dept={dept.innovation_score}
                  />
                  <Compare
                    label={t('m03.collab')}
                    team={agg.collaboration_score}
                    dept={dept.collaboration_score}
                  />
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}

function Compare({
  label,
  team,
  dept,
}: {
  label: string
  team: number | null
  dept: number | null
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-surface-2 py-1.5">
      <span>{label}</span>
      <span className="ltr-nums font-mono text-muted">
        {team == null ? '—' : Math.round(team)} /{' '}
        {dept == null ? '—' : Math.round(dept)}
      </span>
    </div>
  )
}
