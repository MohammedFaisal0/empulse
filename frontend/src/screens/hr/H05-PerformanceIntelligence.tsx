import { ArrowRight, AlertTriangle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useHrPerformance } from '../../api/hr'
import { RtlFlip } from '../../components/RtlFlip'
import { Avatar, Badge, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { hrNav } from '../../layout/navConfigs'
import { colors } from '../../theme/colors'

function Spark({ values }: { values: number[] }) {
  if (!values.length) return <span className="text-faint">—</span>
  const min = Math.min(...values)
  const max = Math.max(...values)
  const w = 56
  const h = 18
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * w
      const y = h - ((v - min) / Math.max(1, max - min)) * (h - 2) - 1
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg width={w} height={h} className="ltr" aria-hidden>
      <polyline fill="none" stroke={colors.tealDark} strokeWidth="1.5" points={pts} />
    </svg>
  )
}

export function H05PerformanceIntelligence() {
  const { t } = useTranslation()
  const [departmentId, setDepartmentId] = useState<number | undefined>()
  const [teamId, setTeamId] = useState<number | undefined>()
  const [weeks, setWeeks] = useState(26)
  const { data, isLoading, isError } = useHrPerformance({
    departmentId,
    teamId,
    weeks,
  })

  const chartData = useMemo(
    () =>
      (data?.series ?? []).map((s) => ({
        ...s,
        label: s.week_start.slice(5),
      })),
    [data?.series],
  )

  const chain = data?.chain
  const mid = chartData[Math.floor(chartData.length * 0.55)]?.label
  const end = chartData[chartData.length - 1]?.label

  return (
    <AppShell
      config={hrNav}
      activePath="/hr/performance"
      chrome={{
        breadcrumbPrimary: t('h05.breadcrumbOrg'),
        breadcrumbPage: t('h05.title'),
      }}
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('h05.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('h05.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/hr/pulseai"
            className="rounded-[11px] border border-teal bg-teal-light/40 px-3.5 py-2 text-[14px] font-semibold text-teal-dark"
          >
            {t('h05.whyDrop')}
          </Link>
          <Link
            to={`/hr/simulator?scope=${teamId ? 'team' : departmentId ? 'department' : 'organization'}${
              teamId
                ? `&team_id=${teamId}`
                : departmentId
                  ? `&department_id=${departmentId}`
                  : ''
            }`}
            className="inline-flex items-center gap-2 rounded-[11px] bg-navy px-3.5 py-2 text-[14px] font-semibold text-white"
          >
            {t('h05.simulate')}
            <RtlFlip>
              <ArrowRight className="h-4 w-4 text-teal-lighter" />
            </RtlFlip>
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          className="h-10 rounded-xl border border-border bg-white px-3 text-[13px]"
          value={departmentId ?? ''}
          onChange={(e) => {
            const v = e.target.value ? Number(e.target.value) : undefined
            setDepartmentId(v)
            setTeamId(undefined)
          }}
        >
          <option value="">{t('h05.allDepts')}</option>
          {(data?.filters.departments ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-xl border border-border bg-white px-3 text-[13px]"
          value={teamId ?? ''}
          onChange={(e) =>
            setTeamId(e.target.value ? Number(e.target.value) : undefined)
          }
          disabled={!departmentId}
        >
          <option value="">{t('h05.allTeams')}</option>
          {(data?.filters.teams ?? []).map((tm) => (
            <option key={tm.id} value={tm.id}>
              {tm.name}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-xl border border-border bg-white px-3 text-[13px]"
          value={weeks}
          onChange={(e) => setWeeks(Number(e.target.value))}
        >
          <option value={26}>{t('h05.weeks26')}</option>
          <option value={12}>{t('h05.weeks12')}</option>
          <option value={52}>{t('h05.weeks52')}</option>
        </select>
      </div>

      {isLoading ? <p className="text-muted">{t('h05.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data ? (
        <>
          <Card className="mb-4 !rounded-[14px]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">{t('h05.chainTitle')}</h2>
                <p className="text-[13px] text-muted">{t('h05.chainSub')}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-[11px] border border-border px-3 py-1.5 text-[13px] font-semibold"
                >
                  {t('h05.showEvidence')}
                </button>
                <Link
                  to="/hr/burnout"
                  className="inline-flex items-center gap-1.5 rounded-[11px] bg-coral-dark px-3 py-1.5 text-[13px] font-semibold text-white"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t('h05.viewRoot')}
                </Link>
              </div>
            </div>
            {chain ? (
              <div className="flex flex-wrap items-stretch gap-2">
                {[
                  {
                    label: t('h05.workload'),
                    value: `${chain.workload.delta_pct >= 0 ? '+' : ''}${chain.workload.delta_pct}%`,
                  },
                  {
                    label: t('h05.overtime'),
                    value: `${chain.overtime.delta_h >= 0 ? '+' : ''}${chain.overtime.delta_h} h/wk`,
                  },
                  {
                    label: t('h05.engagement'),
                    value: `${chain.engagement.delta} pts`,
                  },
                  {
                    label: t('h05.burnout'),
                    value: `${Math.round(chain.burnout_risk_pct.from)} → ${Math.round(chain.burnout_risk_pct.to)}`,
                  },
                  {
                    label: t('h05.performance'),
                    value: `${Math.round(chain.performance.from)} → ${Math.round(chain.performance.to)}`,
                  },
                ].map((step, i) => (
                  <div key={step.label} className="flex items-center gap-2">
                    <div className="min-w-[110px] rounded-xl border border-border bg-surface px-3 py-2.5">
                      <p className="font-mono text-[10px] text-muted">{step.label}</p>
                      <p className="text-[17px] font-semibold ltr-nums">{step.value}</p>
                    </div>
                    {i < 4 ? (
                      <RtlFlip>
                        <ArrowRight className="h-4 w-4 text-faint" />
                      </RtlFlip>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted">
                {t('common.dash')} — {t('common.notCollected')}
              </p>
            )}
            {chain?.annotation_note === 'not_collected_roles' ? (
              <p className="mt-2 text-[11px] text-faint">
                {t('h05.rolesTodo')}
              </p>
            ) : null}
          </Card>

          <div className="mb-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <Card className="!rounded-[14px]">
              <h2 className="text-base font-semibold">
                {t('h05.linkedSignals', { scope: data.scope.label })}
              </h2>
              <p className="text-[13px] text-muted">{t('h05.linkedSub')}</p>
              <div className="mt-3 h-[280px]" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: colors.muted }} />
                    <YAxis domain={[0, 140]} tick={{ fontSize: 9 }} width={28} />
                    <Tooltip />
                    {mid && end ? (
                      <ReferenceArea
                        x1={mid}
                        x2={end}
                        fill="#fef5e4"
                        fillOpacity={0.7}
                        label={{
                          value: t('h05.workloadRamp'),
                          position: 'insideTopLeft',
                          fontSize: 9,
                          fill: colors.amberDark,
                        }}
                      />
                    ) : null}
                    <Line
                      type="monotone"
                      dataKey="performance"
                      stroke="#0e2944"
                      strokeWidth={2}
                      dot={false}
                      name={t('h05.performance')}
                    />
                    <Line
                      type="monotone"
                      dataKey="engagement"
                      stroke={colors.tealDark}
                      strokeWidth={1.5}
                      dot={false}
                      name={t('h05.engagement')}
                    />
                    <Line
                      type="monotone"
                      dataKey="workload"
                      stroke="#1b3a5c"
                      strokeWidth={1.5}
                      dot={false}
                      name={t('h05.workload')}
                    />
                    <Line
                      type="monotone"
                      dataKey="overtime"
                      stroke={colors.amber}
                      strokeWidth={1.5}
                      dot={false}
                      name={t('h05.overtime')}
                    />
                    <Line
                      type="monotone"
                      dataKey="burnout_risk_pct"
                      stroke={colors.coral}
                      strokeWidth={1.5}
                      dot={false}
                      name={t('h05.burnout')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="!rounded-[14px]">
              <h2 className="text-base font-semibold">{t('h05.relationships')}</h2>
              <p className="text-[13px] text-muted">{t('h05.relationshipsSub')}</p>
              <ul className="mt-4 space-y-3">
                {data.correlations.map((c) => (
                  <li
                    key={c.title}
                    className="rounded-xl border border-border px-3 py-2.5 text-[13px]"
                  >
                    <p className="font-semibold">{c.title}</p>
                    <p className="font-mono text-[12px] text-muted ltr-nums">
                      {c.todo || c.r == null
                        ? `r = — · ${t('common.notCollected')}`
                        : `r = ${c.r} · ${
                            c.lag_weeks === 0
                              ? t('h05.sameWeek')
                              : t('h05.leadsWeeks', { n: c.lag_weeks })
                          }`}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-faint">{t('h05.corrFootnote')}</p>
            </Card>
          </div>

          <Card className="!rounded-[14px] overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <h2 className="text-base font-semibold">{t('h05.peopleTitle')}</h2>
                <p className="text-[12.5px] text-muted">
                  {data.executive_individuals_hidden
                    ? t('h05.execHidden')
                    : data.people
                      ? t('h05.peopleSub', { n: data.people.length })
                      : t('h05.pickTeamPeople')}
                </p>
              </div>
            </div>
            {data.people && data.people.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-y border-border font-mono text-[10.5px] text-muted">
                      <th className="px-3 py-2 text-start">{t('h05.colPerson')}</th>
                      <th className="px-3 py-2 text-start">{t('h05.colPerf')}</th>
                      <th className="px-3 py-2 text-start">{t('h05.colTier')}</th>
                      <th className="px-3 py-2 text-start">{t('h05.colTrend')}</th>
                      <th className="px-3 py-2 text-start">{t('h05.colBurnout')}</th>
                      <th className="px-3 py-2 text-start">{t('h05.colQuad')}</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.people.map((p) => (
                      <tr key={p.id} className="border-b border-surface-2">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={p.full_name} size="sm" />
                            <div>
                              <p className="font-semibold">{p.full_name}</p>
                              <p className="text-[11px] text-muted">{p.job_title}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 ltr-nums font-mono">
                          {p.performance_score}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[12px] ltr-nums">
                          {p.performance_tier.toUpperCase()} {p.performance_score}
                        </td>
                        <td className="px-3 py-2.5">
                          <Spark values={p.trend_12w} />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded bg-surface-3">
                              <div
                                className={[
                                  'h-full',
                                  p.burnout_risk_pct >= 60
                                    ? 'bg-coral'
                                    : p.burnout_risk_pct >= 45
                                      ? 'bg-amber'
                                      : 'bg-teal',
                                ].join(' ')}
                                style={{ width: `${Math.min(100, p.burnout_risk_pct)}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] ltr-nums">
                              {p.burnout_risk_pct}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge tone="slate" uppercase={false}>
                            {t(`h05.quad.${p.quadrant}`)}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-end">
                          <Link
                            to={`/hr/employees/${p.id}`}
                            className="inline-flex items-center gap-1 font-semibold text-teal-dark"
                          >
                            {t('h05.twin')}
                            <RtlFlip>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </RtlFlip>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </Card>
        </>
      ) : null}
    </AppShell>
  )
}
