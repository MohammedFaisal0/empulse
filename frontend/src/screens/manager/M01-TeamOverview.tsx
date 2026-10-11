import { ArrowRight, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../../auth/AuthContext'
import {
  useManagerTeam,
  type TeamChange,
  type TeamMemberRow,
} from '../../api/manager'
import type { TFunction } from 'i18next'
import { RtlFlip } from '../../components/RtlFlip'
import { Avatar, Badge, Button, Card, Medallion, Stat } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { managerNav } from '../../layout/navConfigs'

function fmtDelta(n: number | null | undefined): string | undefined {
  if (n == null) return undefined
  const sign = n > 0 ? '+' : ''
  return `${sign}${n}`
}

function changeCopy(t: TFunction, c: TeamChange): string {
  const sign = c.delta > 0 ? '+' : ''
  if (c.metric === 'workload') {
    return t('m01.changeWorkload', { delta: `${sign}${c.delta}` })
  }
  if (c.metric === 'overtime') {
    return t('m01.changeOvertime', {
      delta: `${sign}${c.delta}`,
      count: c.people_count ?? 0,
    })
  }
  if (c.metric === 'engagement') {
    return t('m01.changeEngagement', { delta: `${sign}${c.delta}` })
  }
  if (c.metric === 'innovation') {
    return t('m01.changeInnovation', { count: c.delta })
  }
  return `${c.metric} ${sign}${c.delta}`
}

export function M01TeamOverview() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data, isLoading, isError } = useManagerTeam()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const agg = data?.aggregates
  const people = data?.people ?? []
  const selected: TeamMemberRow | undefined =
    people.find((p) => p.id === selectedId) ??
    people.find((p) => p.status_band === 'at_risk') ??
    people[0]

  const actionQueue = useMemo(
    () =>
      [...people]
        .filter((p) => p.status_band === 'at_risk' || p.status_band === 'watch')
        .sort((a, b) => b.burnout_risk_pct - a.burnout_risk_pct),
    [people],
  )

  const firstName = user?.name?.split(' ')[0] ?? ''

  return (
    <AppShell
      config={managerNav}
      activePath="/manager/overview"
      attentionCount={data?.attention_count}
      chrome={{ breadcrumbPage: t('m01.title') }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('m01.greeting', { name: firstName })}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('m01.subtitle')}</p>
          <p className="mt-0.5 text-sm text-muted">
            {t('m01.teamLine', {
              team: data?.team ?? '—',
              count: data?.direct_reports ?? '—',
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/manager/pulse"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-white px-3.5 text-[13px] font-medium text-navy"
          >
            <Sparkles className="h-4 w-4 text-teal-dark" />
            {t('m01.whyEngagement')}
          </Link>
          <Link
            to="/manager/burnout"
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-navy px-3.5 text-[13px] font-medium text-white shadow-primaryButton"
          >
            {t('m01.startIntervention')}
            <RtlFlip>
              <ArrowRight className="h-4 w-4" />
            </RtlFlip>
          </Link>
        </div>
      </div>

      {isLoading ? <p className="text-muted">{t('m01.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('errors.error.unknown')}</p> : null}

      {data && agg && !agg.suppressed ? (
        <>
          <div className="mb-4 grid gap-3 lg:grid-cols-[184px_1fr]">
            <Card className="flex flex-col items-center bg-navy !text-white">
              <p className="font-mono text-[9.5px] tracking-wide text-faint">
                {t('m01.empulseTier')}
              </p>
              <Medallion
                score={Math.round(agg.empulse_score ?? 0)}
                tier={agg.empulse_tier as 'gold' | 'silver' | 'bronze' | 'growth'}
                className="mt-3"
              />
              <p className="mt-3 text-lg font-bold uppercase">{agg.empulse_tier}</p>
              <p className="text-center text-[11px] text-faint">{t('m01.tierSub')}</p>
              <p className="mt-2 text-[9.5px] text-muted">
                {t('m01.toGold', { n: agg.points_to_gold })}
              </p>
              <p className="mt-1 text-center text-[9.5px] text-faint">
                {t('m01.avgNote', { n: agg.n })}
              </p>
            </Card>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Stat
                label={t('m01.performance')}
                value={Math.round(agg.performance_score ?? 0)}
                delta={fmtDelta(agg.performance_delta)}
                deltaTone={(agg.performance_delta ?? 0) < 0 ? 'down' : 'up'}
              />
              <Stat
                label={t('m01.engagement')}
                value={Math.round(agg.engagement_score ?? 0)}
                delta={fmtDelta(agg.engagement_delta)}
                deltaTone={(agg.engagement_delta ?? 0) < 0 ? 'down' : 'up'}
              />
              <Stat
                label={t('m01.wellbeing')}
                value={Math.round(agg.wellbeing_score ?? 0)}
                delta={fmtDelta(agg.wellbeing_delta)}
                deltaTone={(agg.wellbeing_delta ?? 0) < 0 ? 'down' : 'up'}
              />
              <Stat
                label={t('m01.morale')}
                value={Math.round(agg.morale_score ?? 0)}
                delta={fmtDelta(agg.morale_delta)}
                deltaTone={(agg.morale_delta ?? 0) < 0 ? 'down' : 'up'}
              />
              <Stat
                label={t('m01.innovation')}
                value={Math.round(agg.innovation_score ?? 0)}
                delta={fmtDelta(agg.innovation_delta)}
                deltaTone="up"
              />
              <Stat
                label={t('m01.burnoutRisk')}
                value={`${Math.round(agg.burnout_risk_pct ?? 0)}%`}
                delta={fmtDelta(agg.burnout_delta)}
                deltaTone="down"
              />
            </div>
          </div>
          <p className="mb-2 text-[11px] text-faint">
            {/* TODO: morale uses engagement proxy — no separate morale field */}
            {t('m01.moraleTodo')}
          </p>

          <Card className="mb-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">{t('m01.pulseMap')}</h2>
                <p className="text-xs text-muted">{t('m01.pulseMapSub')}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <span>
                  <Badge tone="coral">{t('m01.bandAtRisk')}</Badge>{' '}
                  {data.band_counts.at_risk}
                </span>
                <span>
                  <Badge tone="amber">{t('m01.bandWatch')}</Badge>{' '}
                  {data.band_counts.watch}
                </span>
                <span>
                  <Badge tone="teal">{t('m01.bandImproving')}</Badge>{' '}
                  {data.band_counts.improving}
                </span>
                <span>
                  <Badge tone="slate">{t('m01.bandHealthy')}</Badge>{' '}
                  {data.band_counts.healthy}
                </span>
              </div>
            </div>
            <div className="relative mx-auto flex h-64 max-w-xl flex-wrap items-center justify-center gap-3 rounded-2xl bg-surface">
              {people.map((p, idx) => {
                const urgent = p.status_band === 'at_risk'
                const angle = (idx / Math.max(1, people.length)) * Math.PI * 2
                const radius = urgent ? 48 : p.status_band === 'watch' ? 72 : 100
                const x = 50 + Math.cos(angle) * (radius / 2.4)
                const y = 50 + Math.sin(angle) * (radius / 2.8)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={[
                      'absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white p-0.5 shadow-card',
                      selected?.id === p.id ? 'border-coral' : 'border-border',
                      urgent ? 'h-12 w-12' : 'h-10 w-10',
                    ].join(' ')}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    title={p.full_name}
                  >
                    <Avatar name={p.full_name} size="sm" />
                  </button>
                )
              })}
            </div>
          </Card>

          {selected ? (
            <Card className="mb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={selected.full_name} />
                  <div>
                    <p className="font-semibold text-ink">{selected.full_name}</p>
                    <p className="text-xs text-muted">{selected.job_title}</p>
                  </div>
                  <Badge tone="amber">{selected.performance_tier}</Badge>
                  {selected.burnout_risk_pct >= 60 ? (
                    <Badge tone="coral">
                      {t('m01.burnoutRisk')} {selected.burnout_risk_pct}%
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/manager/members/${selected.id}`}
                    className="inline-flex items-center gap-1 text-[13px] font-semibold text-teal-dark"
                  >
                    {t('m01.viewProfile')}
                    <RtlFlip>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </RtlFlip>
                  </Link>
                  <Link to="/manager/recognition">
                    <Button variant="secondary" className="!py-1.5">
                      {t('m01.recognize')}
                    </Button>
                  </Link>
                  <Link to="/manager/burnout">
                    <Button variant="accent" className="!bg-coral-dark !py-1.5">
                      {t('m01.intervene')}
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <Stat label={t('m01.performance')} value={selected.performance_score} />
                <Stat
                  label={t('m01.engagement')}
                  value={Math.round(selected.engagement_score)}
                />
                <Stat label={t('m01.wellbeing')} value={selected.wellbeing_score} />
                <Stat
                  label={t('m01.burnoutRisk')}
                  value={`${selected.burnout_risk_pct}%`}
                />
              </div>
            </Card>
          ) : null}

          <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_436px]">
            <div />
            <Card className="!rounded-2xl">
              <h2 className="mb-3 text-base font-semibold text-ink">
                {t('m01.whatsChanging')}
              </h2>
              <ul className="space-y-3 text-[13px] text-ink">
                {(data.changes ?? []).map((c) => (
                  <li key={c.id} className="flex gap-2">
                    <span
                      className={[
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                        c.tone === 'teal'
                          ? 'bg-teal'
                          : c.tone === 'amber'
                            ? 'bg-amber'
                            : 'bg-coral',
                      ].join(' ')}
                    />
                    <span>{changeCopy(t, c)}</span>
                  </li>
                ))}
                {(data.changes ?? []).length === 0 ? (
                  <li className="text-muted">{t('m01.noChanges')}</li>
                ) : null}
              </ul>
            </Card>
          </div>

          <Card>
            <h2 className="mb-3 text-base font-semibold">{t('m01.actionQueue')}</h2>
            <ul className="space-y-2">
              {actionQueue.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-[13px]"
                >
                  <div>
                    <p className="font-semibold">{p.full_name}</p>
                    <p className="text-xs text-muted">
                      {t('m01.queueSignal', { pct: p.burnout_risk_pct })}
                    </p>
                  </div>
                  <Badge tone={p.status_band === 'at_risk' ? 'coral' : 'amber'}>
                    {p.status_band}
                  </Badge>
                  <Link
                    to={`/manager/members/${p.id}`}
                    className="inline-flex items-center gap-1 font-semibold text-teal-dark"
                  >
                    {t('m01.open')}
                    <RtlFlip>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </RtlFlip>
                  </Link>
                </li>
              ))}
              {actionQueue.length === 0 ? (
                <p className="text-muted">{t('m01.queueEmpty')}</p>
              ) : null}
            </ul>
            <p className="mt-4 text-[11.5px] text-muted">{t('m01.privacyFooter')}</p>
          </Card>
        </>
      ) : null}

      {data && agg?.suppressed ? (
        <Card>
          <p className="text-muted">{t('m01.suppressed')}</p>
        </Card>
      ) : null}
    </AppShell>
  )
}
