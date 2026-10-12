import { ArrowRight, AlertTriangle, FlaskConical, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useHrExecutivePulse } from '../../api/hr'
import { RtlFlip } from '../../components/RtlFlip'
import { Badge, Card, Medallion, Stat, type Tier } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { hrNav } from '../../layout/navConfigs'
import { colors } from '../../theme/colors'

function toTier(raw: string | undefined): Tier {
  const t = (raw ?? '').toLowerCase()
  if (t === 'gold' || t === 'silver' || t === 'bronze' || t === 'growth') return t
  return 'growth'
}

function deltaText(
  n: number | null | undefined,
  suffix: string,
): { text: string; tone: 'up' | 'down' | 'neutral' } | null {
  if (n == null) return null
  const sign = n > 0 ? '↑' : n < 0 ? '↓' : '·'
  const tone = n > 0 ? 'up' : n < 0 ? 'down' : 'neutral'
  return { text: `${sign} ${Math.abs(n)} ${suffix}`, tone }
}

function heatColor(pct: number | undefined, suppressed?: boolean): string {
  if (suppressed || pct == null) return 'bg-surface-3 text-faint'
  if (pct >= 55) return 'bg-coral/80 text-ink'
  if (pct >= 45) return 'bg-amber/60 text-ink'
  if (pct >= 35) return 'bg-amber/40 text-ink'
  return 'bg-teal/40 text-ink'
}

function signalIcon(tone: string) {
  if (tone === 'violet') return FlaskConical
  if (tone === 'amber') return Sparkles
  return AlertTriangle
}

function signalCtaKey(cta: string): string {
  if (cta === 'view_root_causes') return 'h01.ctaRoot'
  if (cta === 'explore_innovation') return 'h01.ctaInnov'
  return 'h01.ctaIntervene'
}

