import { FileDown, FileText, Printer } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { downloadHrReportExport, useHrReports } from '../../api/hr'
import { Badge, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { hrNav } from '../../layout/navConfigs'
import { colors } from '../../theme/colors'

function fmtSar(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `SAR ${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `SAR ${Math.round(n / 1_000)}K`
  return `SAR ${n}`
}

export function H14ExecutiveReports() {
  const { t } = useTranslation()
  const [selected, setSelected] = useState('economic_impact')
  const [flash, setFlash] = useState<string | null>(null)
  const { data, isLoading, isError } = useHrReports(selected)
  const report = data?.report

  async function exportFmt(format: 'csv' | 'html') {
    setFlash(null)
    try {
      await downloadHrReportExport({ report: selected, format })
      setFlash(t('h14.exportOk', { format: format.toUpperCase() }))
    } catch {
      setFlash(t('common.error'))
    }
  }

  const trend =
    report?.burnout_trend_months.map((m) => ({
      label: m.month.slice(5, 7),
      elevated: m.elevated,
    })) ?? []

  return (
    <AppShell
      config={hrNav}
      activePath="/hr/reports"
      chrome={{
        breadcrumbPrimary: t('h14.breadcrumbOrg'),
        breadcrumbPage: t('h14.title'),
      }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('h14.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('h14.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[11px] border border-border bg-white px-3.5 py-2 text-[14px] font-semibold"
            onClick={() => void exportFmt('csv')}
          >
            <FileDown className="h-4 w-4" />
            {t('h14.exportCsv')}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[11px] bg-navy px-3.5 py-2 text-[14px] font-semibold text-white"
            onClick={() => void exportFmt('html')}
          >
            <Printer className="h-4 w-4" />
            {t('h14.printHtml')}
          </button>
        </div>
      </div>

      {flash ? <p className="mb-3 text-[13px] text-teal">{flash}</p> : null}
      {isLoading ? <p className="text-muted">{t('h14.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      <div className="mb-4 grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="!rounded-[14px]">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-muted">
            {t('h14.library')}
          </p>
          <ul className="space-y-1">
            {(data?.catalog ?? []).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelected(item.id)}
                  className={[
                    'w-full rounded-[10px] px-3 py-2.5 text-start text-[13px]',
                    selected === item.id
                      ? 'bg-navy text-white'
                      : 'hover:bg-surface-3',
                  ].join(' ')}
                >
                  <span className="font-semibold">
                    {t(`h14.reports.${item.title_key}`)}
                  </span>
                  <span
                    className={[
                      'mt-0.5 block text-[11px]',
                      selected === item.id ? 'text-white/70' : 'text-muted',
                    ].join(' ')}
                  >
                    {t(`h14.cadence.${item.cadence}`)} ·{' '}
                    {t(`h14.audience.${item.audience}`)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-faint">{t('h14.customTodo')}</p>
        </Card>

        {report ? (
          <div className="space-y-4">
            <Card className="!rounded-[14px]">
              <Badge tone="slate" uppercase>
                {t('h14.confidential')}
              </Badge>
              <h2 className="mt-2 text-[20px] font-semibold">
                {t('h14.peopleImpact')}
              </h2>
              <p className="mt-1 text-[13px] text-muted">
                {t('h14.lead', {
                  report: t(`h14.reports.${selected}`),
                })}
              </p>
              <p className="mt-2 text-[11px] text-faint">
                {t('h14.aggOnly', { n: report.suppression_min })}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-border/60 px-3 py-2.5">
                  <p className="font-mono text-[10px] uppercase text-muted">
                    {t('h14.elevated')}
                  </p>
                  <p className="text-[24px] font-semibold ltr-nums">
                    {report.elevated_burnout}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 px-3 py-2.5">
                  <p className="font-mono text-[10px] uppercase text-muted">
                    {t('h14.orgPulse')}
                  </p>
                  <p className="text-[24px] font-semibold ltr-nums">
                    {report.org_pulse.engagement ?? '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 px-3 py-2.5">
                  <p className="font-mono text-[10px] uppercase text-muted">
                    {t('h14.expectedImpact')}
                  </p>
                  <p className="text-[20px] font-semibold ltr-nums">
                    {fmtSar(report.economic.gross_impact_sar)}
                  </p>
                  <p className="text-[11px] text-amber-dark">
                    {t('h14.estimated')}
                    {report.economic.roi_multiple != null
                      ? ` · ${report.economic.roi_multiple}×`
                      : ''}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 px-3 py-2.5">
                  <p className="font-mono text-[10px] uppercase text-muted">
                    {t('h14.headcount')}
                  </p>
                  <p className="text-[24px] font-semibold ltr-nums">
                    {report.headcount}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-[13px] font-semibold">
                  {t('h14.capability')}
                </p>
                <div className="flex h-3 overflow-hidden rounded-full" dir="ltr">
                  {(['gold', 'silver', 'bronze', 'growth'] as const).map((tier) => {
                    const pct = report.capability_tiers[tier]?.pct ?? 0
                    const colorsMap: Record<string, string> = {
                      gold: 'bg-tier-gold',
                      silver: 'bg-tier-silver',
                      bronze: 'bg-tier-bronze',
                      growth: 'bg-tier-growth',
                    }
                    return (
                      <div
                        key={tier}
                        className={colorsMap[tier]}
                        style={{ width: `${pct}%` }}
                        title={`${tier} ${pct}%`}
                      />
                    )
                  })}
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted">
                  {(['gold', 'silver', 'bronze', 'growth'] as const).map((tier) => (
                    <span key={tier} className="ltr-nums">
                      {t(`h14.tiers.${tier}`)}{' '}
                      {report.capability_tiers[tier]?.pct ?? 0}%
                    </span>
                  ))}
                </div>
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="!rounded-[14px]">
                <h3 className="text-[14px] font-semibold">{t('h14.burnoutTrend')}</h3>
                <div className="mt-2 h-[160px] w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trend}>
                      <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: colors.muted }}
                      />
                      <YAxis tick={{ fontSize: 10, fill: colors.muted }} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Bar
                        dataKey="elevated"
                        fill={colors.coral}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="!rounded-[14px]">
                <h3 className="text-[14px] font-semibold">{t('h14.narrative')}</h3>
                <ul className="mt-2 space-y-2 text-[13px] text-muted">
                  <li>
                    <span className="font-semibold text-ink">
                      {t('h14.whatHappened')}
                    </span>{' '}
                    {t('h14.whatHappenedBody', {
                      n: report.elevated_burnout,
                    })}
                  </li>
                  <li>
                    <span className="font-semibold text-ink">
                      {t('h14.whatWeDid')}
                    </span>{' '}
                    {t('h14.whatWeDidBody', {
                      measured: report.interventions.measured,
                      improved: report.interventions.improved,
                    })}
                  </li>
                  <li>
                    <span className="font-semibold text-ink">
                      {t('h14.whatChanged')}
                    </span>{' '}
                    {t('h14.whatChangedBody', {
                      ideas: report.innovation.ideas_this_year,
                      implemented: report.innovation.implemented,
                    })}
                  </li>
                  <li>
                    <span className="font-semibold text-ink">{t('h14.whatNext')}</span>{' '}
                    {t('h14.whatNextBody')}
                  </li>
                </ul>
              </Card>
            </div>

            <Card className="!rounded-[14px]">
              <div className="mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted" />
                <h3 className="text-[14px] font-semibold">{t('h14.depts')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-start text-[13px]">
                  <thead>
                    <tr className="border-b border-border font-mono text-[10px] uppercase text-muted">
                      <th className="py-2 pe-2 font-medium">{t('h14.colDept')}</th>
                      <th className="py-2 pe-2 font-medium">N</th>
                      <th className="py-2 pe-2 font-medium">{t('h14.colPerf')}</th>
                      <th className="py-2 pe-2 font-medium">{t('h14.colEng')}</th>
                      <th className="py-2 font-medium">{t('h14.colBurn')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.departments.map((d) => (
                      <tr key={d.department} className="border-b border-surface-2">
                        <td className="py-2 pe-2 font-medium">{d.department}</td>
                        <td className="py-2 pe-2 font-mono ltr-nums">{d.n}</td>
                        <td className="py-2 pe-2 font-mono ltr-nums">
                          {d.performance ?? '—'}
                        </td>
                        <td className="py-2 pe-2 font-mono ltr-nums">
                          {d.engagement ?? '—'}
                        </td>
                        <td className="py-2 font-mono ltr-nums">
                          {d.burnout_risk_pct ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] text-faint">{t('h14.exportAudit')}</p>
            </Card>
          </div>
        ) : null}
      </div>
    </AppShell>
  )
}
