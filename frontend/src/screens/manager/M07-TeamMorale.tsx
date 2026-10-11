import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useManagerMorale, useManagerTeam } from '../../api/manager'
import { Button, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { managerNav } from '../../layout/navConfigs'
import { colors } from '../../theme/colors'

function fmtDelta(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n === 0) return '±0'
  return n > 0 ? `↑ ${n}` : `↓ ${Math.abs(n)}`
}

function deltaTone(n: number | null | undefined, invert = false): string {
  if (n == null || n === 0) return 'text-muted'
  const bad = invert ? n > 0 : n < 0
  return bad ? 'text-coral-dark' : 'text-teal-dark'
}

export function M07TeamMorale() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useManagerMorale()
  const team = useManagerTeam()
  const signals = data?.signals
  const series = (data?.series ?? []).map((p) => ({
    ...p,
    label: p.week_start.slice(5),
  }))

  const signalRows =
    signals && !signals.suppressed
      ? [
          {
            key: 'morale',
            label: t('m07.signalMorale'),
            value: signals.morale,
            delta: signals.morale_delta,
          },
          {
            key: 'engagement',
            label: t('m07.signalEngagement'),
            value: signals.engagement,
            delta: signals.engagement_delta,
          },
          {
            key: 'recognition',
            label: t('m07.signalRecognition'),
            value: signals.recognition_90d_avg,
            delta: signals.recognition_delta,
          },
          {
            key: 'collab',
            label: t('m07.signalCollab'),
            value: signals.collaboration,
            delta: signals.collaboration_delta,
          },
          {
            key: 'innov',
            label: t('m07.signalInnov'),
            value: signals.innovation_participation,
            delta: signals.innovation_delta,
            suffix: '%',
          },
          {
            key: 'workload',
            label: t('m07.signalWorkload'),
            value: signals.workload,
            delta: signals.workload_delta,
            suffix: '%',
            invert: true,
          },
          {
            key: 'burnout',
            label: t('m07.signalBurnout'),
            value: signals.burnout_risk_pct,
            delta: signals.burnout_delta,
            suffix: '%',
            invert: true,
          },
        ]
      : []

  const lifts: string[] = []
  if (signals && !signals.suppressed) {
    if ((signals.workload_delta ?? 0) > 0) lifts.push(t('m07.liftWorkload'))
    if ((signals.engagement_delta ?? 0) < 0) lifts.push(t('m07.liftEngage'))
    if ((signals.recognition_90d_avg ?? 100) < 70) lifts.push(t('m07.liftRecognize'))
  }
  if (lifts.length === 0) lifts.push(t('m07.liftDefault'))

  return (
    <AppShell
      config={managerNav}
      activePath="/manager/morale"
      attentionCount={team.data?.attention_count}
      chrome={{ breadcrumbPage: t('m07.title') }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('m07.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('m07.subtitle')}</p>
        </div>
        <Link
          to="/manager/pulse"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-3.5 text-[14px] font-semibold text-navy"
        >
          <Sparkles className="h-4 w-4 text-teal-dark" />
          {t('m07.factorsCta')}
        </Link>
      </div>

      {isLoading ? <p className="text-muted">{t('m07.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data ? (
        <>
          <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_340px]">
            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('m07.chartTitle')}</h2>
              <p className="mt-1 text-[13px] text-muted">
                {t('m07.chartSub', { n: data.direct_reports })}
              </p>
              {series.length === 0 ? (
                <p className="mt-8 text-sm text-muted">{t('m07.seriesSuppressed')}</p>
              ) : (
                <div className="mt-4 h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series}>
                      <CartesianGrid stroke={colors.border} vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: colors.muted }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={[40, 100]}
                        tick={{ fontSize: 10, fill: colors.faint }}
                        tickLine={false}
                        axisLine={false}
                        width={28}
                      />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="morale"
                        stroke={colors.amberDark}
                        fill={colors.amber}
                        fillOpacity={0.15}
                        strokeWidth={2.4}
                        name={t('m07.signalMorale')}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="mt-2 text-[11px] text-faint">{t('m07.eventNote')}</p>
            </Card>

            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('m07.signalsTitle')}</h2>
              {signals?.suppressed ? (
                <p className="mt-4 text-sm text-muted">{t('m07.suppressed')}</p>
              ) : (
                <ul className="mt-3 divide-y divide-border">
                  {signalRows.map((row) => (
                    <li
                      key={row.key}
                      className="flex items-center justify-between gap-2 py-2.5 text-[13px]"
                    >
                      <span>{row.label}</span>
                      <span className="flex items-center gap-2 ltr-nums">
                        <span className="font-bold">
                          {row.value == null
                            ? '—'
                            : `${Math.round(row.value)}${row.suffix ?? ''}`}
                        </span>
                        <span
                          className={`text-xs font-semibold ${deltaTone(row.delta, row.invert)}`}
                        >
                          {fmtDelta(row.delta)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('m07.themesTitle')}</h2>
              <p className="mt-1 text-[13px] text-muted">{t('m07.themesSub')}</p>
              {data.themes &&
              'suppressed' in data.themes &&
              data.themes.suppressed ? (
                <p className="mt-4 text-sm text-muted">{t('m07.themesSuppressed')}</p>
              ) : (
                <p className="mt-4 text-sm text-muted">
                  {t('common.notCollected')}
                </p>
              )}
            </Card>

            <Card className="!rounded-2xl border-teal/20 bg-gradient-to-b from-surface to-white">
              <p className="text-xs font-semibold text-teal-dark">
                {t('m07.liftTitle')}
              </p>
              <ol className="mt-4 space-y-3 text-[13px] text-ink">
                {lifts.map((line, i) => (
                  <li key={line} className="flex gap-3">
                    <span className="font-mono text-[13px] font-medium text-teal-dark">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link to="/manager/interventions">
                  <Button variant="primary">{t('m07.planActions')}</Button>
                </Link>
                <Link to="/manager/recognition">
                  <Button variant="secondary">{t('m07.recognize')}</Button>
                </Link>
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </AppShell>
  )
}
