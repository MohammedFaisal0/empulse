import { FileDown } from 'lucide-react'
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

import { useHrEconomic } from '../../api/hr'
import { Badge, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { hrNav } from '../../layout/navConfigs'
import { colors } from '../../theme/colors'

function fmtSar(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `SAR ${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `SAR ${Math.round(n / 1_000)}K`
  return `SAR ${n}`
}

function dash(v: number | null | undefined, suffix = ''): string {
  if (v == null || Number.isNaN(v)) return '—'
  return `${v}${suffix}`
}

export function H12EconomicImpact() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useHrEconomic()

  const chartData =
    data?.monthly.map((m) => ({
      label: m.month.slice(0, 7),
      net: m.net_impact_sar,
      gross:
        m.retention_savings_sar +
        m.productivity_gain_sar +
        m.innovation_value_sar,
      cost: m.program_cost_sar,
    })) ?? []

  return (
    <AppShell
      config={hrNav}
      activePath="/hr/economic"
      chrome={{
        breadcrumbPrimary: t('h12.breadcrumbOrg'),
        breadcrumbPage: t('h12.title'),
      }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('h12.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('h12.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="amber" uppercase={false}>
            {data?.period.label ?? 'FY2026'} · {t('common.projected')}
          </Badge>
          <Link
            to="/hr/reports"
            className="inline-flex items-center gap-2 rounded-[11px] border border-border bg-white px-3.5 py-2 text-[14px] font-semibold"
          >
            <FileDown className="h-4 w-4" />
            {t('h12.exportStory')}
          </Link>
        </div>
      </div>

      {isLoading ? <p className="text-muted">{t('h12.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="!rounded-[14px]">
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                {t('h12.kpiExpected')}
              </p>
              <p className="mt-1 text-[28px] font-semibold ltr-nums">
                {fmtSar(data.kpis.expected_annual_impact_sar)}
              </p>
              <p className="text-[12px] text-muted">
                {t('h12.netOfCost', {
                  net: fmtSar(data.kpis.net_impact_sar),
                  cost: fmtSar(data.kpis.program_cost_sar),
                  roi: dash(data.kpis.roi_multiple),
                })}
              </p>
              <p className="mt-1 text-[11px] text-amber-dark">
                {t('h12.estimated')}
              </p>
            </Card>
            <Card className="!rounded-[14px]">
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                {t('h12.kpiRealized')}
              </p>
              <p className="mt-1 text-[28px] font-semibold ltr-nums">
                {fmtSar(data.kpis.realized_so_far_sar)}
              </p>
              <p className="text-[12px] text-muted ltr-nums">
                {t('h12.pctOfExpected', {
                  pct: dash(data.kpis.realized_pct_of_gross),
                })}
              </p>
              <p className="mt-1 text-[11px] text-amber-dark">
                {t('h12.estimated')}
              </p>
            </Card>
            <Card className="!rounded-[14px]">
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                {t('h12.kpiHelped')}
              </p>
              <p className="mt-1 text-[28px] font-semibold ltr-nums">
                {data.kpis.people_helped}
              </p>
              <p className="text-[12px] text-muted ltr-nums">
                {t('h12.improved', { pct: dash(data.kpis.improved_pct) })}
              </p>
            </Card>
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Card className="!rounded-[14px]">
              <h2 className="text-base font-semibold">{t('h12.breakdown')}</h2>
              <p className="mb-3 text-[13px] text-muted">{t('h12.breakdownSub')}</p>
              <ul className="space-y-2 text-[13px]">
                {(
                  [
                    ['retention', data.breakdown.retention_savings_sar],
                    ['productivity', data.breakdown.productivity_gain_sar],
                    ['innovation', data.breakdown.innovation_value_sar],
                    ['gross', data.breakdown.gross_sar],
                    ['cost', data.breakdown.program_cost_sar],
                    ['net', data.breakdown.net_sar],
                  ] as const
                ).map(([key, val]) => (
                  <li
                    key={key}
                    className="flex items-center justify-between border-b border-surface-2 py-1.5"
                  >
                    <span>{t(`h12.sources.${key}`)}</span>
                    <span className="font-mono ltr-nums">{fmtSar(val)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-amber-dark">{t('h12.estimated')}</p>
            </Card>

            <Card className="!rounded-[14px]">
              <h2 className="text-base font-semibold">{t('h12.monthly')}</h2>
              <p className="mb-3 text-[13px] text-muted">{t('h12.monthlySub')}</p>
              <div className="h-[220px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: colors.muted }}
                    />
                    <YAxis tick={{ fontSize: 10, fill: colors.muted }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey="net"
                      stroke={colors.tealDark}
                      fill={colors.teal}
                      fillOpacity={0.25}
                      name={t('h12.sources.net')}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {data.impact_story ? (
            <Card className="mb-4 !rounded-[14px]">
              <h2 className="text-base font-semibold">{t('h12.story')}</h2>
              <p className="mb-3 text-[13px] text-muted">{t('h12.storySub')}</p>
              <dl className="grid gap-3 sm:grid-cols-2 text-[13px]">
                <div>
                  <dt className="font-mono text-[10px] uppercase text-muted">
                    {t('h12.intervention')}
                  </dt>
                  <dd className="mt-0.5 font-semibold ltr-nums">
                    {data.impact_story.display_id} · {data.impact_story.type}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase text-muted">
                    {t('h12.employee')}
                  </dt>
                  <dd className="mt-0.5">
                    {data.impact_story.employee_name ?? t('h12.employeeHidden')}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase text-muted">
                    {t('h12.risk')}
                  </dt>
                  <dd className="mt-0.5 font-mono ltr-nums">
                    {data.impact_story.baseline_risk_pct}% →{' '}
                    {data.impact_story.followup_risk_pct != null
                      ? `${data.impact_story.followup_risk_pct}%`
                      : '—'}
                    {data.impact_story.risk_delta_pts != null
                      ? ` (${data.impact_story.risk_delta_pts} pts)`
                      : ''}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase text-muted">
                    {t('h12.financial')}
                  </dt>
                  <dd className="mt-0.5">
                    {data.impact_story.financial_impact_sar != null
                      ? fmtSar(data.impact_story.financial_impact_sar)
                      : '—'}
                    {data.impact_story.financial_impact_projected ? (
                      <span className="ms-2 text-[11px] text-amber-dark">
                        {t('common.projected')}
                      </span>
                    ) : null}
                  </dd>
                </div>
              </dl>
            </Card>
          ) : null}

          <Card className="mb-4 !rounded-[14px]">
            <h2 className="text-base font-semibold">{t('h12.byDept')}</h2>
            <p className="mb-3 text-[13px] text-muted">{t('h12.byDeptSub')}</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-start text-[13px]">
                <thead>
                  <tr className="border-b border-border font-mono text-[10px] uppercase text-muted">
                    <th className="py-2 pe-2 font-medium">{t('h12.colDept')}</th>
                    <th className="py-2 pe-2 font-medium">{t('h12.sources.retention')}</th>
                    <th className="py-2 pe-2 font-medium">{t('h12.sources.productivity')}</th>
                    <th className="py-2 pe-2 font-medium">{t('h12.sources.innovation')}</th>
                    <th className="py-2 pe-2 font-medium">{t('h12.sources.cost')}</th>
                    <th className="py-2 font-medium">{t('h12.sources.net')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_department.map((d) => (
                    <tr key={d.department_id} className="border-b border-surface-2">
                      <td className="py-2.5 pe-2 font-medium">{d.department}</td>
                      <td className="py-2.5 pe-2 font-mono ltr-nums">
                        {fmtSar(d.retention_savings_sar)}
                      </td>
                      <td className="py-2.5 pe-2 font-mono ltr-nums">
                        {fmtSar(d.productivity_gain_sar)}
                      </td>
                      <td className="py-2.5 pe-2 font-mono ltr-nums">
                        {fmtSar(d.innovation_value_sar)}
                      </td>
                      <td className="py-2.5 pe-2 font-mono ltr-nums">
                        {fmtSar(d.program_cost_sar)}
                      </td>
                      <td className="py-2.5 font-mono ltr-nums">
                        {fmtSar(d.net_impact_sar)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="!rounded-[14px] border-navy/20 bg-navy/5">
            <h2 className="text-base font-semibold">{t('h12.assumptions')}</h2>
            <p className="mb-3 text-[13px] text-muted">{t('h12.assumptionsSub')}</p>
            <ul className="space-y-3">
              {data.assumptions.map((a) => (
                <li
                  key={a.id}
                  className="rounded-xl border border-border/60 bg-white px-3 py-2.5"
                >
                  <p className="font-mono text-[11px] text-navy ltr-nums">{a.formula}</p>
                  <p className="mt-1 text-[12px] text-muted">{a.note}</p>
                  {a.estimated ? (
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-dark">
                      {t('h12.estimated')}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : null}
    </AppShell>
  )
}
