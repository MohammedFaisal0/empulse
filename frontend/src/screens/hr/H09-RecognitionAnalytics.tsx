import { ArrowRight, Heart, Lightbulb, Star, Users, Zap, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useHrRecognition } from '../../api/hr'
import { RtlFlip } from '../../components/RtlFlip'
import { Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { hrNav } from '../../layout/navConfigs'

const CAT_ICON: Record<string, typeof Star> = {
  Impact: Star,
  Innovation: Lightbulb,
  Collaboration: Users,
  'Customer Focus': Zap,
  Mentorship: Heart,
  'Above & Beyond': TrendingUp,
}

function dash(v: number | null | undefined, suffix = ''): string {
  if (v == null || Number.isNaN(v)) return '—'
  return `${v}${suffix}`
}

function rateBarTone(pct: number): string {
  if (pct >= 70) return 'bg-teal'
  if (pct >= 55) return 'bg-amber'
  return 'bg-coral'
}

function inBand(ratio: number | null, band: [number, number]): boolean {
  if (ratio == null) return true
  return ratio >= band[0] && ratio <= band[1]
}

export function H09RecognitionAnalytics() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useHrRecognition()

  return (
    <AppShell
      config={hrNav}
      activePath="/hr/recognition"
      chrome={{
        breadcrumbPrimary: t('h09.breadcrumbOrg'),
        breadcrumbPage: t('h09.title'),
      }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('h09.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('h09.subtitle')}</p>
        </div>
        <button
          type="button"
          className="rounded-[11px] border border-border bg-white px-3.5 py-2 text-[14px] font-semibold"
        >
          {t('h09.programSettings')}
        </button>
      </div>

      {isLoading ? <p className="text-muted">{t('h09.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="!rounded-[14px]">
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                {t('h09.kpiRate')}
              </p>
              <p className="mt-1 text-[28px] font-semibold ltr-nums">
                {dash(data.kpis.recognition_rate_pct, '%')}
              </p>
              {data.kpis.rate_delta_vs_q2 != null ? (
                <p className="text-[12px] font-semibold text-teal ltr-nums">
                  {data.kpis.rate_delta_vs_q2 >= 0 ? '+' : ''}
                  {data.kpis.rate_delta_vs_q2} {t('h09.vsQ2')}
                </p>
              ) : (
                <p className="text-[12px] text-faint">{t('common.notCollected')}</p>
              )}
            </Card>
            <Card className="!rounded-[14px]">
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                {t('h09.kpiQ3')}
              </p>
              <p className="mt-1 text-[28px] font-semibold ltr-nums">
                {data.kpis.recognitions_q3.toLocaleString()}
              </p>
              <p className="text-[12px] text-muted ltr-nums">
                {t('h09.fromGivers', { n: data.kpis.givers_q3 })}
              </p>
            </Card>
            <Card className="!rounded-[14px]">
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                {t('h09.kpiLinked')}
              </p>
              <p className="mt-1 text-[28px] font-semibold ltr-nums">
                {data.kpis.linked_to_outcomes_pct != null
                  ? `${data.kpis.linked_to_outcomes_pct}%`
                  : '—'}
              </p>
              <p className="text-[12px] text-faint">
                {data.kpis.linked_to_outcomes_not_collected
                  ? t('common.notCollected')
                  : t('h09.impactThreads')}
              </p>
            </Card>
            <Card className="!rounded-[14px]">
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                {t('h09.kpiNever')}
              </p>
              <p className="mt-1 text-[28px] font-semibold text-coral ltr-nums">
                {data.kpis.never_recognized_12mo.toLocaleString()}
              </p>
              <p className="text-[12px] text-muted ltr-nums">
                {t('h09.neverPct', {
                  pct: dash(data.kpis.never_recognized_pct),
                })}
              </p>
            </Card>
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Card className="!rounded-[14px]">
              <h2 className="text-base font-semibold">{t('h09.rateTitle')}</h2>
              <p className="mb-3 text-[13px] text-muted">
                {t('h09.rateSub', {
                  pct: dash(data.kpis.recognition_rate_pct),
                })}
              </p>
              <ul className="space-y-2.5">
                {data.rate_by_department.map((d) => {
                  const pct = d.rate_pct ?? 0
                  return (
                    <li key={d.department_id} className="flex items-center gap-3">
                      <span className="w-36 shrink-0 text-[13px] font-medium">
                        {d.department}
                      </span>
                      <div className="h-2.5 flex-1 rounded-full bg-surface-3">
                        <div
                          className={`h-2.5 rounded-full ${rateBarTone(pct)}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      <span className="w-12 text-end font-mono text-[12px] ltr-nums">
                        {dash(d.rate_pct, '%')}
                      </span>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-3 text-[11px] text-faint">{t('h09.reciprocityNote')}</p>
            </Card>

            <Card className="!rounded-[14px]">
              <h2 className="text-base font-semibold">
                {t('h09.mixTitle', { period: data.category_mix.period })}
              </h2>
              <p className="mb-3 text-[13px] text-muted ltr-nums">
                {t('h09.mixSub', { n: data.category_mix.total })}
              </p>
              <ul className="space-y-2.5">
                {data.category_mix.items.map((item) => {
                  const Icon = CAT_ICON[item.type] ?? Star
                  return (
                    <li
                      key={item.type}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="flex items-center gap-2 text-[13px]">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal/15 text-teal">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        {item.label}
                      </span>
                      <span className="font-mono text-[12px] text-muted ltr-nums">
                        {item.count} · {dash(item.pct, '%')}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Card>
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Card className="!rounded-[14px]">
              <h2 className="text-base font-semibold">{t('h09.equityTitle')}</h2>
              <p className="mb-4 text-[13px] text-muted">
                {t('h09.equitySub', {
                  lo: data.equity.band[0],
                  hi: data.equity.band[1],
                })}
              </p>
              <ul className="space-y-4">
                {data.equity.ratios.map((row) => {
                  const ok = inBand(row.ratio, data.equity.band)
                  const pos =
                    row.ratio == null
                      ? 50
                      : Math.min(
                          100,
                          Math.max(0, ((row.ratio - 0.5) / 1.0) * 100),
                        )
                  return (
                    <li key={row.id}>
                      <div className="mb-1 flex justify-between text-[13px]">
                        <span>{t(`h09.equityLabels.${row.id}`)}</span>
                        <span
                          className={[
                            'font-mono font-semibold ltr-nums',
                            ok ? 'text-teal' : 'text-coral',
                          ].join(' ')}
                        >
                          {dash(row.ratio)}
                        </span>
                      </div>
                      <div className="relative h-2 rounded-full bg-surface-3" dir="ltr">
                        <div
                          className="absolute inset-y-0 rounded-full bg-teal/25"
                          style={{
                            left: `${((data.equity.band[0] - 0.5) / 1.0) * 100}%`,
                            width: `${((data.equity.band[1] - data.equity.band[0]) / 1.0) * 100}%`,
                          }}
                        />
                        {row.ratio != null ? (
                          <span
                            className={[
                              'absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full',
                              ok ? 'bg-teal' : 'bg-coral',
                            ].join(' ')}
                            style={{ left: `${pos}%` }}
                          />
                        ) : (
                          <span className="absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-faint">
                            —
                          </span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
              {data.equity.tier_gap_pct != null ? (
                <p className="mt-4 rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-[12px] text-ink">
                  {t('h09.tierGap', { pct: data.equity.tier_gap_pct })}
                </p>
              ) : null}
            </Card>

            <Card className="!rounded-[14px] border-teal/30 bg-teal/5">
              <h2 className="text-base font-semibold">{t('h09.insightTitle')}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-ink">
                {data.insight.r != null && data.insight.engagement_gap_pts != null
                  ? t('h09.insightBody', {
                      gap: data.insight.engagement_gap_pts,
                      r: data.insight.r,
                      thr: data.insight.threshold_pct,
                      team: data.insight.lowest_coverage?.team ?? '—',
                      dept: data.insight.lowest_coverage?.department ?? '—',
                    })
                  : t('h09.insightMissing')}
              </p>
              {(data.insight.r == null ||
                data.insight.engagement_gap_pts == null) && (
                <p className="mt-1 text-[12px] text-faint">
                  {t('common.notCollected')}
                </p>
              )}
              <Link
                to="/hr/simulator"
                className="mt-4 inline-flex items-center gap-2 rounded-[11px] bg-navy px-3.5 py-2 text-[14px] font-semibold text-white"
              >
                {t('h09.simulate')}
                <RtlFlip>
                  <ArrowRight className="h-4 w-4 text-teal-lighter" />
                </RtlFlip>
              </Link>
            </Card>
          </div>

          <Card className="!rounded-[14px]">
            <h2 className="text-base font-semibold">{t('h09.teamGaps')}</h2>
            <p className="mb-3 text-[13px] text-muted">{t('h09.teamGapsSub')}</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-start text-[13px]">
                <thead>
                  <tr className="border-b border-border font-mono text-[10px] uppercase text-muted">
                    <th className="py-2 pe-3 font-medium">{t('h09.colTeam')}</th>
                    <th className="py-2 pe-3 font-medium">{t('h09.colDept')}</th>
                    <th className="py-2 pe-3 font-medium">{t('h09.colRate')}</th>
                    <th className="py-2 font-medium">{t('h09.colRecip')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rate_by_team
                    .slice()
                    .sort((a, b) => a.team.localeCompare(b.team))
                    .slice(0, 20)
                    .map((row) => (
                      <tr key={row.team_id} className="border-b border-surface-2">
                        <td className="py-2.5 pe-3 font-medium">{row.team}</td>
                        <td className="py-2.5 pe-3 text-muted">{row.department}</td>
                        <td className="py-2.5 pe-3 font-mono ltr-nums">
                          {dash(row.rate_pct, '%')}
                        </td>
                        <td className="py-2.5 font-mono ltr-nums">
                          {dash(row.reciprocity_pct, '%')}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] text-faint">{t('h09.noPeopleList')}</p>
          </Card>
        </>
      ) : null}
    </AppShell>
  )
}
