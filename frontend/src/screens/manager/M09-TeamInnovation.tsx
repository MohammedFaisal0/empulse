import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useManagerInnovation, useManagerTeam } from '../../api/manager'
import { Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { managerNav } from '../../layout/navConfigs'

const COLUMNS = [
  'submitted',
  'under_review',
  'approved',
  'implemented',
  'rejected',
] as const

function fmtSar(n: number): string {
  if (n >= 1000) return `SAR ${Math.round(n / 1000)}K`
  return `SAR ${n}`
}

export function M09TeamInnovation() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useManagerInnovation()
  const team = useManagerTeam()
  const kpis = data?.kpis
  const ideas = data?.ideas ?? []

  const byStatus = (status: string) =>
    ideas.filter((i) => i.status === status).sort((a, b) => a.title.localeCompare(b.title))

  const involved = new Set(ideas.map((i) => i.employee_id)).size

  return (
    <AppShell
      config={managerNav}
      activePath="/manager/innovation"
      attentionCount={team.data?.attention_count}
      chrome={{ breadcrumbPage: t('m09.title') }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('m09.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('m09.subtitle')}</p>
        </div>
        <Link
          to="/manager/pulseai"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-3.5 text-[14px] font-semibold text-navy"
        >
          <Sparkles className="h-4 w-4 text-teal-dark" />
          {t('m09.skillsCta')}
        </Link>
      </div>

      {isLoading ? <p className="text-muted">{t('m09.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data ? (
        <>
          <Card className="mb-4 !rounded-2xl">
            {kpis?.suppressed ? (
              <p className="text-sm text-muted">{t('m09.suppressed')}</p>
            ) : kpis && !kpis.suppressed ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="font-mono text-[11px] tracking-wide text-muted">
                    {t('m09.kpiIdeas')}
                  </p>
                  <p className="mt-1 text-[26px] font-semibold text-violet ltr-nums">
                    {kpis.ideas_count}
                  </p>
                  <p className="text-xs text-muted">
                    {t('m09.kpiIdeasSub', { n: involved, total: data.direct_reports })}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[11px] tracking-wide text-muted">
                    {t('m09.kpiActive')}
                  </p>
                  <p className="mt-1 text-[26px] font-semibold ltr-nums">
                    {kpis.status_counts.approved ?? 0}
                  </p>
                  <p className="text-xs text-muted">{t('m09.kpiActiveSub')}</p>
                </div>
                <div>
                  <p className="font-mono text-[11px] tracking-wide text-muted">
                    {t('m09.kpiImpact')}
                  </p>
                  <p className="mt-1 text-[26px] font-semibold text-violet ltr-nums">
                    {fmtSar(kpis.realized_value_sar)}
                  </p>
                  <p className="text-xs text-muted">{t('m09.kpiImpactSub')}</p>
                </div>
                <div>
                  <p className="font-mono text-[11px] tracking-wide text-muted">
                    {t('m09.kpiExpected')}
                  </p>
                  <p className="mt-1 text-[26px] font-semibold ltr-nums">
                    +{fmtSar(kpis.estimated_value_sar)}
                  </p>
                  <p className="text-xs text-muted">{t('m09.kpiExpectedSub')}</p>
                </div>
              </div>
            ) : null}
          </Card>

          <Card className="!rounded-2xl">
            <h2 className="text-base font-semibold">{t('m09.pipelineTitle')}</h2>
            <p className="mt-1 text-[13px] text-muted">
              {t('m09.pipelineSub', {
                ideas: ideas.length,
                people: involved,
                total: data.direct_reports,
              })}
            </p>
            <p className="mt-1 text-[12px] text-faint">{t('m09.noRank')}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
              {COLUMNS.map((col) => {
                const rows = byStatus(col)
                return (
                  <div
                    key={col}
                    className="rounded-2xl border border-border bg-surface p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-[11px] tracking-wide text-muted">
                        {t(`m09.col.${col}`)}
                      </span>
                      <span className="font-mono text-[11px] ltr-nums">
                        {rows.length}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {rows.map((idea) => (
                        <li
                          key={idea.id}
                          className={[
                            'rounded-xl border bg-white px-3 py-2.5 text-[13px]',
                            col === 'under_review'
                              ? 'border-violet'
                              : 'border-border',
                          ].join(' ')}
                        >
                          <p className="font-semibold leading-snug">{idea.title}</p>
                          <p className="mt-1 text-xs text-muted">{idea.submitter}</p>
                          <p className="mt-1 font-mono text-[11px] text-violet">
                            {idea.submitted_at
                              ? idea.submitted_at.slice(0, 10)
                              : '—'}
                          </p>
                        </li>
                      ))}
                      {rows.length === 0 ? (
                        <li className="px-1 py-4 text-center text-xs text-faint">
                          —
                        </li>
                      ) : null}
                    </ul>
                  </div>
                )
              })}
            </div>
          </Card>
        </>
      ) : null}
    </AppShell>
  )
}
