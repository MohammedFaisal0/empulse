import {
  ArrowRight,
  Bell,
  LineChart as LineChartIcon,
  Sparkles,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  useInterventionStub,
  useManagerBurnout,
  type BurnoutPerson,
  type WeeklyTrajectoryPoint,
} from '../../api/manager'
import {
  DriverBars,
  MiniSparkline,
  RiskGauge,
} from '../../components/twin'
import { RtlFlip } from '../../components/RtlFlip'
import { Avatar, Badge, Button, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { managerNav } from '../../layout/navConfigs'
import { colors } from '../../theme/colors'

function signPts(n: number): string {
  return n > 0 ? '+' : n < 0 ? '' : '+'
}

function formatDetected(iso: string | null, locale: string): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString(locale.startsWith('ar') ? 'ar' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

function takeSeries(
  traj: WeeklyTrajectoryPoint[],
  key: keyof WeeklyTrajectoryPoint,
  n = 8,
): number[] {
  return traj.slice(-n).map((w) => Number(w[key] ?? 0))
}

/** Rough hours/wk proxy from workload_index (0–100). */
function hoursProxy(workload: number): number {
  return Math.round(30 + workload * 0.25)
}

export function M06BurnoutEarlyWarning() {
  const { t, i18n } = useTranslation()
  const { data, isLoading, isError } = useManagerBurnout()
  const attention = useMemo(
    () => (data?.people ?? []).filter((p) => p.burnout_risk_pct >= 60),
    [data],
  )
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selected: BurnoutPerson | undefined =
    attention.find((p) => p.id === selectedId) ?? attention[0]
  const stub = useInterventionStub(selected?.id)
  const [stubMsg, setStubMsg] = useState<string | null>(null)

  const projectedNoChange = selected
    ? Math.min(100, selected.burnout_risk_pct + 9)
    : 0
  const projectedWithPlan = selected
    ? Math.max(0, selected.burnout_risk_pct - 23)
    : 0

  const chartData = useMemo(() => {
    if (!selected) return []
    const hist = selected.trajectory.map((w) => ({
      label: w.week_start.slice(5),
      risk: w.burnout_risk_pct,
      plan: null as number | null,
    }))
    return [
      ...hist,
      {
        label: 'Now',
        risk: selected.burnout_risk_pct,
        plan: selected.burnout_risk_pct,
      },
      {
        label: '+4w',
        risk: projectedNoChange,
        plan: projectedWithPlan,
      },
    ]
  }, [selected, projectedNoChange, projectedWithPlan])

  const evidence = useMemo(() => {
    if (!selected) return null
    const traj = selected.trajectory
    const workload = takeSeries(traj, 'workload_index')
    const engagement = takeSeries(traj, 'engagement_score')
    const overtime = takeSeries(traj, 'overtime_hours_monthly')
    const hours = workload.map(hoursProxy)
    return {
      hours,
      engagement,
      overtime,
      hoursFrom: hours.length >= 2 ? hours[0]! : null,
      hoursTo: hours.length >= 2 ? hours[hours.length - 1]! : null,
      engagementFrom:
        engagement.length >= 2 ? Math.round(engagement[0]!) : null,
      engagementTo:
        engagement.length >= 2
          ? Math.round(engagement[engagement.length - 1]!)
          : null,
      overtimeFrom:
        overtime.length >= 2 ? Math.round(overtime[0]! / 4) : null,
      overtimeTo:
        overtime.length >= 2
          ? Math.round(overtime[overtime.length - 1]! / 4)
          : null,
      // TODO: open-tasks series not in weekly_metrics API — design copy for Khalid
      openTasksFrom: 9,
      openTasksTo: 16,
      openTasksSeries: [9, 10, 11, 12, 13, 14, 15, 16],
    }
  }, [selected])

  const driverRows = useMemo(() => {
    if (!selected) return []
    return [
      {
        id: 'baseline',
        label: t('m06.baseline'),
        ptsLabel: t('m06.pts', { n: selected.burnout_6w_ago_pct }),
        note: t('m06.sixWeeksAgo'),
        widthPct: selected.burnout_6w_ago_pct,
        muted: true,
      },
      ...selected.drivers.increasing.slice(0, 4).map((d) => ({
        id: d.feature,
        label: d.label,
        ptsLabel: t('m06.signedPts', {
          sign: d.impact_pts >= 0 ? '+' : '',
          n: Math.round(Math.abs(d.impact_pts)),
        }),
        note: `${d.value} · ${t('m06.vsBaseline')}`,
        widthPct: Math.min(100, Math.abs(d.impact_pts) * 6),
      })),
    ]
  }, [selected, t])

  return (
    <AppShell
      config={managerNav}
      activePath="/manager/burnout"
      attentionCount={data?.attention_count}
      chrome={{
        breadcrumbPage: t('m06.title'),
      }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('m06.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            {t('m06.subtitle', { count: data?.attention_count ?? '—' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">
            <Bell className="h-4 w-4" />
            {t('m06.notifySettings')}
          </Button>
          <Button variant="primary">
            <Sparkles className="h-4 w-4" />
            {t('m06.explainRisk')}
          </Button>
        </div>
      </div>

      {isLoading ? <p className="text-muted">{t('m06.loading')}</p> : null}
      {isError ? (
        <p className="text-coral-dark">{t('errors.error.unknown')}</p>
      ) : null}

      {data && attention.length === 0 ? (
        <Card>
          <p className="text-muted">{t('m06.empty')}</p>
        </Card>
      ) : null}

      {data && attention.length > 0 && selected && evidence ? (
        <>
          <div className="mb-4 flex flex-wrap items-stretch gap-3">
            {attention.slice(0, 5).map((person) => {
              const active = person.id === selected.id
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => setSelectedId(person.id)}
                  className={[
                    'min-w-[220px] flex-1 rounded-xl border bg-white px-3 py-3 text-start shadow-card',
                    active ? 'border-coral ring-1 ring-coral' : 'border-border',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-2.5">
                    <Avatar name={person.full_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {person.full_name}
                      </p>
                      <p className="truncate text-xs text-muted">{person.job_title}</p>
                    </div>
                    <div className="text-end">
                      <p className="ltr-nums text-xl font-bold text-coral-dark">
                        {person.burnout_risk_pct}%
                      </p>
                      <p className="ltr-nums text-[11.5px] text-coral-dark">
                        {t('m06.changeInWeeks', {
                          sign: signPts(person.burnout_change_6w_pts),
                          pts: person.burnout_change_6w_pts,
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
            <div className="flex min-w-[160px] items-center gap-4 rounded-xl border border-border bg-white px-4 py-3 shadow-card">
              <div>
                <p className="font-mono text-[11px] tracking-wide text-muted">
                  {t('m06.watch')}
                </p>
                <p className="ltr-nums text-xl font-semibold">{data.watch_count}</p>
              </div>
              <div>
                <p className="font-mono text-[11px] tracking-wide text-muted">
                  {t('m06.healthy')}
                </p>
                <p className="ltr-nums text-xl font-semibold">{data.healthy_count}</p>
              </div>
              <p className="max-w-[90px] text-[11.5px] text-muted">
                {t('m06.ofReports', { count: data.direct_reports })}
              </p>
            </div>
          </div>

          <Card className="mb-4 !p-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-gradient-to-b from-coral-light to-white px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={selected.full_name} />
                <div>
                  <p className="text-base font-semibold text-ink">
                    {t('m06.earlyWarning', { name: selected.full_name })}
                  </p>
                  <p className="text-[12.5px] text-muted">
                    {t('m06.metaLine', {
                      title: selected.job_title,
                      team: selected.team ?? '—',
                      manager: selected.manager_name ?? '—',
                    })}{' '}
                    {t('m06.detected')}{' '}
                    <span className="ltr-nums">
                      {formatDetected(selected.detected_on, i18n.language)}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="amber">
                  {selected.performance_tier.toUpperCase()} {selected.performance_score}
                </Badge>
                <span className="text-xs text-muted">{t('m06.goldTierAlert')}</span>
                <Badge tone="slate">{t('m06.similarCases')}</Badge>
                <Link
                  to={`/manager/members/${selected.id}`}
                  className="text-[13px] font-semibold text-teal-dark"
                >
                  {t('m06.digitalTwin')}
                </Link>
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-5">
              <section className="border-b border-border p-4 lg:border-b-0 lg:border-e">
                <HeaderStep n={1} label={t('m06.risk')} tone="coral" />
                <p className="ltr-nums mt-3 text-[38px] font-bold leading-none text-coral-dark">
                  {selected.burnout_risk_pct}
                  <span className="text-xl">%</span>
                </p>
                <p className="mt-2 text-[12.5px] text-muted">{t('m06.elevatedRising')}</p>
                <RiskGauge
                  riskPct={selected.burnout_risk_pct}
                  agoPct={selected.burnout_6w_ago_pct}
                  projectedPct={projectedNoChange}
                  labels={{
                    low: t('m06.low'),
                    watch: t('m06.watchBand'),
                    elevated: t('m06.elevated'),
                    critical: t('m06.critical'),
                    weeksAgo: t('m06.weeksAgo', {
                      pct: selected.burnout_6w_ago_pct,
                    }),
                    now: t('m06.now', { pct: selected.burnout_risk_pct }),
                    inThreeWeeks: t('m06.inThreeWeeksEstimate', {
                      pct: projectedNoChange,
                    }),
                  }}
                />
                <div className="mt-4 rounded-lg bg-surface p-2.5 text-xs">
                  <p>
                    <span className="font-bold">{t('m06.horizon')}</span>{' '}
                    {t('m06.horizonValue')}
                  </p>
                  <p>
                    <span className="font-bold">{t('m06.confidence')}</span>{' '}
                    <span className="ltr-nums">{t('m06.confidenceValue')}</span>
                  </p>
                </div>
              </section>

              <section className="border-b border-border p-4 lg:border-b-0 lg:border-e">
                <HeaderStep n={2} label={t('m06.rootCauses')} tone="coral" />
                <div className="mt-3">
                  <DriverBars
                    rows={driverRows}
                    footerLabel={t('m06.currentRisk')}
                    footerValue={`${selected.burnout_risk_pct}%`}
                  />
                </div>
              </section>

              <section className="border-b border-border p-4 lg:border-b-0 lg:border-e">
                <HeaderStep n={3} label={t('m06.evidence')} tone="navy" />
                <div className="mt-3 space-y-1 text-[12.5px]">
                  <EvidenceSpark
                    label={t('m06.hoursLogged')}
                    from={evidence.hoursFrom}
                    to={evidence.hoursTo}
                    unit="h"
                    series={evidence.hours}
                    stroke={colors.coral}
                  />
                  <EvidenceSpark
                    label={t('m06.openTasks')}
                    from={evidence.openTasksFrom}
                    to={evidence.openTasksTo}
                    series={evidence.openTasksSeries}
                    stroke={colors.coral}
                    todo
                  />
                  <EvidenceSpark
                    label={t('m06.engagementPulse')}
                    from={evidence.engagementFrom}
                    to={evidence.engagementTo}
                    series={evidence.engagement}
                    stroke={colors.coral}
                  />
                  <EvidenceSpark
                    label={t('m06.afterHours')}
                    from={evidence.overtimeFrom}
                    to={evidence.overtimeTo}
                    unit="/ wk"
                    series={evidence.overtime}
                    stroke={colors.coral}
                  />
                  <div className="rounded-lg bg-surface p-2.5 text-xs text-ink">
                    {t('m06.energyNote', { name: selected.first_name })}
                  </div>
                </div>
              </section>

              <section className="border-b border-border p-4 lg:border-b-0 lg:border-e">
                <HeaderStep n={4} label={t('m06.recommended')} tone="teal" />
                <div className="mt-3 space-y-2">
                  <ActionCard
                    title={t('m06.actionReallocate')}
                    detail={t('m06.actionReallocateDetail')}
                    pts="-11"
                  />
                  <ActionCard
                    title={t('m06.actionCheckin')}
                    detail={t('m06.actionCheckinDetail')}
                    pts="-5"
                  />
                  <ActionCard
                    title={t('m06.actionReview')}
                    detail={t('m06.actionReviewDetail')}
                    pts="-7"
                  />
                  <div className="rounded-lg bg-teal-light px-3 py-2 text-[12.5px]">
                    <p className="font-semibold">{t('m06.projected')}</p>
                    <p className="ltr-nums mt-1 flex items-center gap-1.5 font-bold">
                      <span className="text-coral-dark">{selected.burnout_risk_pct}%</span>
                      <RtlFlip>
                        <ArrowRight className="h-3.5 w-3.5 text-ink" />
                      </RtlFlip>
                      <span className="text-teal-dark">{projectedWithPlan}%</span>
                    </p>
                  </div>
                  <Button
                    variant="accent"
                    className="w-full !bg-coral-dark"
                    onClick={() => {
                      stub.mutate('start', {
                        onSuccess: () => setStubMsg(t('m06.stubOk')),
                      })
                    }}
                  >
                    {t('m06.startIntervention')}
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      stub.mutate('simulate', {
                        onSuccess: () => setStubMsg(t('m06.stubOk')),
                      })
                    }}
                  >
                    <LineChartIcon className="h-4 w-4" />
                    {t('m06.simulateImpact')}
                  </Button>
                  {stubMsg ? (
                    <p className="text-xs text-teal-dark">{stubMsg}</p>
                  ) : null}
                </div>
              </section>

              <section className="p-4">
                <HeaderStep n={5} label={t('m06.followUp')} tone="teal" />
                <ol className="relative mt-4 space-y-4 border-s-2 border-border ps-4">
                  {[
                    [t('m06.followToday'), t('m06.followPlan')],
                    [t('m06.followCheckin'), ''],
                    [t('m06.followTasks'), ''],
                    [t('m06.followReview'), ''],
                    [t('m06.followOutcome'), ''],
                  ].map(([title, detail], idx) => (
                    <li key={title} className="relative">
                      <span
                        className={[
                          'absolute -start-[21px] top-1 h-3.5 w-3.5 rounded-full border-2',
                          idx === 0
                            ? 'border-teal bg-teal'
                            : 'border-border bg-white',
                        ].join(' ')}
                      />
                      <p className="text-[13px] font-semibold text-ink">{title}</p>
                      {detail ? (
                        <p className="text-xs text-muted">{detail}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="mb-3 text-sm font-semibold">{t('m06.trajectory')}</h3>
              <div className="h-56" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="risk"
                      stroke={colors.coral}
                      strokeWidth={2}
                      dot={false}
                      name={t('m06.ifNothing')}
                    />
                    <Line
                      type="monotone"
                      dataKey="plan"
                      stroke={colors.tealDark}
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                      name={t('m06.withPlan')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <h3 className="mb-3 text-sm font-semibold">{t('m06.signals')}</h3>
              <div className="space-y-3">
                {selected.drivers.increasing.slice(0, 4).map((d) => (
                  <div key={d.feature}>
                    <div className="mb-1 flex justify-between text-[13px]">
                      <span>{d.label}</span>
                      <span className="ltr-nums font-mono text-coral-dark">
                        +{Math.round(d.impact_pts)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full rounded-full bg-coral"
                        style={{
                          width: `${Math.min(100, Math.abs(d.impact_pts) * 5)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-lg bg-surface px-3 py-2 text-[12px] text-muted">
                {t('m06.signalsNote', { name: selected.first_name })}
              </p>
            </Card>
          </div>
        </>
      ) : null}
    </AppShell>
  )
}

function HeaderStep({
  n,
  label,
  tone,
}: {
  n: number
  label: string
  tone: 'coral' | 'navy' | 'teal'
}) {
  const bg =
    tone === 'coral' ? 'bg-coral' : tone === 'navy' ? 'bg-navy' : 'bg-teal-dark'
  return (
    <div className="flex items-center gap-2">
      <span
        className={[
          'inline-flex h-[22px] w-[22px] items-center justify-center rounded-md font-mono text-[11px] text-white',
          bg,
        ].join(' ')}
      >
        {n}
      </span>
      <span className="text-[13px] font-semibold text-ink">{label}</span>
    </div>
  )
}

function EvidenceSpark({
  label,
  from,
  to,
  unit,
  series,
  stroke,
  todo,
}: {
  label: string
  from: number | null
  to: number | null
  unit?: string
  series: number[]
  stroke: string
  todo?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between gap-2 border-b border-surface-2 py-2.5">
      <div className="min-w-0">
        <p className="text-ink">
          {label}
          {todo ? (
            <span className="ms-1 font-mono text-[9px] text-faint">
              {/* open-tasks series missing from API */}
              {t('common.projected')}
            </span>
          ) : null}
        </p>
        <p className="ltr-nums flex items-center gap-1 font-mono text-[11.5px] text-muted">
          {from == null || to == null ? (
            '—'
          ) : (
            <>
              {from}
              <RtlFlip>
                <ArrowRight className="h-3 w-3" />
              </RtlFlip>
              {to}
              {unit ? ` ${unit}` : null}
            </>
          )}
        </p>
      </div>
      <MiniSparkline values={series} stroke={stroke} />
    </div>
  )
}

function ActionCard({
  title,
  detail,
  pts,
}: {
  title: string
  detail: string
  pts: string
}) {
  return (
    <div className="rounded-[10px] border border-border bg-white px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        <span className="ltr-nums shrink-0 font-mono text-[11.5px] text-teal-dark">
          {pts} pts
        </span>
      </div>
      <p className="mt-1 text-[11.5px] text-muted">{detail}</p>
    </div>
  )
}
