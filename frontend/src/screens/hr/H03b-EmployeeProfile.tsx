import { ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useHrEmployeeProfile } from '../../api/hr'
import { RtlFlip } from '../../components/RtlFlip'
import {
  ScoreDial,
  ScoreFormulaBlock,
  TwinBanner,
  type ScoreSignalRow,
} from '../../components/twin'
import { Avatar, Badge, Card, type Tier } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { hrNav } from '../../layout/navConfigs'
import { colors } from '../../theme/colors'

type TabId = 'who' | 'score' | 'why' | 'risks' | 'grow'

function toTier(raw: string): Tier {
  const t = raw.toLowerCase()
  if (t === 'gold' || t === 'silver' || t === 'bronze' || t === 'growth') return t
  return 'growth'
}

export function H03bEmployeeProfile() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = useHrEmployeeProfile(id)
  const [tab, setTab] = useState<TabId>('who')
  const cur = data?.current
  const traj = data?.trajectory ?? []

  const formulaRows: ScoreSignalRow[] = useMemo(() => {
    if (!cur) return []
    const past = traj.length ? traj[0] : null
    const dims: Array<{
      id: string
      value: number | null
      weight: number
      status: string
    }> = [
      { id: 'task_completion', value: cur.task_completion_rate, weight: 0.25, status: 'scored' },
      { id: 'attendance', value: null, weight: 0.1, status: 'not_collected' },
      { id: 'professionalism', value: null, weight: 0.1, status: 'not_collected' },
      { id: 'innovation', value: cur.innovation_score, weight: 0.15, status: 'scored' },
      { id: 'collaboration', value: cur.collaboration_score, weight: 0.15, status: 'scored' },
      { id: 'digital', value: null, weight: 0.1, status: 'not_collected' },
      { id: 'engagement', value: cur.engagement_score, weight: 0.15, status: 'scored' },
      { id: 'wellbeing', value: cur.wellbeing_score, weight: 0, status: 'not_scored' },
    ]
    return dims.map((r) => {
      const score = r.value != null ? Math.round(r.value) : 0
      const baseline =
        r.id === 'engagement' && past
          ? Math.round(past.engagement_score)
          : score
      return {
        id: r.id,
        label: t(`e02.dim.${r.id}`),
        sublabel:
          r.status === 'not_collected'
            ? t('common.notCollected')
            : r.status === 'not_scored'
              ? t('e02.notScored')
              : undefined,
        weight: `${Math.round(r.weight * 100)}%`,
        score,
        baseline,
        change: score - baseline,
        todo: r.status === 'not_collected',
        tone:
          r.id === 'wellbeing' || r.status === 'not_collected'
            ? ('muted' as const)
            : ('teal' as const),
      }
    })
  }, [cur, traj, t])

  const tier = toTier(cur?.performance_tier ?? 'growth')
  const score = cur?.performance_score ?? 0
  const risk = cur?.burnout_risk_pct ?? 0

  return (
    <AppShell
      config={hrNav}
      activePath="/hr/employees"
      chrome={{
        breadcrumbPrimary: t('h03.breadcrumbOrg'),
        breadcrumbPage: data?.full_name ?? t('h03b.title'),
      }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {data
              ? t('h03b.heading', { name: data.full_name })
              : t('h03b.title')}
          </h1>
          <p className="mt-1 text-sm text-muted">{t('h03b.subtitle')}</p>
          <p className="mt-1 text-xs font-semibold text-amber-dark">
            {t('h03b.auditNote')}
          </p>
        </div>
        <Link
          to="/hr/employees"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-teal-dark"
        >
          <RtlFlip>
            <ArrowRight className="h-3.5 w-3.5 rotate-180" />
          </RtlFlip>
          {t('h03b.back')}
        </Link>
      </div>

      {isLoading ? <p className="text-muted">{t('h03b.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data && cur ? (
        <>
          <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_300px]">
            <Card className="!rounded-2xl">
              <div className="flex items-start gap-3">
                <Avatar name={data.full_name} size="lg" />
                <div>
                  <p className="text-lg font-semibold">{data.full_name}</p>
                  <p className="text-[13px] text-muted">
                    {data.job_title}
                    {data.team ? ` · ${data.team}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {t('h03b.reportsTo', { name: data.manager_name ?? '—' })}
                  </p>
                </div>
              </div>
              {risk >= 45 ? (
                <div className="mt-3">
                  <TwinBanner
                    tierLabel={tier.toUpperCase()}
                    alertLabel={t('h03b.wellbeingAlert', { pct: risk })}
                    title={t('h03b.bannerTitle')}
                    subtitle={t('h03b.bannerSub', {
                      perf: Math.round(cur.task_completion_rate),
                    })}
                    startLabel={t('h03b.viewRisks')}
                    rootCausesLabel={t('h03b.viewDrivers')}
                    rootCausesHref="#why"
                    onStart={() => setTab('risks')}
                  />
                </div>
              ) : null}
            </Card>
            <ScoreDial
              score={score}
              tier={tier}
              empulseLabel={t('e01.empulseTier')}
              exceptionalLabel={t('h03b.exceptional')}
              line1={t('h03b.dialLine1')}
              line2={t('h03b.dialLine2')}
              opportunity={t('h03b.opportunity', {
                score: Math.round(cur.innovation_score),
              })}
            />
          </div>

          <div className="mb-4 flex flex-wrap gap-1 border-b border-border">
            {(['who', 'score', 'why', 'risks', 'grow'] as TabId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={[
                  '-mb-px border-b-2 px-3 py-2 text-[13px] font-medium',
                  tab === id ? 'border-teal text-ink' : 'border-transparent text-muted',
                ].join(' ')}
              >
                {t(`h03b.tabs.${id}`)}
              </button>
            ))}
          </div>

          {tab === 'who' ? (
            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">
                {t('h03b.howDoing', { name: data.first_name })}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-teal-light p-3.5">
                  <p className="font-mono text-[10px] text-teal-dark">
                    {t('h03b.strongest')}
                  </p>
                  <p className="mt-1 text-[17px] font-semibold">
                    {t('e02.dim.task_completion')} (
                    {Math.round(cur.task_completion_rate)})
                  </p>
                </div>
                <div className="rounded-xl bg-violet-light p-3.5">
                  <p className="font-mono text-[10px] text-violet">
                    {t('h03b.biggestOpp')}
                  </p>
                  <p className="mt-1 text-[17px] font-semibold">
                    {t('e02.dim.innovation')} ({Math.round(cur.innovation_score)})
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3.5">
                  <p className="font-mono text-[10px] text-muted">{t('h03b.burnout')}</p>
                  <p className="mt-1 text-2xl font-semibold ltr-nums">
                    {cur.burnout_risk_pct}%
                  </p>
                  <Badge tone="slate" uppercase={false}>
                    {cur.burnout_level}
                  </Badge>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-faint">{t('h03b.wellbeingNote')}</p>
            </Card>
          ) : null}

          {tab === 'score' || tab === 'why' ? (
            <div id="why" className="grid gap-4 lg:grid-cols-2">
              <ScoreFormulaBlock
                caption={t('e03.sevenSignals')}
                headers={{
                  signal: t('e03.colSignal'),
                  weight: t('e03.colWeight'),
                  score: t('e03.colScore'),
                  baseline: t('e03.colBaseline'),
                  change: t('e03.colChange'),
                }}
                rows={formulaRows}
                footnote={t('e03.wellbeingZero')}
                totalLabel={t('e03.empulseScore')}
                totalScore={score}
                tierBannerTitle={t('e03.tierBanner', {
                  tier: tier.toUpperCase(),
                  score,
                })}
                tierBannerSub={t('h03b.tierSub')}
              />
              <Card className="!rounded-2xl">
                <h2 className="text-base font-semibold">{t('h03b.timeline')}</h2>
                <div className="mt-4 h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={traj}>
                      <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="week_start"
                        tick={{ fontSize: 9, fill: colors.muted }}
                        tickFormatter={(v: string) => v.slice(5)}
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} width={28} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="performance_score"
                        stroke={colors.tealDark}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="wellbeing_score"
                        stroke={colors.coral}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          ) : null}

          {tab === 'risks' ? (
            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('h03b.risksTitle')}</h2>
              <ul className="mt-4 space-y-2 text-[13px]">
                {(cur.drivers.increasing ?? []).slice(0, 5).map((d) => (
                  <li key={d.feature} className="rounded-lg bg-surface px-3 py-2">
                    {d.label}{' '}
                    <span className="font-mono text-coral-dark">
                      +{Math.round(d.impact_pts)} pts
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {tab === 'grow' ? (
            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('h03b.skills')}</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {(data.skills ?? []).map((s) => (
                  <li
                    key={s.skill}
                    className="flex justify-between rounded-lg border border-border px-3 py-2 text-[13px]"
                  >
                    <span>{s.skill}</span>
                    <span className="font-mono text-muted">L{s.level}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      ) : null}
    </AppShell>
  )
}
