import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useManagerReports, useManagerTeam } from '../../api/manager'
import { Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { managerNav } from '../../layout/navConfigs'

const SECTIONS = [
  'performance',
  'wellbeing',
  'burnout',
  'engagement',
  'innovation',
  'recognition',
  'interventions',
] as const

export function M11TeamReports() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useManagerReports()
  const team = useManagerTeam()
  const [section, setSection] = useState<(typeof SECTIONS)[number]>('performance')
  const report = data?.report
  const agg = team.data?.aggregates

  return (
    <AppShell
      config={managerNav}
      activePath="/manager/reports"
      attentionCount={team.data?.attention_count}
      chrome={{ breadcrumbPage: t('m11.title') }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('m11.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('m11.subtitle')}</p>
        </div>
        <div className="rounded-xl border border-border bg-white px-3.5 py-2 text-[14px] font-medium">
          {data?.month_label ?? '—'}
        </div>
      </div>

      {isLoading ? <p className="text-muted">{t('m11.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data ? (
        <div className="grid gap-4 lg:grid-cols-[250px_1fr]">
          <div>
            <p className="mb-2 font-mono text-[11px] tracking-wide text-muted">
              {t('m11.navLabel')}
            </p>
            <ul className="space-y-1">
              {SECTIONS.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setSection(id)}
                    className={[
                      'flex w-full rounded-xl px-3 py-2.5 text-start text-[13.5px]',
                      section === id
                        ? 'border border-border bg-white font-semibold shadow-card'
                        : 'font-medium text-ink hover:bg-white/60',
                    ].join(' ')}
                  >
                    {t(`m11.nav.${id}`)}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] text-faint">{t('m11.scopeNote')}</p>
          </div>

          <Card className="!rounded-md !p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <p className="text-sm font-bold tracking-[0.12em] text-navy">
                EMPULSE
              </p>
              <p className="font-mono text-[11px] text-muted">
                {t('m11.reportMeta', { month: data.month_label })}
              </p>
            </div>

            {report?.suppressed ? (
              <p className="text-sm text-muted">{t('m11.suppressed')}</p>
            ) : report && !report.suppressed ? (
              <>
                <h2 className="max-w-md text-[28px] font-semibold leading-tight tracking-[-0.03em]">
                  {t('m11.headline', {
                    team: team.data?.team ?? t('m11.yourTeam'),
                  })}
                </h2>

                <div className="mt-8 space-y-5 text-[13.5px]">
                  {section === 'performance' ? (
                    <div>
                      <p className="font-bold">{t('m11.nav.performance')}</p>
                      <p className="mt-2 text-ink">
                        {t('m11.body.performance', {
                          score: report.performance_score ?? '—',
                          n: report.n,
                        })}
                      </p>
                      {agg && !agg.suppressed ? (
                        <p className="mt-2 text-muted">
                          {t('m11.body.performanceExtra', {
                            collab: agg.collaboration_score ?? '—',
                            task: agg.task_completion_rate ?? '—',
                          })}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {section === 'wellbeing' || section === 'burnout' ? (
                    <div>
                      <p className="font-bold">{t(`m11.nav.${section}`)}</p>
                      <p className="mt-2">
                        {t('m11.body.wellbeing', {
                          wellbeing: report.wellbeing_score ?? '—',
                          burnout: report.burnout_risk_pct ?? '—',
                          attention: team.data?.attention_count ?? '—',
                          n: report.n,
                        })}
                      </p>
                      <p className="mt-2 text-xs text-faint">{t('m11.wellbeingNote')}</p>
                    </div>
                  ) : null}

                  {section === 'engagement' ? (
                    <div>
                      <p className="font-bold">{t('m11.nav.engagement')}</p>
                      <p className="mt-2">
                        {t('m11.body.engagement', {
                          score: report.engagement_score ?? '—',
                        })}
                      </p>
                    </div>
                  ) : null}

                  {section === 'innovation' ? (
                    <div>
                      <p className="font-bold">{t('m11.nav.innovation')}</p>
                      <p className="mt-2">
                        {t('m11.body.innovation', {
                          ideas: report.ideas_count,
                          score: report.innovation_score ?? '—',
                        })}
                      </p>
                    </div>
                  ) : null}

                  {section === 'recognition' ? (
                    <div>
                      <p className="font-bold">{t('m11.nav.recognition')}</p>
                      <p className="mt-2">
                        {t('m11.body.recognition', {
                          n: report.recognitions_count,
                        })}
                      </p>
                    </div>
                  ) : null}

                  {section === 'interventions' ? (
                    <div>
                      <p className="font-bold">{t('m11.nav.interventions')}</p>
                      <p className="mt-2">
                        {t('m11.body.interventions', {
                          total: report.interventions_count,
                          done: report.interventions_completed,
                        })}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-10 rounded-[10px] bg-surface px-4 py-3 text-[12.5px]">
                  <p className="font-bold">{t('m11.impactTitle')}</p>
                  <p className="mt-1 text-muted">{t('m11.impactBody')}</p>
                </div>
              </>
            ) : null}
          </Card>
        </div>
      ) : null}
    </AppShell>
  )
}
