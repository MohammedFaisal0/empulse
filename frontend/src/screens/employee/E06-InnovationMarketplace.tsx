import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useMeMarketplace } from '../../api/me'
import { Badge, Button, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { employeeNav } from '../../layout/navConfigs'

export function E06InnovationMarketplace() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useMeMarketplace()
  const m = data?.metrics

  return (
    <AppShell
      config={employeeNav}
      activePath="/employee/marketplace"
      chrome={{ breadcrumbPage: t('e06.title') }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('e06.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('e06.subtitle')}</p>
          <p className="mt-1 text-xs text-faint">{t('e06.publicNote')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/employee/growth">
            <Button variant="secondary">{t('e06.skillsGap')}</Button>
          </Link>
          <Link to="/employee/innovation-lab">
            <Button variant="primary">{t('e06.submitIdea')}</Button>
          </Link>
        </div>
      </div>

      {isLoading ? <p className="text-muted">{t('e06.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data && m ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label={t('e06.metricSubmitted')} value={String(m.ideas_submitted)} />
            <Metric label={t('e06.metricApproved')} value={String(m.approved)} />
            <Metric label={t('e06.metricInBuild')} value={String(m.in_build)} />
            <Metric
              label={t('e06.metricImplemented')}
              value={String(m.implemented)}
              note={t('e06.thisYear')}
            />
            <Metric
              label={t('e06.metricSavings')}
              value={`SAR ${Math.round(m.realized_savings_sar / 1000)}K`}
              note={t('e06.perYear')}
              tone="violet"
            />
          </div>

          <div className="mb-3">
            <h2 className="text-base font-semibold">{t('e06.opportunities')}</h2>
            <p className="text-[13px] text-muted">{t('e06.opportunitiesSub')}</p>
          </div>

          {data.ideas.length === 0 ? (
            <p className="text-muted">{t('e06.empty')}</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.ideas.map((idea) => (
                <Card key={idea.id} className="!rounded-2xl">
                  <div className="flex items-start justify-between gap-2">
                    <Badge tone="teal" uppercase={false}>
                      {idea.status}
                    </Badge>
                    <span className="font-mono text-[10px] text-faint">
                      {idea.category.toUpperCase()} · {idea.display_id}
                    </span>
                  </div>
                  <h3 className="mt-3 text-[17px] font-semibold text-ink">{idea.title}</h3>
                  <p className="mt-2 text-[13px] text-muted">
                    {t('e06.author', {
                      name: idea.author.first_name,
                      team: idea.author.team ?? '—',
                    })}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-faint ltr-nums">
                    {idea.submitted_at}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
                    {idea.estimated_value_sar ? (
                      <span className="rounded-lg bg-surface px-2 py-1">
                        {t('e06.estimated', {
                          sar: Math.round(idea.estimated_value_sar / 1000),
                        })}
                      </span>
                    ) : null}
                    {idea.realized_value_sar ? (
                      <span className="rounded-lg bg-teal-light px-2 py-1 text-teal-dark">
                        {t('e06.realized', {
                          sar: Math.round(idea.realized_value_sar / 1000),
                        })}
                      </span>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : null}
    </AppShell>
  )
}

function Metric({
  label,
  value,
  note,
  tone = 'teal',
}: {
  label: string
  value: string
  note?: string
  tone?: 'teal' | 'violet'
}) {
  return (
    <Card className="!rounded-[14px]">
      <p className="font-mono text-[10px] tracking-wide text-muted">{label}</p>
      <p
        className={[
          'mt-1 text-2xl font-semibold ltr-nums',
          tone === 'violet' ? 'text-violet' : 'text-teal-dark',
        ].join(' ')}
      >
        {value}
      </p>
      {note ? <p className="mt-1 text-xs text-muted">{note}</p> : null}
    </Card>
  )
}
