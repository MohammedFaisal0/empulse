import { ArrowRight, Download, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import {
  exportHrEmployeesCsv,
  useHrEmployees,
  type HrEmployeesFilters,
} from '../../api/hr'
import { RtlFlip } from '../../components/RtlFlip'
import { Avatar, Badge, Card, Medallion, type Tier } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { hrNav } from '../../layout/navConfigs'

function toTier(raw: string | null): Tier {
  const t = (raw ?? '').toLowerCase()
  if (t === 'gold' || t === 'silver' || t === 'bronze' || t === 'growth') return t
  return 'growth'
}

const PAGE_SIZE = 50

export function H03Employees() {
  const { t } = useTranslation()
  const [qDraft, setQDraft] = useState('')
  const [filters, setFilters] = useState<HrEmployeesFilters>({
    page: 1,
    limit: PAGE_SIZE,
    alert: 'any',
    development: 'any',
  })
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(false)

  const { data, isLoading, isError } = useHrEmployees(filters)

  const tierMix = data?.summary.tier_mix
  const tierTotal = useMemo(() => {
    if (!tierMix) return 1
    return Math.max(1, Object.values(tierMix).reduce((a, b) => a + b, 0))
  }, [tierMix])

  const pages = data?.pages ?? 1
  const page = data?.page ?? 1

  async function onExport() {
    setExporting(true)
    setExportError(false)
    try {
      await exportHrEmployeesCsv(filters)
    } catch {
      setExportError(true)
    } finally {
      setExporting(false)
    }
  }

  return (
    <AppShell
      config={hrNav}
      activePath="/hr/employees"
      chrome={{
        breadcrumbPrimary: t('h03.breadcrumbOrg'),
        breadcrumbPage: t('h03.title'),
      }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('h03.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('h03.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => void onExport()}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-[11px] border border-border bg-white px-3.5 py-2 text-[14px] font-medium"
        >
          <Download className="h-4 w-4" />
          {exporting ? t('h03.exporting') : t('h03.export')}
        </button>
      </div>
      {exportError ? (
        <p className="mb-3 text-[13px] text-coral-dark">{t('h03.exportFailed')}</p>
      ) : null}

      {data?.summary ? (
        <Card className="mb-4 !rounded-[14px]">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.4fr]">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                {t('h03.people')}
              </p>
              <p className="mt-1 text-[28px] font-semibold ltr-nums">
                {data.summary.people.toLocaleString()}
              </p>
              <p className="text-[12.5px] text-muted">
                {t('h03.peopleSub', {
                  depts: data.summary.departments,
                  teams: data.summary.teams,
                })}
              </p>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                {t('h03.wellbeingAlerts')}
              </p>
              <p className="mt-1 text-[28px] font-semibold ltr-nums">
                {data.summary.wellbeing_alerts}
              </p>
              <p className="text-[12.5px] text-muted">{t('h03.alertsSub')}</p>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                {t('h03.devPlans')}
              </p>
              <p className="mt-1 text-[28px] font-semibold ltr-nums">
                {data.summary.development_plans_active}
              </p>
              <p className="text-[12.5px] text-muted">
                {t('h03.devPlansSub', { n: data.summary.growth_tier_count })}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                {t('h03.tierMix')}
              </p>
              <div className="mt-2 flex h-[22px] overflow-hidden rounded-md">
                {(['gold', 'silver', 'bronze', 'growth'] as const).map((k) => {
                  const n = tierMix?.[k] ?? 0
                  const pct = Math.round((100 * n) / tierTotal)
                  return (
                    <div
                      key={k}
                      style={{ width: `${pct}%` }}
                      className={[
                        'flex items-center ps-1 text-[10.5px] font-bold text-navy',
                        k === 'gold'
                          ? 'bg-tier-gold'
                          : k === 'silver'
                            ? 'bg-[#b3beca]'
                            : k === 'bronze'
                              ? 'bg-tier-bronze'
                              : 'bg-tier-growth',
                      ].join(' ')}
                      title={`${k} ${pct}%`}
                    >
                      {pct >= 10 ? `${pct}%` : ''}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="relative">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <input
            className="h-10 w-56 rounded-xl border border-border bg-white ps-8 pe-3 text-[13px]"
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setFilters((f) => ({ ...f, q: qDraft, page: 1 }))
              }
            }}
            placeholder={t('h03.searchPh')}
          />
        </label>
        <select
          className="h-10 rounded-xl border border-border bg-white px-3 text-[13px]"
          value={filters.department ?? ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              department: e.target.value || undefined,
              page: 1,
            }))
          }
        >
          <option value="">{t('h03.filterDept')}</option>
          {(data?.filters.departments ?? []).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-xl border border-border bg-white px-3 text-[13px]"
          value={filters.tier ?? ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              tier: e.target.value || undefined,
              page: 1,
            }))
          }
        >
          <option value="">{t('h03.filterTier')}</option>
          {(data?.filters.tiers ?? []).map((tier) => (
            <option key={tier} value={tier}>
              {tier.toUpperCase()}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-xl border border-border bg-white px-3 text-[13px]"
          value={filters.alert ?? 'any'}
          onChange={(e) =>
            setFilters((f) => ({ ...f, alert: e.target.value, page: 1 }))
          }
        >
          <option value="any">{t('h03.filterAlert')}</option>
          <option value="alert">{t('h03.alert')}</option>
          <option value="none">{t('h03.alertNone')}</option>
        </select>
        <select
          className="h-10 rounded-xl border border-border bg-white px-3 text-[13px]"
          value={filters.development ?? 'any'}
          onChange={(e) =>
            setFilters((f) => ({ ...f, development: e.target.value, page: 1 }))
          }
        >
          <option value="any">{t('h03.filterDev')}</option>
          <option value="active">{t('h03.devActive')}</option>
          <option value="on_track">{t('h03.onTrack')}</option>
          <option value="watch">{t('h03.devWatch')}</option>
        </select>
        <span className="ms-auto rounded-xl border border-border bg-white px-3 py-2 text-[13px] text-muted">
          {t('h03.sortAlpha')}
        </span>
        <button
          type="button"
          className="h-10 rounded-xl bg-navy px-3.5 text-[13px] font-semibold text-white"
          onClick={() => setFilters((f) => ({ ...f, q: qDraft, page: 1 }))}
        >
          {t('h03.apply')}
        </button>
      </div>

      <p className="mb-4 rounded-xl bg-teal-light/60 px-4 py-3 text-[12.5px] font-semibold text-ink">
        {t('h03.directoryBanner')}
      </p>

      {isLoading ? <p className="text-muted">{t('h03.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data ? (
        <Card className="!rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-[13px]">
              <thead>
                <tr className="border-b border-border font-mono text-[10.5px] tracking-wide text-muted">
                  <th className="px-3 py-2 font-medium">{t('h03.colPerson')}</th>
                  <th className="px-3 py-2 font-medium">{t('h03.colDept')}</th>
                  <th className="px-3 py-2 font-medium">{t('h03.colTier')}</th>
                  <th className="px-3 py-2 font-medium">{t('h03.colWellbeing')}</th>
                  <th className="px-3 py-2 font-medium">{t('h03.colDev')}</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {data.people.map((p) => (
                  <tr key={p.id} className="border-b border-surface-2">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.full_name} size="sm" />
                        <div>
                          <p className="font-semibold">{p.full_name}</p>
                          <p className="text-[11.5px] text-muted">{p.job_title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <p>{p.department}</p>
                      <p className="text-[11.5px] text-muted">{p.team ?? '—'}</p>
                    </td>
                    <td className="px-3 py-3">
                      {p.performance_score != null ? (
                        <div className="flex items-center gap-2">
                          <Medallion
                            score={p.performance_score}
                            tier={toTier(p.performance_tier)}
                            size="sm"
                          />
                          <span className="ltr-nums font-mono text-[12px]">
                            {p.performance_tier?.toUpperCase()} · {p.performance_score}
                          </span>
                        </div>
                      ) : (
                        t('common.dash')
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {p.wellbeing_alert ? (
                        <Badge tone="coral" uppercase={false}>
                          {t('h03.alert')}
                        </Badge>
                      ) : (
                        <span className="text-faint">{t('common.dash')}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted">
                      {p.development === 'active'
                        ? t('h03.devActive')
                        : p.development === 'on_track'
                          ? t('h03.onTrack')
                          : t('h03.devWatch')}
                    </td>
                    <td className="px-3 py-3 text-end">
                      <Link
                        to={`/hr/employees/${p.id}`}
                        className="inline-flex items-center gap-1 text-[13px] font-semibold text-teal-dark"
                      >
                        {t('h03.profile')}
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
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-[12.5px] text-muted">
            <p>
              {t('h03.showing', {
                shown: data.people.length,
                total: data.total,
              })}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                className="rounded-lg border border-border px-2.5 py-1 disabled:opacity-40"
                onClick={() =>
                  setFilters((f) => ({ ...f, page: Math.max(1, page - 1) }))
                }
              >
                ‹
              </button>
              <span className="px-2 font-mono ltr-nums">
                {page} / {pages}
              </span>
              <button
                type="button"
                disabled={page >= pages}
                className="rounded-lg border border-border px-2.5 py-1 disabled:opacity-40"
                onClick={() =>
                  setFilters((f) => ({ ...f, page: Math.min(pages, page + 1) }))
                }
              >
                ›
              </button>
            </div>
          </div>
        </Card>
      ) : null}
    </AppShell>
  )
}