export function H01ExecutivePulse() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useHrExecutivePulse()
  const org = data?.organization
  const suppressed = Boolean(org?.suppressed)
  const interv = data?.interventions
  const pulseDelta = deltaText(org?.pulse_vs_q2, t('h01.vsQ2'))
  const engDelta = deltaText(org?.engagement_vs_q2, t('h01.vsQ2'))
  const innovDelta = deltaText(org?.innovation_vs_q2, t('h01.pts'))
  const recogDelta = deltaText(org?.recognition_vs_q2, t('h01.pts'))
  const intervDelta = deltaText(org?.intervention_success_vs_q2, t('h01.pts'))
  const elevDelta = deltaText(org?.elevated_vs_jul, t('h01.sinceJul'))

  const surge = data?.annotations.find((a) => a.kind === 'surge')
  const rebalance = data?.annotations.find((a) => a.kind === 'rebalance')

  const depts = [
    ...new Set(
      (data?.burnout_heatmap.cells ?? [])
        .map((c) => c.department)
        .filter((d): d is string => Boolean(d)),
    ),
  ].sort()

  const heatLookup = new Map(
    (data?.burnout_heatmap.cells ?? []).map((c) => [
      `${c.department}|${c.month}`,
      c,
    ]),
  )

  const tierOrder = ['gold', 'silver', 'bronze', 'growth'] as const

  return (
    <AppShell
      config={hrNav}
      activePath="/hr/executive"
      chrome={{
        breadcrumbPrimary: t('h01.breadcrumbOrg'),
        breadcrumbPage: t('h01.title'),
      }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('h01.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('h01.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/hr/pulseai">
            <button
              type="button"
              className="rounded-[11px] border border-border bg-white px-3.5 py-2 text-[14px] font-semibold"
            >
              {t('h01.generateInsight')}
            </button>
          </Link>
          <Link to="/hr/simulator?scope=organization">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-[11px] bg-navy px-3.5 py-2 text-[14px] font-semibold text-white"
            >
              {t('h01.simulate')}
              <RtlFlip>
                <ArrowRight className="h-4 w-4 text-teal-lighter" />
              </RtlFlip>
            </button>
          </Link>
        </div>
      </div>

      {isLoading ? <p className="text-muted">{t('h01.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data && !suppressed && org ? (
        <>
          {/* Top KPI row */}
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Card className="!rounded-[14px] !bg-navy !text-white">
              <div className="flex items-center gap-3">
                <Medallion
                  score={org.empulse_score ?? 0}
                  tier={toTier(org.empulse_tier)}
                  size="md"
                />
                <div>
                  <p className="font-mono text-[10.5px] text-white/60">
                    {t('h01.orgEmpulse')}
                  </p>
                  <p className="text-[26px] font-semibold ltr-nums">
                    {org.empulse_score}{' '}
                    <span className="text-[13px] text-white/80">
                      {org.empulse_tier?.toUpperCase()}
                    </span>
                  </p>
                  {pulseDelta ? (
                    <p className="text-xs text-teal-lighter">{pulseDelta.text}</p>
                  ) : null}
                </div>
              </div>
            </Card>
            <Card className="!rounded-[14px]">
              <Stat
                label={t('h01.engagement')}
                value={
                  org.engagement != null ? String(Math.round(org.engagement)) : '—'
                }
                delta={engDelta?.text}
                deltaTone={engDelta?.tone}
              />
              <p className="mt-2 font-mono text-[10px] text-faint">
                {t('h01.wellbeingBeside')}:{' '}
                <span className="ltr-nums text-ink">
                  {org.wellbeing != null ? Math.round(org.wellbeing) : '—'}
                </span>
              </p>
            </Card>
            <Card className="!rounded-[14px]">
              <Stat
                label={t('h01.innovation')}
                value={`${org.innovation_participation_pct ?? '—'}%`}
                delta={innovDelta?.text}
                deltaTone={innovDelta?.tone}
              />
            </Card>
            <Card className="!rounded-[14px]">
              <Stat
                label={t('h01.recognition')}
                value={`${org.recognition_rate_pct ?? '—'}%`}
                delta={recogDelta?.text}
                deltaTone={recogDelta?.tone}
              />
            </Card>
            <Card className="!rounded-[14px]">
              <Stat
                label={t('h01.intervention')}
                value={
                  interv?.suppressed
                    ? t('h01.suppressed')
                    : `${interv?.success_pct ?? '—'}%`
                }
                delta={intervDelta?.text}
                deltaTone={intervDelta?.tone}
              />
            </Card>
          </div>

          {/* Heartbeat + right rail */}
          <div className="mb-4 grid gap-4 lg:grid-cols-[1.45fr_320px]">
            <Card className="!rounded-[14px]">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold">{t('h01.heartbeat')}</h2>
                  <p className="text-[13px] text-muted">{t('h01.heartbeatSub')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="teal" uppercase={false}>
                    {t('h01.live')}
                  </Badge>
                  <span className="text-[13px] font-semibold text-teal-dark">
                    {t('h01.pulseScore')}
                  </span>
                </div>
              </div>
              <div className="h-[260px]" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.heartbeat}>
                    <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: colors.muted }}
                    />
                    <YAxis
                      yAxisId="pulse"
                      domain={[65, 85]}
                      tick={{ fontSize: 9 }}
                      width={28}
                    />
                    <YAxis
                      yAxisId="eng"
                      orientation="right"
                      domain={[50, 100]}
                      hide
                    />
                    <Tooltip />
                    {rebalance ? (
                      <ReferenceArea
                        yAxisId="pulse"
                        x1={data.heartbeat.find((h) => h.month === rebalance.month)?.label}
                        x2={data.heartbeat[data.heartbeat.length - 1]?.label}
                        fill="#e6f7f5"
                        fillOpacity={0.7}
                        label={{
                          value: t('h01.rebalancing'),
                          position: 'insideTopRight',
                          fill: colors.tealDark,
                          fontSize: 9,
                        }}
                      />
                    ) : null}
                    {surge ? (
                      <ReferenceLine
                        yAxisId="pulse"
                        x={data.heartbeat.find((h) => h.month === surge.month)?.label}
                        stroke={colors.amber}
                        strokeDasharray="3 3"
                        label={{
                          value: t('h01.q2Surge'),
                          position: 'top',
                          fill: colors.amberDark,
                          fontSize: 9,
                        }}
                      />
                    ) : null}
                    <Line
                      yAxisId="pulse"
                      type="monotone"
                      dataKey="performance_score"
                      stroke="#0e2944"
                      strokeWidth={2}
                      dot={false}
                      name={t('h01.pulseScore')}
                    />
                    <Line
                      yAxisId="eng"
                      type="monotone"
                      dataKey="engagement_score"
                      stroke={colors.tealDark}
                      strokeWidth={0}
                      dot={{ r: 5, fill: colors.tealDark, strokeWidth: 0 }}
                      name={t('h01.engagement')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-muted">
                {t('h01.elevatedHeatTitle')}
              </p>
              <div className="mt-2 grid grid-cols-6 gap-1 sm:grid-cols-12">
                {data.heartbeat.map((h) => (
                  <div key={h.month} className="text-center">
                    <div
                      className={[
                        'rounded px-0.5 py-1 font-mono text-[11px] font-bold ltr-nums',
                        heatColor(h.elevated_count > 50 ? 55 : h.elevated_count > 40 ? 45 : 30),
                      ].join(' ')}
                    >
                      {h.elevated_count}
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted">{h.label}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="!rounded-[14px] !p-0 overflow-hidden">
              <div className="space-y-0 divide-y divide-surface-2 px-5 py-2">
                <div className="py-4">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                    {t('h01.orgPulse')}
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-[30px] font-semibold ltr-nums">
                      {org.empulse_score}
                    </span>
                    {pulseDelta ? (
                      <span
                        className={[
                          'text-xs font-semibold',
                          pulseDelta.tone === 'up'
                            ? 'text-green'
                            : pulseDelta.tone === 'down'
                              ? 'text-coral'
                              : 'text-muted',
                        ].join(' ')}
                      >
                        {pulseDelta.text}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted">
                    {org.highest_note
                      ? t('h01.highestSince')
                      : t('h01.headcount', { n: org.headcount ?? org.n })}
                  </p>
                </div>
                <div className="py-4">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                    {t('h01.elevatedBurnout')}
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-[30px] font-semibold ltr-nums">
                      {org.elevated_burnout_count ?? '—'}
                    </span>
                    {elevDelta ? (
                      <span
                        className={[
                          'text-xs font-semibold',
                          elevDelta.tone === 'down'
                            ? 'text-green'
                            : elevDelta.tone === 'up'
                              ? 'text-coral'
                              : 'text-muted',
                        ].join(' ')}
                      >
                        {elevDelta.text}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted">
                    {t('h01.elevatedSub', {
                      pct: org.elevated_burnout_pct ?? '—',
                      dept: org.elevated_top_dept ?? '—',
                    })}
                  </p>
                </div>
                <div className="py-4">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                    {t('h01.activeInterventions')}
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-[30px] font-semibold ltr-nums">
                      {interv?.suppressed ? '—' : (interv?.active ?? '—')}
                    </span>
                    {interv && !interv.suppressed ? (
                      <span className="text-xs font-semibold text-green">
                        ↑ {interv.started_this_month ?? 0} {t('h01.thisMonth')}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted">
                    {interv?.suppressed
                      ? t('h01.suppressed')
                      : t('h01.intervSub', {
                          pct: interv?.on_track_pct ?? '—',
                          due: interv?.followup_due ?? 0,
                        })}
                  </p>
                </div>
                <div className="py-4">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                    {t('h01.expectedImpact')}
                  </p>
                  <p className="mt-1 text-[30px] font-semibold text-teal-dark ltr-nums">
                    {t('h01.sarM', { n: data.impact.net_impact_sar_m })}
                  </p>
                  <p className="mt-1 text-[12.5px] text-muted">
                    {t('h01.impactFrom', {
                      interventions: data.impact.interventions_completed,
                      ideas: data.impact.ideas_implemented,
                    })}
                  </p>
                  <Link
                    to="/hr/economic"
                    className="mt-3 inline-flex items-center gap-2 rounded-[11px] bg-navy px-3.5 py-2 text-[14px] font-semibold text-white"
                  >
                    {t('h01.exploreImpact')}
                    <RtlFlip>
                      <ArrowRight className="h-4 w-4 text-teal-lighter" />
                    </RtlFlip>
                  </Link>
                </div>
              </div>
            </Card>
          </div>

          {/* Department rings */}
          <Card className="mb-4 !rounded-[14px]">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">{t('h01.deptRings')}</h2>
                <p className="text-[13px] text-muted">{t('h01.deptRingsSub')}</p>
              </div>
              <Link
                to="/hr/organization"
                className="rounded-[11px] border border-border px-3.5 py-2 text-[14px] font-medium"
              >
                {t('h01.allDepartments')}
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {data.department_rings.map((d) => {
                if (d.suppressed) {
                  return (
                    <div
                      key={d.id}
                      className="rounded-[14px] border border-border p-3 text-center"
                    >
                      <p className="font-semibold">{d.name}</p>
                      <p className="mt-2 text-[12px] text-muted">
                        {t('h01.suppressed')}
                      </p>
                    </div>
                  )
                }
                const radar = [
                  { axis: t('h01.dimPerf'), v: d.performance ?? 0 },
                  { axis: t('h01.dimEng'), v: d.engagement ?? 0 },
                  { axis: t('h01.dimWell'), v: d.wellbeing ?? 0 },
                  { axis: t('h01.dimInnov'), v: d.innovation ?? 0 },
                ]
                return (
                  <div
                    key={d.id}
                    className="flex flex-col items-center rounded-[14px] border border-border px-2 py-3"
                  >
                    <div className="relative h-[118px] w-[118px]" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radar} cx="50%" cy="50%" outerRadius="70%">
                          <PolarGrid stroke={colors.border} />
                          <PolarAngleAxis dataKey="axis" tick={false} />
                          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar
                            dataKey="v"
                            stroke="#1b3a5c"
                            fill="#14b8a6"
                            fillOpacity={0.35}
                            strokeWidth={1.2}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[19px] font-bold ltr-nums">{d.pulse}</span>
                        <span className="font-mono text-[8.5px] text-muted">
                          {t('h01.pulse')}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-center text-[14px] font-semibold">{d.name}</p>
                    <p className="font-mono text-[11px] text-muted">
                      {t('h01.peopleN', { n: d.headcount })}
                    </p>
                    <span
                      className={[
                        'mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-semibold',
                        d.status === 'needs_support'
                          ? 'bg-amber/15 text-amber-dark'
                          : 'bg-teal-light text-teal-dark',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'h-1.5 w-1.5 rounded-full',
                          d.status === 'needs_support' ? 'bg-amber-dark' : 'bg-teal-dark',
                        ].join(' ')}
                      />
                      {d.status === 'needs_support'
                        ? t('h01.needsSupport')
                        : t('h01.healthy')}
                    </span>
                    <p className="mt-2 text-center text-[11.5px] text-muted">
                      {d.note}
                    </p>
                    <p className="mt-1 text-center font-mono text-[10px] text-faint">
                      {t('h01.wellbeingBeside')}:{' '}
                      <span className="ltr-nums">
                        {d.wellbeing != null ? Math.round(d.wellbeing) : '—'}
                      </span>
                    </p>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Burnout heatmap dept × month */}
          <Card className="mb-4 !rounded-[14px]">
            <h2 className="text-base font-semibold">{t('h01.burnoutHeatmap')}</h2>
            <p className="mt-1 text-[13px] text-muted">{t('h01.burnoutHeatmapSub')}</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-[12px]">
                <thead>
                  <tr className="font-mono text-[10px] text-muted">
                    <th className="px-2 py-1 text-start">{t('h01.department')}</th>
                    {(data.burnout_heatmap.months ?? []).map((m) => (
                      <th key={m} className="px-1 py-1 text-center">
                        {m.slice(5, 7)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {depts.map((dept) => (
                    <tr key={dept}>
                      <td className="px-2 py-1 font-semibold">{dept}</td>
                      {data.burnout_heatmap.months.map((m) => {
                        const cell = heatLookup.get(`${dept}|${m}`)
                        return (
                          <td key={m} className="px-1 py-1">
                            <div
                              className={[
                                'rounded px-1 py-1 text-center font-mono text-[11px] font-bold ltr-nums',
                                heatColor(
                                  cell?.burnout_risk_pct,
                                  cell?.suppressed,
                                ),
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
            <p className="mt-2 text-[11px] text-faint">{t('h01.heatmapFootnote')}</p>
          </Card>

          {/* Capability + support */}
          <div className="mb-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card className="!rounded-[14px]">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold">{t('h01.capability')}</h2>
                  <p className="text-[13px] text-muted">
                    {t('h01.capabilitySub', { n: data.capability.headcount })}
                  </p>
                </div>
                <Link
                  to="/hr/organization/capability"
                  className="text-[13px] font-semibold text-teal-dark"
                >
                  {t('h01.capabilityLink')}
                </Link>
              </div>
              <div className="flex h-[22px] overflow-hidden rounded-md">
                {tierOrder.map((k) => (
                  <div
                    key={k}
                    style={{ width: `${data.capability.q3[k]?.pct ?? 0}%` }}
                    className={[
                      'flex items-center ps-1.5 text-[10.5px] font-bold text-navy',
                      k === 'gold'
                        ? 'bg-gradient-to-r from-[#f8e7ae] to-tier-gold'
                        : k === 'silver'
                          ? 'bg-gradient-to-r from-[#f5f8fb] to-[#b3beca]'
                          : k === 'bronze'
                            ? 'bg-gradient-to-r from-[#f4cdae] to-tier-bronze'
                            : 'bg-gradient-to-r from-[#d6ecf0] to-tier-growth',
                    ].join(' ')}
                  >
                    {(data.capability.q3[k]?.pct ?? 0) >= 8
                      ? `${data.capability.q3[k].pct}%`
                      : ''}
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex h-2 overflow-hidden rounded opacity-40">
                {tierOrder.map((k) => (
                  <div
                    key={k}
                    style={{ width: `${data.capability.q2[k]?.pct ?? 0}%` }}
                    className={[
                      k === 'gold'
                        ? 'bg-tier-gold'
                        : k === 'silver'
                          ? 'bg-[#b3beca]'
                          : k === 'bronze'
                            ? 'bg-tier-bronze'
                            : 'bg-tier-growth',
                    ].join(' ')}
                  />
                ))}
              </div>
              <p className="mt-2 font-mono text-[10px] text-muted">
                {t('h01.q3vsQ2', { n: data.capability.moved_up })}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {tierOrder.map((k) => (
                  <div key={k} className="flex items-center gap-2 text-[12.5px]">
                    <span className="font-bold uppercase tracking-wide text-muted">
                      {k}
                    </span>
                    <span className="font-semibold ltr-nums">
                      {data.capability.q3[k]?.pct ?? 0}%
                    </span>
                    <span className="text-muted ltr-nums">
                      ({(data.capability.q3[k]?.delta_pp ?? 0) >= 0 ? '+' : ''}
                      {data.capability.q3[k]?.delta_pp ?? 0})
                    </span>
                  </div>
                ))}
              </div>
              {data.capability.gold_elevated_burnout > 0 ? (
                <p className="mt-3 rounded-xl bg-coral-light px-3 py-2.5 text-[12.5px] font-bold text-coral-dark">
                  {t('h01.goldAlert', {
                    n: data.capability.gold_elevated_burnout,
                  })}
                </p>
              ) : null}
            </Card>

            <Card className="!rounded-[14px]">
              <h2 className="text-base font-semibold">{t('h01.supportFirst')}</h2>
              <p className="mt-1 text-[13px] text-muted">{t('h01.supportSub')}</p>
              <ul className="mt-4 space-y-2">
                {data.needing_support.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-[13px]"
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
              <p className="mt-3 text-[11px] text-faint">{t('h01.noPeopleRank')}</p>
            </Card>
          </div>

          {/* Signals + impact story */}
          <div className="grid gap-4 lg:grid-cols-[1.45fr_320px]">
            <Card className="!rounded-[14px] !bg-gradient-to-b from-[#f3f7fb] to-white">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[12px] font-semibold text-teal-dark">
                  {t('h01.signals')}
                </p>
                <p className="font-mono text-[11px] text-muted">
                  {t('h01.updated')}
                </p>
              </div>
              <ul className="divide-y divide-surface-2">
                {data.signals.map((s) => {
                  const Icon = signalIcon(s.tone)
                  return (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center gap-3 py-3.5"
                    >
                      <span
                        className={[
                          'flex h-9 w-9 items-center justify-center rounded-[11px]',
                          s.tone === 'violet'
                            ? 'bg-violet-light text-violet'
                            : s.tone === 'amber'
                              ? 'bg-amber/15 text-amber-dark'
                              : 'bg-coral-light text-coral-dark',
                        ].join(' ')}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold">{s.title}</p>
                        <p className="text-[12.5px] text-muted">{s.detail}</p>
                      </div>
                      <Link
                        to={s.href}
                        className={[
                          'rounded-[11px] px-3.5 py-2 text-[14px] font-semibold text-white',
                          s.tone === 'violet'
                            ? 'bg-violet'
                            : s.tone === 'coral'
                              ? 'bg-coral-dark'
                              : 'bg-navy',
                        ].join(' ')}
                      >
                        {t(signalCtaKey(s.cta))}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </Card>

            <Card className="!rounded-[14px]">
              <h2 className="text-base font-semibold">{t('h01.impactStory')}</h2>
              <p className="text-[13px] text-muted">{t('h01.impactStorySub')}</p>
              <ul className="mt-4 space-y-3">
                <li className="flex items-baseline gap-2">
                  <span className="text-[22px] font-semibold ltr-nums">
                    {data.impact.interventions_completed}
                  </span>
                  <span className="text-[13px] text-muted">
                    {t('h01.interventionsLabel')}
                  </span>
                </li>
                <li className="flex items-baseline gap-2">
                  <span className="text-[22px] font-semibold ltr-nums">
                    {interv?.success_pct ?? '—'}%
                  </span>
                  <span className="text-[13px] text-muted">
                    {t('h01.peopleImproved')}
                  </span>
                </li>
                <li className="flex items-baseline gap-2">
                  <span className="text-[22px] font-semibold text-teal ltr-nums">
                    {t('h01.sarM', { n: data.impact.net_impact_sar_m })}
                  </span>
                  <span className="text-[13px] text-muted">
                    {t('h01.annualImpact')}
                  </span>
                </li>
              </ul>
              <Link
                to="/hr/economic"
                className="mt-4 inline-block text-[13px] font-semibold text-teal-dark"
              >
                {t('h01.openImpact')}
              </Link>
            </Card>
          </div>
        </>
      ) : null}

      {data && suppressed ? (
        <p className="text-muted">{t('h01.suppressed')}</p>
      ) : null}
    </AppShell>
  )
}
