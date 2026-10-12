import { FileText, Lightbulb, Shield, Database, User } from 'lucide-react'
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

import { useHrInnovation } from '../../api/hr'
import { Badge, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { hrNav } from '../../layout/navConfigs'
import { colors } from '../../theme/colors'

function fmtSar(n: number): string {
  if (n >= 1_000_000) return `SAR ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `SAR ${Math.round(n / 1_000)}K`
  return `SAR ${n}`
}

function dash(v: number | null | undefined, suffix = ''): string {
  if (v == null || Number.isNaN(v)) return '—'
  return `${v}${suffix}`
}

export function H08InnovationIntelligence() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useHrInnovation()

  const funnelMax = Math.max(
    1,
    ...(data?.funnel.stages.map((s) => s.count) ?? [1]),
  )
  const funnelData =
    data?.funnel.stages.map((s) => ({
      name: t(`h08.funnelStages.${s.stage}`),
      count: s.count,
    })) ?? []

  const dnaData =
    data?.dna.traits.map((tr) => ({
      id: tr.id,
      label: t(`h08.dnaTraits.${tr.id}`),
      score: tr.score,
      missing: tr.not_collected || tr.score == null,
    })) ?? []

  return (
    <AppShell
      config={hrNav}
      activePath="/hr/innovation"
      chrome={{
        breadcrumbPrimary: t('h08.breadcrumbOrg'),
        breadcrumbPage: t('h08.title'),
      }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('h08.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('h08.subtitle')}</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-[11px] border border-border bg-white px-3.5 py-2 text-[14px] font-semibold"
        >
          <FileText className="h-4 w-4 text-muted" />
          {t('h08.councilPack')}
        </button>
      </div>

      {isLoading ? <p className="text-muted">{t('h08.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="!rounded-[14px]">
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                {t('h08.kpiIdeas')}
              </p>
              <p className="mt-1 text-[28px] font-semibold ltr-nums">
                {data.kpis.ideas_this_year.toLocaleString()}
              </p>
              {data.kpis.ideas_delta_pct_vs_q2_volume != null ? (
                <p className="text-[12px] font-semibold text-teal ltr-nums">
                  {data.kpis.ideas_delta_pct_vs_q2_volume >= 0 ? '+' : ''}
                  {data.kpis.ideas_delta_pct_vs_q2_volume}%
                </p>
              ) : (
                <p className="text-[12px] text-faint">{t('common.notCollected')}</p>
              )}
            </Card>
            <Card className="!rounded-[14px]">
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                {t('h08.kpiApproval')}
              </p>
              <p className="mt-1 text-[28px] font-semibold ltr-nums">
                {dash(data.kpis.approval_rate_pct, '%')}
              </p>
              <p className="text-[12px] text-muted">{data.kpis.approval_period}</p>
            </Card>
            <Card className="!rounded-[14px]">
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                {t('h08.kpiTime')}
              </p>
              <p className="mt-1 text-[28px] font-semibold ltr-nums">
                {data.kpis.time_to_impact_wks_median != null
                  ? t('h08.wks', { n: data.kpis.time_to_impact_wks_median })
                  : '—'}
              </p>
              <p className="text-[12px] text-muted">{t('h08.median')}</p>
            </Card>
            <Card className="!rounded-[14px]">
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                {t('h08.kpiRoi')}
              </p>
              <p className="mt-1 text-[28px] font-semibold ltr-nums">
                {data.kpis.innovation_roi != null
                  ? `${data.kpis.innovation_roi}×`
                  : '—'}
              </p>
              <p className="text-[12px] text-muted">
                {data.kpis.innovation_roi != null
                  ? t('h08.roiNote')
                  : t('common.notCollected')}
              </p>
            </Card>
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Card className="!rounded-[14px]">
              <div className="mb-1 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-violet" />
                <h2 className="text-base font-semibold">
                  {t('h08.funnelTitle', { period: data.funnel.period })}
                </h2>
              </div>
              <p className="mb-3 text-[13px] text-muted">{t('h08.funnelSub')}</p>
              <div className="h-[220px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={funnelData}
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  >
                    <XAxis type="number" hide domain={[0, funnelMax]} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fontSize: 11, fill: colors.muted }}
                    />
                    <Tooltip
                      formatter={(v) => [v, t('h08.count')]}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                      {funnelData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={colors.violet}
                          fillOpacity={0.45 + i * 0.08}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-[13px] font-semibold text-violet ltr-nums">
                {t('h08.verifiedSavings', {
                  sar: fmtSar(data.funnel.verified_savings_sar),
                })}
              </p>
            </Card>

            <Card className="!rounded-[14px]">
              <h2 className="text-base font-semibold">{t('h08.participation')}</h2>
              <p className="mb-3 text-[13px] text-muted">
                {t('h08.participationSub', {
                  pct: dash(data.participation.org_pct),
                })}
              </p>
              <ul className="space-y-2.5">
                {data.participation.by_department.map((d) => {
                  const pct = d.participation_pct ?? 0
                  return (
                    <li key={d.department_id} className="flex items-center gap-3">
                      <span className="w-36 shrink-0 text-[13px] font-medium">
                        {d.department}
                      </span>
                      <div className="h-2.5 flex-1 rounded-full bg-surface-3">
                        <div
                          className="h-2.5 rounded-full bg-violet"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      <span className="w-10 text-end font-mono text-[12px] ltr-nums">
                        {dash(d.participation_pct, '%')}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Card>
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Card className="!rounded-[14px]">
              <h2 className="text-base font-semibold">{t('h08.dna')}</h2>
              <p className="mb-4 text-[13px] text-muted">
                {t('h08.dnaSub', { n: data.dna.n.toLocaleString() })}
              </p>
              <div className="flex items-end justify-between gap-2" dir="ltr">
                {dnaData.map((tr) => (
                  <div key={tr.id} className="flex flex-1 flex-col items-center gap-2">
                    <div className="relative flex h-36 w-full max-w-[48px] items-end justify-center">
                      {tr.missing ? (
                        <div className="flex h-full w-7 items-center justify-center rounded-full bg-surface-3">
                          <span className="text-[11px] text-faint">—</span>
                        </div>
                      ) : (
                        <div
                          className="w-7 rounded-full bg-violet/80"
                          style={{
                            height: `${Math.max(8, Math.min(100, tr.score ?? 0))}%`,
                          }}
                        />
                      )}
                    </div>
                    <p className="text-center font-mono text-[12px] font-semibold ltr-nums">
                      {tr.missing ? '—' : Math.round(tr.score ?? 0)}
                    </p>
                    <p className="whitespace-pre-line text-center text-[10px] leading-tight text-muted">
                      {tr.label}
                    </p>
                    {tr.missing ? (
                      <p className="text-center text-[9px] text-faint">
                        {tr.id === 'digital_innovation'
                          ? t('h08.dnaExample')
                          : t('common.notCollected')}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="!rounded-[14px]">
              <h2 className="mb-3 text-base font-semibold">{t('h08.barriers')}</h2>
              <ul className="space-y-3">
                {data.barriers
                  .filter((b) => !(b.id === 'data_access' && (b.not_collected || b.count == null)))
                  .map((b) => {
                  const Icon =
                    b.id === 'time_to_build'
                      ? Shield
                      : b.id === 'implementation_skill'
                        ? User
                        : Database
                  let detail = ''
                  if (b.id === 'time_to_build') {
                    detail =
                      b.weeks != null
                        ? t('h08.barrierTime', { w: b.weeks })
                        : t('common.notCollected')
                  } else if (b.id === 'implementation_skill') {
                    detail =
                      b.implementation_median != null &&
                      b.idea_generation_median != null
                        ? t('h08.barrierImpl', {
                            impl: b.implementation_median,
                            idea: b.idea_generation_median,
                          })
                        : t('common.notCollected')
                  } else {
                    // Only render when count exists (filtered above); never invent design numbers.
                    detail = t('h08.barrierData', { n: b.count })
                  }
                  return (
                    <li
                      key={b.id}
                      className="flex gap-3 rounded-xl border border-border/60 bg-surface px-3 py-2.5"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-light text-violet">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[13px] font-semibold">
                          {t(`h08.barrierTitles.${b.id}`)}
                        </p>
                        <p className="text-[12px] text-muted">{detail}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
              {data.barriers.some(
                (b) => b.id === 'data_access' && (b.not_collected || b.count == null),
              ) ? (
                <p className="mt-3 text-[11px] text-faint">{t('h08.dataAccessHidden')}</p>
              ) : null}
            </Card>
          </div>

          <Card className="mb-4 !rounded-[14px]">
            <h2 className="text-base font-semibold">{t('h08.valueByDept')}</h2>
            <p className="mb-3 text-[13px] text-muted">{t('h08.valueByDeptSub')}</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-start text-[13px]">
                <thead>
                  <tr className="border-b border-border font-mono text-[10px] uppercase text-muted">
                    <th className="py-2 pe-3 font-medium">{t('h08.colDept')}</th>
                    <th className="py-2 pe-3 font-medium">{t('h08.colIdeas')}</th>
                    <th className="py-2 pe-3 font-medium">{t('h08.colEst')}</th>
                    <th className="py-2 font-medium">{t('h08.colReal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.value_by_department.map((d) => (
                    <tr key={d.department_id} className="border-b border-surface-2">
                      <td className="py-2.5 pe-3 font-medium">{d.department}</td>
                      <td className="py-2.5 pe-3 font-mono ltr-nums">{d.ideas}</td>
                      <td className="py-2.5 pe-3 font-mono ltr-nums">
                        {fmtSar(d.estimated_value_sar)}
                      </td>
                      <td className="py-2.5 font-mono ltr-nums">
                        {fmtSar(d.realized_value_sar)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {data.public_ideas && data.public_ideas.length > 0 ? (
            <Card className="!rounded-[14px]">
              <h2 className="text-base font-semibold">{t('h08.publicIdeas')}</h2>
              <p className="mb-3 text-[13px] text-muted">{t('h08.publicIdeasSub')}</p>
              <ul className="divide-y divide-surface-2">
                {data.public_ideas.slice(0, 12).map((idea) => (
                  <li
                    key={idea.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <div>
                      <p className="text-[13px] font-semibold">{idea.title}</p>
                      <p className="text-[12px] text-muted">{idea.author}</p>
                    </div>
                    <Badge tone="slate">{idea.status}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          ) : data.executive_individuals_hidden ? (
            <p className="text-[13px] text-muted">{t('h08.execHidden')}</p>
          ) : null}
        </>
      ) : null}
    </AppShell>
  )
}
