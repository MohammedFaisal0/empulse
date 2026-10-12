import { ArrowRight, Check } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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

import { useMeTwin } from '../../api/me'
import { RtlFlip } from '../../components/RtlFlip'
import {
  ScoreDial,
  ScoreFormulaBlock,
  TwinBanner,
  type ScoreSignalRow,
} from '../../components/twin'
import { Avatar, Badge, Button, Card, type Tier } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { employeeNav } from '../../layout/navConfigs'
import { colors } from '../../theme/colors'

type TabId = 'who' | 'score' | 'why' | 'risks' | 'grow' | 'did'

function toTier(raw: string): Tier {
  const t = raw.toLowerCase()
  if (t === 'gold' || t === 'silver' || t === 'bronze' || t === 'growth') return t
  return 'growth'
}

export function E03MyDigitalTwin() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useMeTwin()
  const [tab, setTab] = useState<TabId>('who')
  const cur = data?.current
  const traj = data?.trajectory ?? []

  const formulaRows: ScoreSignalRow[] = useMemo(() => {
    if (!cur || !data?.formula_rows) return []
    const past =
      traj.length >= 6 ? traj[traj.length - 6] : traj.length ? traj[0] : null
    return data.formula_rows.map((r) => {
      const baseline =
        r.id === 'engagement' && past
          ? Math.round(past.engagement_score)
          : r.id === 'wellbeing' && past
            ? Math.round(past.wellbeing_score ?? 0)
            : r.value != null
              ? Math.round(r.value)
              : 0
      const score = r.value != null ? Math.round(r.value) : 0
      return {
        id: r.id,
        label: t(`e02.dim.${r.id}`),
        sublabel:
          r.label_status === 'not_collected'
            ? t('common.notCollected')
            : r.label_status === 'not_scored'
              ? t('e02.notScored')
              : undefined,
        weight: `${Math.round(r.weight * 100)}%`,
        score,
        baseline,
        change: score - baseline,
        todo: !r.measured,
        tone:
          r.id === 'wellbeing'
            ? ('muted' as const)
            : r.label_status === 'not_collected'
              ? ('muted' as const)
              : ('teal' as const),
      }
    })
  }, [cur, data?.formula_rows, traj, t])

  const tier = toTier(cur?.performance_tier ?? 'growth')
  const score = cur?.performance_score ?? 0
  const risk = cur?.burnout_risk_pct ?? 0
  const engagement = cur?.engagement_score ?? 0
  const wellbeing = cur?.wellbeing_score ?? 0
  const projectedRisk = Math.max(0, Math.round(risk - 12))
  const interventions = data?.interventions ?? []

  return (
    <AppShell
      config={employeeNav}
      activePath="/employee/twin"
      chrome={{
        breadcrumbPrimary: data
          ? `${data.full_name} · ${data.team ?? data.department}`
          : undefined,
        breadcrumbPage: t('e03.title'),
      }}
    >
      <div className="mb-5">
        <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
          {t('e03.title')}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t('e03.subtitle')}</p>
      </div>

      {isLoading ? <p className="text-muted">{t('e03.loading')}</p> : null}
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
                  <div className="mt-2 flex flex-wrap gap-2">
                    {data.recognition_types.map((type) => (
                      <Badge key={type} tone="violet" uppercase={false}>
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-3 rounded-[10px] bg-teal-light px-3 py-2 font-mono text-[10.5px] text-teal-dark">
                {t('e03.synced', { asOf: cur.as_of })}
              </p>
              {risk >= 45 ? (
                <div className="mt-3">
                  <TwinBanner
                    tierLabel={tier.toUpperCase()}
                    alertLabel={t('e03.wellbeingAlert', { pct: risk })}
                    title={t('e03.bannerTitle')}
                    subtitle={t('e03.bannerSub', {
                      perf: Math.round(cur.task_completion_rate),
                    })}
                    startLabel={t('e03.viewGrowth')}
                    rootCausesLabel={t('e03.viewDrivers')}
                    rootCausesHref="#why"
                    onStart={() => setTab('grow')}
                  />
                </div>
              ) : null}
            </Card>
            <ScoreDial
              score={score}
              tier={tier}
              empulseLabel={t('e01.empulseTier')}
              alertBadge={
                risk >= 60 ? t('e03.wellbeingAlert', { pct: risk }) : undefined
              }
              exceptionalLabel={t('e03.exceptional')}
              line1={t('e03.dialLine1')}
              line2={t('e03.dialLine2')}
              opportunity={t('e03.biggestOpportunity', {
                score: Math.round(cur.innovation_score),
              })}
            />
          </div>

          <div className="mb-4 flex flex-wrap gap-1 border-b border-border">
            {(['who', 'score', 'why', 'risks', 'grow', 'did'] as TabId[]).map(
              (id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={[
                    '-mb-px border-b-2 px-3 py-2 text-[13px] font-medium',
                    tab === id
                      ? 'border-teal text-ink'
                      : 'border-transparent text-muted',
                  ].join(' ')}
                >
                  {t(`e03.tabs.${id}`)}
                </button>
              ),
            )}
          </div>

          {tab === 'who' ? (
            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('e03.howAmI')}</h2>
              <p className="mt-1 text-[13px] text-muted">{t('e03.howAmISub')}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-teal-light p-3.5">
                  <p className="font-mono text-[10px] text-teal-dark">
                    {t('e03.strongest')}
                  </p>
                  <p className="mt-1 text-[17px] font-semibold">
                    {t('e02.dim.task_completion')} (
                    {Math.round(cur.task_completion_rate)})
                  </p>
                </div>
                <div className="rounded-xl bg-violet-light p-3.5">
                  <p className="font-mono text-[10px] text-violet">
                    {t('e03.opportunity')}
                  </p>
                  <p className="mt-1 text-[17px] font-semibold">
                    {t('e02.dim.innovation')} ({Math.round(cur.innovation_score)})
                  </p>
                </div>
                <div className="rounded-xl bg-navy p-3.5 text-white">
                  <p className="text-[30px] font-semibold ltr-nums">
                    {cur.points_to_next_tier}
                  </p>
                  <p className="text-xs text-white/70">{t('e03.pointsToGold')}</p>
                </div>
              </div>
              <div className="mt-4 rounded-[10px] bg-teal-light px-3 py-2.5 text-[12.5px] text-teal-dark">
                {t('e03.riskLine', {
                  burnout: cur.burnout_risk_pct,
                  wellbeing: cur.wellbeing_score,
                })}
              </div>
              <p className="mt-2 text-[11px] text-faint">{t('e03.wellbeingNote')}</p>
              <Link
                to="/employee/performance"
                className="mt-3 inline-block text-[13px] font-semibold text-teal-dark"
              >
                {t('e01.openPlanner')}
              </Link>
            </Card>
          ) : null}

          {tab === 'score' || tab === 'why' ? (
            <div id="why" className="grid gap-4 lg:grid-cols-[1fr_1fr]">
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
                tierBannerSub={t('e03.tierBannerSub')}
              />
              <Card className="!rounded-2xl">
                <h2 className="text-base font-semibold">{t('e03.timeline')}</h2>
                <p className="mt-1 text-[13px] text-muted">{t('e03.timelineSub')}</p>
                <div className="mt-4 h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={traj}>
                      <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="week_start"
                        tick={{ fontSize: 9, fill: colors.muted }}
                        tickFormatter={(v: string) => v.slice(5)}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 9, fill: colors.faint }}
                        width={28}
                      />
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
                      <Line
                        type="monotone"
                        dataKey="burnout_risk_pct"
                        stroke={colors.amber}
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
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
              <h2 className="text-base font-semibold">{t('e03.risksTitle')}</h2>
              <p className="mt-1 text-[13px] text-muted">{t('e03.risksSub')}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border p-3">
                  <p className="font-mono text-[10px] text-muted">{t('e03.burnout')}</p>
                  <p className="mt-1 text-2xl font-semibold ltr-nums">
                    {cur.burnout_risk_pct}%
                  </p>
                  <p className="text-xs text-muted">{cur.burnout_level}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="font-mono text-[10px] text-muted">
                    {t('e02.dim.wellbeing')}
                  </p>
                  <p className="mt-1 text-2xl font-semibold ltr-nums">
                    {cur.wellbeing_score}
                  </p>
                  <p className="text-[11px] text-faint">{t('e03.privateWell')}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="font-mono text-[10px] text-muted">{t('e03.attrition')}</p>
                  <p className="mt-1 text-2xl font-semibold ltr-nums">
                    {cur.attrition_risk_pct}%
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-[13px]">
                {(cur.drivers.increasing ?? []).slice(0, 4).map((d) => (
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
            <div className="space-y-3">
              <SectionArrow label={t('e03.growTitle')} tone="teal" />
              <Card className="!rounded-2xl">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex gap-8 font-mono text-[10px] tracking-wide text-faint">
                      <span>{t('e03.growth')}</span>
                      <span>{t('tiers.bronze')}</span>
                      <span>{t('tiers.silver')}</span>
                      <span>{t('tiers.gold')}</span>
                    </div>
                    <div className="relative h-3 overflow-hidden rounded-md bg-surface-2">
                      <div className="absolute inset-y-0 start-0 w-1/3 bg-tier-bronze" />
                      <div className="absolute inset-y-0 start-1/3 w-1/3 bg-tier-silver" />
                      <div className="absolute inset-y-0 start-2/3 w-[26%] bg-tier-gold" />
                      <div
                        className="absolute top-1/2 z-10 -translate-y-1/2 rounded bg-navy px-1 py-0.5 text-[9px] font-bold text-white"
                        style={{ insetInlineStart: `${Math.min(96, score)}%` }}
                      >
                        {t('e03.nowCol')}
                      </div>
                    </div>
                  </div>
                  <div className="text-[12px]">
                    <p className="font-mono text-[10px] tracking-wide text-faint">
                      {t('e03.whatProtects')}
                    </p>
                    <p className="mt-1 inline-flex flex-wrap items-center gap-1 text-ink">
                      {t('e03.protectEngagement')}{' '}
                      <span className="ltr-nums font-mono text-amber">
                        {Math.round(engagement)}
                      </span>
                      <RtlFlip>
                        <ArrowRight className="h-3 w-3 text-amber" />
                      </RtlFlip>
                      <span className="ltr-nums font-mono text-amber">
                        +18 ({t('common.projected')})
                      </span>
                    </p>
                    <p className="inline-flex flex-wrap items-center gap-1 text-ink">
                      {t('e03.protectWellbeing')}{' '}
                      <span className="ltr-nums font-mono text-coral">
                        {Math.round(wellbeing)}
                      </span>
                      <RtlFlip>
                        <ArrowRight className="h-3 w-3 text-coral" />
                      </RtlFlip>
                      <span className="ltr-nums font-mono text-coral">
                        +12 ({t('common.projected')})
                      </span>
                    </p>
                  </div>
                </div>
              </Card>
              <p className="font-mono text-[10px] tracking-wide text-muted">
                {t('e03.recommendedActions')}
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <Playbook
                  title={t('e03.play1Title')}
                  lines={[t('e03.play1a'), t('e03.play1b'), t('e03.play1c')]}
                  pts="-8"
                  footer={t('e03.play1Footer')}
                  planLabel={t('e03.plan')}
                  href="/employee/performance"
                />
                <Playbook
                  title={t('e03.play2Title')}
                  lines={[t('e03.play2a'), t('e03.play2b')]}
                  pts="-6"
                  footer={t('e03.play2Footer')}
                  planLabel={t('e03.plan')}
                  href="/employee/growth"
                />
                <Playbook
                  title={t('e03.play3Title')}
                  lines={[t('e03.play3a'), t('e03.play3b')]}
                  pts="-4"
                  footer={t('e03.play3Footer')}
                  planLabel={t('e03.plan')}
                  href="/employee/innovation-lab"
                />
              </div>
            </div>
          ) : null}

          {tab === 'did' ? (
            <div className="space-y-3">
              <SectionArrow label={t('e03.didTitle')} tone="teal" check />
              <p className="text-[12.5px] text-muted">
                {interventions.length === 0
                  ? t('e03.noInterventions')
                  : t('e03.interventionsCount', { n: interventions.length })}
              </p>
              <div className="grid gap-4 lg:grid-cols-[1fr_364px]">
                <Card className="!rounded-3xl">
                  <div className="grid grid-cols-4 gap-2 border-b border-border pb-2 font-mono text-[10px] tracking-wide text-faint">
                    <span>{t('e03.colIntervention')}</span>
                    <span>{t('e03.colOutcome')}</span>
                    <span>{t('e03.colBefore')}</span>
                    <span>{t('e03.colAfter')}</span>
                  </div>
                  <MetricRow
                    label={t('e03.burnout')}
                    outcome={t('e03.projectedWaiting')}
                    before={`${risk}%`}
                    after={`${projectedRisk}%`}
                    afterTone="teal"
                    afterProjected
                    projectedLabel={t('common.projected')}
                  />
                  <MetricRow
                    label={t('e02.dim.engagement')}
                    outcome="toggle"
                    before={String(Math.round(engagement))}
                    after={String(Math.min(100, Math.round(engagement) + 8))}
                    afterProjected
                    projectedLabel={t('common.projected')}
                  />
                  <MetricRow
                    label={t('e03.empulseScore')}
                    outcome="toggle"
                    before={String(score)}
                    after={String(Math.min(100, score + 1))}
                    afterProjected
                    projectedLabel={t('common.projected')}
                  />
                  <div className="mt-3 rounded-lg bg-surface-3 px-3 py-2 text-xs text-muted">
                    {t('e03.didFootnote')}
                  </div>
                  {interventions.map((item) => (
                    <div
                      key={item.id}
                      className="mt-2 rounded-lg border border-border px-3 py-2 text-[13px]"
                    >
                      <div className="flex justify-between gap-2">
                        <p className="font-semibold">{item.type}</p>
                        <Badge tone="slate" uppercase={false}>
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-muted">{item.rationale}</p>
                    </div>
                  ))}
                </Card>

                <Card className="!rounded-3xl border-t-2 border-t-teal">
                  <p className="text-[13px] font-semibold text-teal-dark">
                    {t('e03.projectedWaiting')}
                  </p>
                  <p className="mt-2 text-[13px] font-semibold text-ink">
                    {t('e03.wellbeingRise')}
                  </p>
                  <p className="text-[13px] font-semibold text-ink">
                    {t('e03.wellbeingRiseFrom', {
                      from: Math.round(wellbeing),
                      to: Math.min(100, Math.round(wellbeing) + 12),
                    })}
                  </p>
                  <p className="mt-1 text-xs text-muted">{t('e03.ifActions')}</p>
                  <div className="mt-3 flex items-center gap-3 rounded-[10px] bg-teal-light px-3 py-3">
                    <span className="ltr-nums text-[28px] font-bold text-coral-dark">
                      {risk}%
                    </span>
                    <RtlFlip>
                      <ArrowRight className="h-6 w-6 text-ink" />
                    </RtlFlip>
                    <span className="ltr-nums text-[28px] font-bold text-teal-dark">
                      {projectedRisk}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {t('e03.burnoutIn4w')} · {t('common.projected')}
                  </p>
                  <Link to="/employee/growth">
                    <Button variant="accent" className="mt-4 w-full !bg-coral-dark">
                      {t('e03.openGrowth')}
                    </Button>
                  </Link>
                </Card>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </AppShell>
  )
}

function SectionArrow({
  label,
  tone = 'navy',
  check,
}: {
  label: string
  tone?: 'navy' | 'teal'
  check?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={[
          'inline-flex h-5 w-5 items-center justify-center rounded-[5px] text-white',
          tone === 'teal' ? 'bg-teal-dark' : 'bg-navy',
        ].join(' ')}
      >
        {check ? (
          <Check className="h-3 w-3" />
        ) : (
          <RtlFlip>
            <ArrowRight className="h-3 w-3" />
          </RtlFlip>
        )}
      </span>
      <span className="text-[13px] font-semibold text-ink">{label}</span>
    </div>
  )
}

function Playbook({
  title,
  lines,
  pts,
  footer,
  planLabel,
  href,
}: {
  title: string
  lines: string[]
  pts: string
  footer: string
  planLabel: string
  href: string
}) {
  return (
    <Card className="!rounded-2xl">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        <span className="ltr-nums shrink-0 font-mono text-xs text-teal-dark">
          {pts} pts
        </span>
      </div>
      {lines.map((line) => (
        <p key={line} className="mt-1 text-xs text-muted">
          {line}
        </p>
      ))}
      <div className="mt-3 flex items-center gap-2">
        <Link to={href}>
          <Button variant="primary" className="!px-3 !py-1.5 !text-xs">
            {planLabel}
            <RtlFlip>
              <ArrowRight className="h-3.5 w-3.5" />
            </RtlFlip>
          </Button>
        </Link>
        <span className="text-[11.5px] text-muted">{footer}</span>
      </div>
    </Card>
  )
}

function MetricRow({
  label,
  outcome,
  before,
  after,
  afterTone,
  afterProjected,
  projectedLabel,
}: {
  label: string
  outcome: string
  before: string
  after: string
  afterTone?: 'teal'
  afterProjected?: boolean
  projectedLabel?: string
}) {
  return (
    <div className="grid grid-cols-4 items-center gap-2 border-b border-surface-2 py-2.5 text-[13px]">
      <span className="text-ink">{label}</span>
      <span>
        {outcome === 'toggle' ? (
          <span className="inline-flex h-5 w-14 items-center rounded-full bg-teal px-0.5">
            <span className="ms-auto h-3.5 w-3.5 rounded-full bg-white" />
          </span>
        ) : (
          <span className="rounded-md bg-surface-3 px-2 py-1 text-[11px] text-muted">
            {outcome}
          </span>
        )}
      </span>
      <span className="ltr-nums font-mono">{before}</span>
      <span
        className={[
          'ltr-nums font-mono',
          afterTone === 'teal' ? 'text-teal-dark' : 'text-ink',
        ].join(' ')}
      >
        {after}
        {afterProjected && projectedLabel ? (
          <span className="ms-1 text-[10px] text-faint">({projectedLabel})</span>
        ) : null}
      </span>
    </div>
  )
}
