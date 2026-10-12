import { ArrowRight, Check } from 'lucide-react'
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

import { useInterventionStub, useManagerMember } from '../../api/manager'
import { RtlFlip } from '../../components/RtlFlip'
import {
  ScoreDial,
  ScoreFormulaBlock,
  TwinBanner,
  type ScoreSignalRow,
} from '../../components/twin'
import {
  Avatar,
  Badge,
  Button,
  Card,
  type Tier,
} from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { managerNav } from '../../layout/navConfigs'
import { colors } from '../../theme/colors'

type TabId =
  | 'who'
  | 'score'
  | 'tier'
  | 'why'
  | 'strengths'
  | 'risks'
  | 'grow'
  | 'did'

const TABS: TabId[] = [
  'who',
  'score',
  'tier',
  'why',
  'strengths',
  'risks',
  'grow',
  'did',
]

function toTier(raw: string): Tier {
  const t = raw.toLowerCase()
  if (t === 'gold' || t === 'silver' || t === 'bronze' || t === 'growth') {
    return t
  }
  return 'growth'
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function M04bTeamMemberProfile() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = useManagerMember(id)
  const [tab, setTab] = useState<TabId>('who')
  const stub = useInterventionStub(data?.id)
  const [stubMsg, setStubMsg] = useState<string | null>(null)

  const current = data?.current
  const tier = toTier(current?.performance_tier ?? 'growth')
  const score = current?.performance_score ?? 0
  const risk = current?.burnout_risk_pct ?? 0
  const wellbeing = current?.wellbeing_score ?? 0
  const engagement = current?.engagement_score ?? 0
  const projectedRisk = Math.max(0, risk - 23)

  const formulaRows: ScoreSignalRow[] = useMemo(() => {
    if (!current) return []
    const traj = data?.trajectory ?? []
    const baselineEng =
      traj.length >= 6
        ? Math.round(traj[traj.length - 6]!.engagement_score)
        : Math.round(engagement + 14)
    const baselineWell =
      traj.length >= 6
        ? Math.round(traj[traj.length - 6]!.wellbeing_score)
        : Math.round(wellbeing + 42)

    return [
      {
        id: 'task',
        label: t('m04b.signalTask'),
        sublabel: t('m04b.signalTaskSub'),
        weight: '25%',
        score: Math.round(current.task_completion_rate),
        baseline: Math.max(0, Math.round(current.task_completion_rate) - 4),
        change: 4,
        tone: 'teal',
      },
      {
        id: 'attendance',
        label: t('m04b.signalAttendance'),
        weight: '15%',
        score: 98,
        baseline: 97,
        change: 1,
        tone: 'teal',
        todo: true, // TODO: attendance not in employee_current
      },
      {
        id: 'behaviour',
        label: t('m04b.signalBehaviour'),
        weight: '15%',
        score: 90,
        baseline: 86,
        change: 4,
        tone: 'teal',
        todo: true, // TODO: professional behaviour not in API
      },
      {
        id: 'innovation',
        label: t('m04b.signalInnovation'),
        weight: '10%',
        score: Math.round(current.innovation_score),
        baseline: Math.max(0, Math.round(current.innovation_score) - 2),
        change: 2,
        tone: 'teal',
      },
      {
        id: 'collab',
        label: t('m04b.signalCollab'),
        weight: '10%',
        score: Math.round(current.collaboration_score),
        baseline: Math.max(0, Math.round(current.collaboration_score) - 3),
        change: 3,
        tone: 'teal',
      },
      {
        id: 'tech',
        label: t('m04b.signalTech'),
        sublabel: t('m04b.signalTechSub'),
        weight: '10%',
        score: 92,
        baseline: 90,
        change: 2,
        tone: 'teal',
        todo: true, // TODO: technology adoption not in API
      },
      {
        id: 'engagement',
        label: t('m04b.signalEngagement'),
        weight: '5%',
        score: Math.round(engagement),
        baseline: baselineEng,
        change: Math.round(engagement) - baselineEng,
        tone: engagement < 75 ? 'amber' : 'teal',
      },
      {
        id: 'wellbeing',
        label: t('m04b.signalWellbeing'),
        sublabel: t('m04b.signalWellbeingSub'),
        weight: '0%',
        score: Math.round(wellbeing),
        baseline: baselineWell,
        change: Math.round(wellbeing) - baselineWell,
        tone: 'coral',
      },
    ]
  }, [current, data?.trajectory, engagement, wellbeing, t])

  const timeline = useMemo(() => {
    const traj = data?.trajectory ?? []
    return traj.map((w) => ({
      label: w.week_start.slice(5),
      performance: w.performance_score,
      engagement: w.engagement_score,
      wellbeing: w.wellbeing_score,
      burnout: w.burnout_risk_pct,
    }))
  }, [data?.trajectory])

  const pastSignals = useMemo(() => {
    if (!current) return []
    return [
      {
        label: t('m04b.performance'),
        value: Math.round(current.task_completion_rate),
        tone: 'teal' as const,
      },
      {
        label: t('m04b.signalAttendance'),
        value: 98,
        tone: 'teal' as const,
        todo: true,
      },
      {
        label: t('m04b.collaboration'),
        value: Math.round(current.collaboration_score),
        tone: 'teal' as const,
      },
      {
        label: t('m04b.signalBehaviour'),
        value: 90,
        tone: 'teal' as const,
        todo: true,
      },
      {
        label: t('m04b.signalLabel'),
        value: 87,
        tone: 'teal' as const,
        todo: true,
      },
      {
        label: t('m04b.engagement'),
        value: Math.round(engagement),
        tone: 'amber' as const,
      },
      {
        label: t('m04b.wellbeing'),
        value: Math.round(wellbeing),
        tone: 'coral' as const,
      },
    ]
  }, [current, engagement, wellbeing, t])

  const onTab = (id: TabId) => {
    setTab(id)
    scrollToId(`section-${id}`)
  }

  const startIntervention = () => {
    stub.mutate('start', {
      onSuccess: () => setStubMsg(t('m06.stubOk')),
    })
  }

  return (
    <AppShell
      config={managerNav}
      activePath="/manager/members"
      chrome={{
        breadcrumbPage: data?.full_name ?? t('shell.manager.items.members'),
      }}
    >
      {isLoading ? <p className="text-muted">{t('m04b.loading')}</p> : null}
      {isError ? (
        <p className="text-coral-dark">{t('m04b.notFound')}</p>
      ) : null}

      {data && current ? (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
                {t('m04b.title', { name: data.full_name })}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted">{t('m04b.subtitle')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary">{t('m04b.prepare11')}</Button>
              <Button
                variant="accent"
                className="!bg-coral-dark"
                onClick={startIntervention}
              >
                {t('m04b.startIntervention')}
              </Button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex flex-wrap gap-1 border-b border-border bg-white">
            {TABS.map((id, idx) => {
              const active = tab === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onTab(id)}
                  className={[
                    'inline-flex items-center gap-1.5 px-3 py-2.5 text-[13px]',
                    active
                      ? 'border-b-2 border-navy font-semibold text-navy'
                      : 'font-medium text-muted',
                  ].join(' ')}
                >
                  {t(`m04b.tab.${id}`)}
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-surface-3 font-mono text-[10px] font-semibold">
                    {idx + 1}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Who: profile + dial + alert context */}
          <section id="section-who" className="scroll-mt-4">
            <div className="grid gap-4 lg:grid-cols-[290px_290px_1fr]">
              <Card className="flex flex-col items-center text-center !rounded-2xl">
                <Avatar name={data.full_name} size="lg" />
                <p className="mt-3 text-lg font-bold text-ink">{data.full_name}</p>
                <p className="text-[13px] text-muted">
                  {data.job_title}
                  {data.team ? ` · ${data.team}` : ''}
                </p>
                {data.manager_name ? (
                  <p className="text-[12.5px] text-muted">
                    {t('m04b.reportsTo', { name: data.manager_name })}
                  </p>
                ) : null}
                <div className="my-3 h-px w-full bg-border" />
                <p className="font-mono text-[10px] tracking-wide text-muted">
                  {t('m04b.tenureYears', { n: data.tenure_years.toFixed(1) })}
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <Badge tone="teal" uppercase={false}>
                    {t('m04b.tagPerformanceStar')}
                  </Badge>
                  <Badge tone="slate" uppercase={false}>
                    {t('m04b.tagTeamSupporter')}
                  </Badge>
                </div>
                {risk >= 60 ? (
                  <div className="mt-3 w-full rounded-lg bg-coral-light px-3 py-2 text-[12px] font-semibold text-coral-dark">
                    {t('m04b.wellbeingAlertRisk', { pct: risk })}
                  </div>
                ) : null}
                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-1 text-xs text-teal-dark"
                  onClick={() => onTab('why')}
                >
                  {t('m04b.viewRootCauses')}
                  <RtlFlip>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </RtlFlip>
                </button>
              </Card>

              <ScoreDial
                score={score}
                tier={tier}
                empulseLabel={t('m04b.empulseTier')}
                alertBadge={
                  risk >= 60 ? t('m04b.wellbeingAlertBadge') : undefined
                }
                exceptionalLabel={t('m04b.exceptionalScore')}
                line1={t('m04b.dialLine1')}
                line2={t('m04b.dialLine2')}
                opportunity={t('m04b.biggestOpportunity', {
                  score: Math.round(wellbeing),
                })}
              />

              <div className="flex flex-col gap-4">
                <Card className="!rounded-3xl">
                  <p className="text-[13px] font-bold text-ink">
                    {t('m04b.howDoing', { name: data.first_name })}
                  </p>
                  <ul className="mt-3 space-y-2 text-xs text-ink">
                    <BulletDot color="bg-teal-dark">
                      {t('m04b.bullet1')}
                    </BulletDot>
                    <BulletDot color="bg-amber">
                      {t('m04b.bullet2')}
                    </BulletDot>
                    <BulletDot color="bg-coral">
                      {t('m04b.bullet3', { pct: risk })}
                    </BulletDot>
                    <BulletDot color="bg-coral">
                      {/* TODO: peak score history not in API */}
                      {t('m04b.bullet4')}
                    </BulletDot>
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="accent"
                      className="!bg-coral-dark !px-3 !py-1.5 !text-[12.5px]"
                      onClick={startIntervention}
                    >
                      {t('m04b.startIntervention')}
                    </Button>
                    <Button
                      variant="secondary"
                      className="!px-3 !py-1.5 !text-[12.5px]"
                      onClick={() => onTab('why')}
                    >
                      {t('m04b.viewRootCauses')}
                      <RtlFlip>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </RtlFlip>
                    </Button>
                  </div>
                </Card>

                <Card className="!rounded-3xl">
                  <div className="mb-2 flex flex-wrap gap-4 font-mono text-[10px] tracking-wide text-faint">
                    <span>{t('m04b.pastSignals')}</span>
                    <span>{t('m04b.nowCol')}</span>
                    <span className="ms-auto">{t('m04b.howCalculated')}</span>
                  </div>
                  <div className="space-y-1.5">
                    {pastSignals.map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center gap-3 text-xs"
                      >
                        <span className="w-28 shrink-0 text-ink">
                          {row.label}
                          {row.todo ? (
                            <span className="ms-1 font-mono text-[9px] text-faint">
                              {/* design placeholder — not in API */}
                              {t('common.notCollected')}
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={[
                            'ltr-nums w-8 font-mono',
                            row.tone === 'coral'
                              ? 'text-coral'
                              : row.tone === 'amber'
                                ? 'text-amber'
                                : 'text-ink',
                          ].join(' ')}
                        >
                          {row.value}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded bg-surface-2">
                          <div
                            className={[
                              'h-full rounded',
                              row.tone === 'coral'
                                ? 'bg-coral'
                                : row.tone === 'amber'
                                  ? 'bg-amber'
                                  : 'bg-teal-dark',
                            ].join(' ')}
                            style={{ width: `${Math.min(100, row.value)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </section>

          {/* Banner */}
          <TwinBanner
            tierLabel={tier.toUpperCase()}
            alertLabel={t('m04b.wellbeingAlertRisk', { pct: risk })}
            title={t('m04b.bannerTitle')}
            subtitle={t('m04b.bannerSub', {
              perf: Math.round(current.task_completion_rate),
            })}
            startLabel={t('m04b.startIntervention')}
            rootCausesLabel={t('m04b.viewRootCauses')}
            onStart={startIntervention}
            rootCausesHref="#section-why"
          />

          {/* Score / Why formula */}
          <section id="section-score" className="scroll-mt-4" />
          <section id="section-tier" className="scroll-mt-4" />
          <section id="section-why" className="scroll-mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionArrow label={t('m04b.whyTitle')} />
              <button
                type="button"
                className="text-[12.5px] font-semibold text-teal-dark"
              >
                {t('m04b.weightsGovernance')}
              </button>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <ScoreFormulaBlock
                caption={t('m04b.sevenSignals')}
                headers={{
                  signal: t('m04b.colSignal'),
                  weight: t('m04b.colWeight'),
                  score: t('m04b.colScore'),
                  baseline: t('m04b.colBaseline'),
                  change: t('m04b.colChange'),
                }}
                rows={formulaRows}
                footnote={t('m04b.wellbeingWeight')}
                totalLabel={t('m04b.empulseScore')}
                totalScore={score}
                tierBannerTitle={t('m04b.tierBanner', {
                  tier: tier.toUpperCase(),
                  score,
                })}
                tierBannerSub={t('m04b.tierBannerSub', {
                  team: data.team ?? data.department,
                })}
              />

              <Card className="!rounded-3xl">
                <p className="text-base font-semibold text-ink">
                  {t('m04b.pulseProfile')}
                </p>
                <p className="text-[13px] text-muted">{t('m04b.pulseRange')}</p>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                  <div className="flex gap-3 ltr-nums text-[28px] font-semibold text-ink">
                    {/* historical pulse averages not stored — design copy */}
                    <span title={t('common.notCollected')}>9.5</span>
                    <span title={t('common.notCollected')}>9.1</span>
                    <span title={t('common.notCollected')}>9.4</span>
                    <span title={t('common.notCollected')}>9.7</span>
                    <span title={t('common.notCollected')}>9.1</span>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] tracking-wide text-muted">
                      {t('m04b.empulseTierNow')}
                    </p>
                    <Badge tone="amber">
                      {tier.toUpperCase()} · {score}
                    </Badge>
                  </div>
                </div>
                <p className="mt-4 font-mono text-[10px] tracking-wide text-faint">
                  {t('m04b.weeklyPulse')}
                </p>
                <div className="mt-2 h-28 rounded-lg bg-surface p-2" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="engagement"
                        stroke={colors.tealDark}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="burnout"
                        stroke={colors.coral}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 rounded-lg bg-coral-light px-3 py-2 text-xs text-coral-dark">
                  {t('m04b.pulseFootnote', {
                    wellbeing: Math.round(wellbeing),
                    engagement: Math.round(engagement),
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-3 rounded-lg bg-surface px-3 py-2 font-mono text-[11px] text-muted">
                  <span>
                    {t('m04b.metaYears', { n: data.tenure_years.toFixed(1) })}
                  </span>
                  <span>
                    {t('m04b.metaJoined', {
                      year: data.hire_date.slice(0, 4),
                    })}
                  </span>
                  <span>
                    {t('m04b.metaTeam', {
                      team: (data.team ?? data.department).toUpperCase(),
                    })}
                  </span>
                  <span>{t('m04b.metaScore', { score })}</span>
                </div>
                <p className="mt-3 text-[12.5px] text-muted">
                  {t('m04b.energyTrend', { name: data.first_name })}
                </p>
                <p className="text-[12.5px] text-muted">
                  {t('m04b.wellbeingOutlier', { score: Math.round(wellbeing) })}
                </p>
                <p className="mt-2 text-[12.5px] text-muted">
                  {t('m04b.exhaustionNote')}
                </p>
              </Card>
            </div>
          </section>

          {/* Timeline */}
          <section className="space-y-2">
            <SectionArrow label={t('m04b.timelineTitle')} />
            <p className="text-[12.5px] text-muted">{t('m04b.timelineSub')}</p>
            <div className="flex flex-wrap gap-4 text-xs text-muted">
              <LegendDot color="bg-teal" label={t('m04b.legendThriving')} />
              <LegendDot color="bg-amber" label={t('m04b.legendStretched')} />
              <LegendDot color="bg-coral" label={t('m04b.legendBurnout')} />
            </div>
            <Card className="!rounded-3xl">
              <div className="h-64" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="performance"
                      name={t('m04b.performance')}
                      stroke={colors.tealDark}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="engagement"
                      name={t('m04b.engagement')}
                      stroke={colors.coral}
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="wellbeing"
                      name={t('m04b.wellbeing')}
                      stroke={colors.coral}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="burnout"
                      name={t('m04b.burnoutRisk')}
                      stroke={colors.coral}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 font-mono text-[10px] text-muted">
                {/* TODO: event labels not in weekly series */}
                <span>{t('m04b.eventSre')}</span>
                <span>{t('m04b.eventPages')}</span>
                <span>{t('m04b.eventOvertime')}</span>
                <span>{t('m04b.eventWarning')}</span>
                <span>{t('m04b.eventPlan')}</span>
              </div>
            </Card>
          </section>

          {/* Strengths + Risks */}
          <section
            id="section-strengths"
            className="grid scroll-mt-4 gap-4 lg:grid-cols-2"
          >
            <Card className="!rounded-3xl" id="section-risks-anchor">
              <p className="inline-flex items-center gap-1.5 text-[15px] font-bold text-ink">
                <RtlFlip>
                  <ArrowRight className="h-3.5 w-3.5 text-teal" />
                </RtlFlip>
                {t('m04b.strengths')}
              </p>
              <ul className="mt-3 space-y-2 text-[13px] text-ink">
                <LiDot color="bg-teal">
                  {t('m04b.strength1', {
                    n: Math.round(current.task_completion_rate),
                  })}
                </LiDot>
                <LiDot color="bg-teal">{t('m04b.strength2')}</LiDot>
                <LiDot color="bg-teal">{t('m04b.strength3')}</LiDot>
              </ul>
              <p className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-bold text-ink">
                <RtlFlip>
                  <ArrowRight className="h-3.5 w-3.5 text-teal" />
                </RtlFlip>
                {t('m04b.devAreas')}
              </p>
              <ul className="mt-2 space-y-2 text-[13px] text-ink">
                <LiDot color="bg-amber">{t('m04b.dev1')}</LiDot>
                <LiDot color="bg-amber">{t('m04b.dev2')}</LiDot>
              </ul>
              {data.skills.length > 0 ? (
                <div className="mt-4">
                  <p className="mb-2 text-[13px] font-semibold">{t('m04b.skills')}</p>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {data.skills.slice(0, 6).map((s) => (
                      <li
                        key={s.skill}
                        className="flex justify-between rounded-lg border border-border px-3 py-2 text-[13px]"
                      >
                        <span>{s.skill}</span>
                        <span className="ltr-nums font-mono text-muted">
                          L{s.level}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Card>

            <Card className="!rounded-3xl" id="section-risks">
              <p className="inline-flex items-center gap-1.5 text-[15px] font-bold text-ink">
                <RtlFlip>
                  <ArrowRight className="h-3.5 w-3.5 text-teal" />
                </RtlFlip>
                {t('m04b.risks')}
              </p>
              <p className="mt-1 font-mono text-[10px] tracking-wide text-faint">
                {t('m04b.risksShown')}
              </p>
              <div className="mt-3 space-y-3 text-[12.5px]">
                <RiskRow
                  level={t('m04b.riskHigh')}
                  tone="coral"
                  text={t('m04b.riskBurnout', {
                    pct: risk,
                    forecast: Math.min(100, risk + 9),
                  })}
                />
                <RiskRow
                  level={t('m04b.riskMedium')}
                  tone="amber"
                  text={t('m04b.riskEngagement', {
                    from: 85,
                    to: Math.round(engagement),
                  })}
                />
                <RiskRow
                  level={t('m04b.riskMedium')}
                  tone="amber"
                  text={t('m04b.riskRecognition')}
                  // TODO: last recognition date not in API
                  sub={t('m04b.riskRecognitionSub')}
                />
              </div>
            </Card>
          </section>

          {/* Grow */}
          <section id="section-grow" className="scroll-mt-4 space-y-3">
            <SectionArrow
              label={t('m04b.growTitle', { name: data.first_name })}
              tone="teal"
            />
            <Card className="!rounded-2xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex gap-8 font-mono text-[10px] tracking-wide text-faint">
                    <span>{t('m04b.growth')}</span>
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
                      {t('m04b.nowCol')}
                    </div>
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-muted">
                    <span>70</span>
                    <span>80</span>
                    <span>90</span>
                    <span className="inline-flex items-center gap-1 text-amber">
                      {score}
                      <RtlFlip>
                        <ArrowRight className="h-3 w-3 rotate-180" />
                      </RtlFlip>
                    </span>
                  </div>
                </div>
                <div className="text-[12px]">
                  <p className="font-mono text-[10px] tracking-wide text-faint">
                    {t('m04b.whatProtects')}
                  </p>
                  <p className="mt-1 inline-flex flex-wrap items-center gap-1 text-ink">
                    {t('m04b.protectEngagement')}{' '}
                    <span className="ltr-nums font-mono text-amber">
                      {Math.round(engagement)}
                    </span>
                    <RtlFlip>
                      <ArrowRight className="h-3 w-3 text-amber" />
                    </RtlFlip>
                    <span className="ltr-nums font-mono text-amber">
                      +18 ({t('m04b.projectedLabel')})
                    </span>
                  </p>
                  <p className="inline-flex flex-wrap items-center gap-1 text-ink">
                    {t('m04b.protectWellbeing')}{' '}
                    <span className="ltr-nums font-mono text-coral">
                      {Math.round(wellbeing)}
                    </span>
                    <RtlFlip>
                      <ArrowRight className="h-3 w-3 text-coral" />
                    </RtlFlip>
                    <span className="ltr-nums font-mono text-coral">
                      +52 ({t('m04b.projectedLabel')})
                    </span>
                  </p>
                </div>
              </div>
            </Card>
            <p className="font-mono text-[10px] tracking-wide text-muted">
              {t('m04b.recommendedActions')}
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <Playbook
                title={t('m04b.play1Title')}
                lines={[t('m04b.play1a'), t('m04b.play1b'), t('m04b.play1c')]}
                pts="-11"
                footer={t('m04b.play1Footer')}
                planLabel={t('m04b.plan')}
              />
              <Playbook
                title={t('m04b.play2Title')}
                lines={[t('m04b.play2a'), t('m04b.play2b')]}
                pts="-8"
                footer={t('m04b.play2Footer')}
                planLabel={t('m04b.plan')}
              />
              <Playbook
                title={t('m04b.play3Title')}
                lines={[t('m04b.play3a'), t('m04b.play3b')]}
                pts="-4"
                footer={t('m04b.play3Footer', {
                  manager: data.manager_name ?? '—',
                })}
                planLabel={t('m04b.plan')}
              />
            </div>
          </section>

          {/* Did it work? */}
          <section id="section-did" className="scroll-mt-4 space-y-3">
            <SectionArrow label={t('m04b.didTitle')} tone="teal" check />
            <p className="text-[12.5px] text-muted">
              {data.interventions.length === 0
                ? t('m04b.noInterventionsToday')
                : t('m04b.interventionsCount', {
                    n: data.interventions.length,
                  })}
            </p>
            <div className="grid gap-4 lg:grid-cols-[1fr_364px]">
              <Card className="!rounded-3xl">
                <div className="grid grid-cols-4 gap-2 border-b border-border pb-2 font-mono text-[10px] tracking-wide text-faint">
                  <span>{t('m04b.colIntervention')}</span>
                  <span>{t('m04b.colOutcome')}</span>
                  <span>{t('m04b.colBefore')}</span>
                  <span>{t('m04b.colAfter')}</span>
                </div>
                <MetricRow
                  label={t('m04b.burnoutRisk')}
                  outcome={t('m04b.projectedWaiting')}
                  before={`${risk}%`}
                  after={`${projectedRisk}%`}
                  afterTone="teal"
                  afterProjected
                  projectedLabel={t('m04b.projectedLabel')}
                />
                <MetricRow
                  label={t('m04b.engagement')}
                  outcome="toggle"
                  before={String(Math.round(engagement))}
                  after="78"
                  afterProjected
                  projectedLabel={t('m04b.projectedLabel')}
                  // TODO: projected engagement after playbook
                />
                <MetricRow
                  label={t('m04b.performance')}
                  outcome="toggle"
                  before={String(score)}
                  after={String(score)}
                  afterProjected
                  projectedLabel={t('m04b.projectedLabel')}
                />
                <MetricRow
                  label={t('m04b.empulseScore')}
                  outcome="toggle"
                  before={String(score)}
                  after={String(Math.min(100, score + 1))}
                  afterProjected
                  projectedLabel={t('m04b.projectedLabel')}
                  // TODO: projected EMPULSE score
                />
                <div className="mt-3 rounded-lg bg-surface-3 px-3 py-2 text-xs text-muted">
                  {t('m04b.didFootnote')}
                </div>
                {data.interventions.map((item) => (
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
                  {t('m04b.projectedWaiting')}
                </p>
                <p className="mt-2 text-[13px] font-semibold text-ink">
                  {t('m04b.wellbeingRise')}
                </p>
                <p className="text-[13px] font-semibold text-ink">
                  {t('m04b.wellbeingRiseFrom', {
                    from: Math.round(wellbeing),
                    to: Math.min(100, Math.round(wellbeing) + 28),
                  })}
                </p>
                <p className="mt-1 text-xs text-muted">{t('m04b.ifActions')}</p>
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
                  {t('m04b.burnoutIn4w')} · {t('m04b.projectedLabel')}
                </p>
                <p className="mt-3 text-xs text-muted">{t('m04b.similarPlaybook')}</p>
                <p className="text-xs text-muted">{t('m04b.confidenceLine')}</p>
                <Button
                  variant="accent"
                  className="mt-4 w-full !bg-coral-dark"
                  onClick={startIntervention}
                >
                  {t('m04b.startIntervention')}
                </Button>
                {stubMsg ? (
                  <p className="mt-2 text-xs text-teal-dark">{stubMsg}</p>
                ) : null}
              </Card>
            </div>
          </section>

          <p className="text-center">
            <Link to="/manager/burnout" className="text-[13px] text-teal-dark">
              {t('m04b.backToBurnout')}
            </Link>
          </p>
        </div>
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

function BulletDot({
  color,
  children,
}: {
  color: string
  children: string
}) {
  return (
    <li className="flex gap-2">
      <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${color}`} />
      <span>{children}</span>
    </li>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm ${color}`} />
      {label}
    </span>
  )
}

function LiDot({ color, children }: { color: string; children: string }) {
  return (
    <li className="flex gap-2">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${color}`} />
      <span>{children}</span>
    </li>
  )
}

function RiskRow({
  level,
  tone,
  text,
  sub,
}: {
  level: string
  tone: 'coral' | 'amber'
  text: string
  sub?: string
}) {
  return (
    <div>
      <div className="flex items-start gap-2">
        <span
          className={[
            'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold',
            tone === 'coral'
              ? 'bg-coral-light text-coral-dark'
              : 'bg-amber/15 text-amber-dark',
          ].join(' ')}
        >
          {level}
        </span>
        <p className="text-ink">{text}</p>
      </div>
      {sub ? <p className="mt-1 ps-12 text-muted">{sub}</p> : null}
    </div>
  )
}

function Playbook({
  title,
  lines,
  pts,
  footer,
  planLabel,
}: {
  title: string
  lines: string[]
  pts: string
  footer: string
  planLabel: string
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
        <Button variant="primary" className="!px-3 !py-1.5 !text-xs">
          {planLabel}
          <RtlFlip>
            <ArrowRight className="h-3.5 w-3.5" />
          </RtlFlip>
        </Button>
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
