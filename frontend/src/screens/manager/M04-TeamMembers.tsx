import { ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useManagerTeam, type TeamMemberRow } from '../../api/manager'
import { RtlFlip } from '../../components/RtlFlip'
import { Avatar, Badge, Button, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { managerNav } from '../../layout/navConfigs'

type Filter = 'all' | 'at_risk' | 'watch' | 'improving' | 'healthy'

function recommendedKey(p: TeamMemberRow): string {
  if (p.burnout_risk_pct >= 60) return 'm04.recIntervene'
  if (p.wellbeing_score < 55) return 'm04.recPace'
  if (p.engagement_score < 70) return 'm04.recEngage'
  return 'm04.recRecognize'
}

export function M04TeamMembers() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useManagerTeam()
  const [filter, setFilter] = useState<Filter>('all')

  // Alphabetical always — never by score (product rule).
  const people = useMemo(() => {
    const list = [...(data?.people ?? [])].sort((a, b) =>
      a.full_name.localeCompare(b.full_name),
    )
    if (filter === 'all') return list
    return list.filter((p) => p.status_band === filter)
  }, [data?.people, filter])

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: t('m04.tabAll'), count: data?.direct_reports ?? 0 },
    {
      id: 'at_risk',
      label: t('m04.tabAtRisk'),
      count: data?.band_counts.at_risk ?? 0,
    },
    {
      id: 'watch',
      label: t('m04.tabWatch'),
      count: data?.band_counts.watch ?? 0,
    },
    {
      id: 'improving',
      label: t('m04.tabImproving'),
      count: data?.band_counts.improving ?? 0,
    },
    {
      id: 'healthy',
      label: t('m04.tabHealthy'),
      count: data?.band_counts.healthy ?? 0,
    },
  ]

  return (
    <AppShell
      config={managerNav}
      activePath="/manager/members"
      attentionCount={data?.attention_count}
      chrome={{ breadcrumbPage: t('m04.title') }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('m04.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('m04.subtitle')}</p>
        </div>
        <Button variant="primary">{t('m04.recognizeSomeone')}</Button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={[
              'rounded-[9px] px-3 py-2 text-[13px]',
              filter === tab.id
                ? 'bg-navy font-semibold text-white'
                : 'border border-border bg-white text-ink',
            ].join(' ')}
          >
            {tab.label} {tab.count}
          </button>
        ))}
      </div>
      <p className="mb-4 rounded-lg bg-surface-3 px-3 py-2 text-[12.5px] text-muted">
        {t('m04.sortBanner')}
      </p>

      {isLoading ? <p className="text-muted">{t('m04.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('errors.error.unknown')}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {people.map((p) => (
          <Card key={p.id} className="!rounded-2xl">
            <div className="flex items-start gap-3">
              <Avatar name={p.full_name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{p.full_name}</p>
                <p className="truncate text-xs text-muted">{p.job_title}</p>
              </div>
              <Badge
                tone={
                  p.status_band === 'at_risk'
                    ? 'coral'
                    : p.status_band === 'watch'
                      ? 'amber'
                      : p.status_band === 'improving'
                        ? 'teal'
                        : 'slate'
                }
              >
                {p.status_band}
              </Badge>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Badge tone="amber">
                {p.performance_tier.toUpperCase()} {p.performance_score}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
              <div>
                <p className="font-mono text-[10px] text-muted">{t('m04.performance')}</p>
                <p className="ltr-nums font-semibold">{p.performance_score}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-muted">{t('m04.engagement')}</p>
                <p className="ltr-nums font-semibold">
                  {Math.round(p.engagement_score)}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-muted">{t('m04.burnout')}</p>
                <p className="ltr-nums font-semibold text-coral-dark">
                  {p.burnout_risk_pct}%
                </p>
              </div>
            </div>
            <p className="mt-3 text-[12.5px] text-muted">
              {t('m04.recommended')}: {t(recommendedKey(p))}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to={`/manager/members/${p.id}`}
                className="inline-flex items-center gap-1 text-[13px] font-semibold text-teal-dark"
              >
                {t('m04.profile')}
                <RtlFlip>
                  <ArrowRight className="h-3.5 w-3.5" />
                </RtlFlip>
              </Link>
              <Button variant="secondary" className="!h-8 !py-1 !text-xs">
                {t('m04.intervene')}
              </Button>
              <Button variant="secondary" className="!h-8 !py-1 !text-xs">
                {t('m04.recognize')}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  )
}
