import { ArrowRight, RotateCcw, Sparkles, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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

import {
  useSimulate,
  useSimulateCompare,
  useSimulateMeta,
  type SimulateControls,
  type SimulateResult,
} from '../../api/hr'
import { ApiRequestError } from '../../api/client'
import { RtlFlip } from '../../components/RtlFlip'
import { Button, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { hrNav, managerNav } from '../../layout/navConfigs'
import { colors } from '../../theme/colors'
import { useAuth } from '../../auth/AuthContext'

type ScopeKind = 'organization' | 'department' | 'team'

function fmtSar(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `SAR ${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `SAR ${Math.round(n / 1_000)}K`
  return `SAR ${Math.round(n)}`
}

const DEFAULT_CONTROLS: SimulateControls = {
  workload_pct: 0,
  task_streams: 0,
  recognition_pct: 0,
  training_hours_month: 0,
  shared_on_call: false,
}

export function H13WhatIfSimulator() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isManager = user?.role === 'manager'
  const [params] = useSearchParams()
  const meta = useSimulateMeta()
  const simulate = useSimulate()
  const compare = useSimulateCompare()

  const [scope, setScope] = useState<ScopeKind>(
    (params.get('scope') as ScopeKind) || 'organization',
  )
  const [deptId, setDeptId] = useState<number | undefined>(
    params.get('department_id')
      ? Number(params.get('department_id'))
      : undefined,
  )
  const [teamId, setTeamId] = useState<number | undefined>(
    params.get('team_id') ? Number(params.get('team_id')) : undefined,
  )
  const [controls, setControls] = useState<SimulateControls>({
    ...DEFAULT_CONTROLS,
  })
  const [result, setResult] = useState<SimulateResult | null>(null)
  const [compareRows, setCompareRows] = useState<SimulateResult[] | null>(null)
  const [showAssumptions, setShowAssumptions] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    if (params.get('scope') === 'team') {
      setScope('team')
      if (params.get('team_id')) setTeamId(Number(params.get('team_id')))
    }
    if (params.get('scope') === 'department') {
      setScope('department')
      if (params.get('department_id'))
        setDeptId(Number(params.get('department_id')))
    }
    if (params.get('scope') === 'organization') setScope('organization')
  }, [params])

  // Manager with grant: auto-pick first managed team when deep-linked without id.
  useEffect(() => {
    if (!isManager || !meta.data?.allowed) return
    if (scope === 'team' && !teamId && (meta.data.teams?.length ?? 0) > 0) {
      setTeamId(meta.data.teams[0].id)
    }
  }, [isManager, meta.data, scope, teamId])

  const teamsForDept = useMemo(() => {
    const all = meta.data?.teams ?? []
    if (!deptId || isManager) return all
    return all.filter((tm) => tm.department_id === deptId)
  }, [meta.data, deptId, isManager])

  const scopePath = useMemo(() => {
    if (scope === 'organization') return t('h13.scopes.organization')
    const dept =
      (meta.data?.departments ?? []).find((d) => d.id === deptId)?.name ??
      teamsForDept.find((tm) => tm.id === teamId)?.department ??
      '—'
    if (scope === 'department') return dept
    const team = teamsForDept.find((tm) => tm.id === teamId)?.name ?? '—'
    return `${dept} › ${team}`
  }, [scope, deptId, teamId, meta.data, teamsForDept, t])

  async function run() {
    setFlash(null)
    setCompareRows(null)
    try {
      const res = await simulate.mutateAsync({
        scope,
        scope_id:
          scope === 'organization'
            ? null
            : scope === 'department'
              ? deptId
              : teamId,
        controls,
      })
      setResult(res)
    } catch (e: unknown) {
      if (e instanceof ApiRequestError) {
        if (e.code === 'privacy.group_too_small') setFlash(t('h13.groupTooSmall'))
        else if (e.code === 'auth.permission_denied') setFlash(t('h13.denied'))
        else if (e.code === 'error.validation') setFlash(t('h13.pickScope'))
        else setFlash(t('common.error'))
      } else {
        setFlash(t('common.error'))
      }
      setResult(null)
    }
  }

  async function runCompare() {
    setFlash(null)
    try {
      const res = await compare.mutateAsync({
        scope,
        scope_id:
          scope === 'organization'
            ? null
            : scope === 'department'
              ? deptId
              : teamId,
        scenarios: [
          {
            label: t('h13.scenarioCurrent'),
            controls: { ...DEFAULT_CONTROLS },
          },
          { label: t('h13.scenarioThis'), controls },
          {
            label: t('h13.scenarioStronger'),
            controls: {
              ...controls,
              workload_pct: Math.max(-20, (controls.workload_pct ?? 0) - 10),
              task_streams: Math.min(4, (controls.task_streams ?? 0) + 1),
            },
          },
        ],
      })
      setCompareRows(res.scenarios)
      setResult(res.scenarios[1] ?? res.scenarios[0] ?? null)
    } catch (e: unknown) {
      if (e instanceof ApiRequestError && e.code === 'privacy.group_too_small') {
        setFlash(t('h13.groupTooSmall'))
      } else {
        setFlash(t('common.error'))
      }
    }
  }

  function applyPreset(kind: string) {
    if (kind === 'workload')
      setControls({ ...DEFAULT_CONTROLS, workload_pct: -10 })
    if (kind === 'streams')
      setControls({ ...DEFAULT_CONTROLS, task_streams: 2 })
    if (kind === 'recog')
      setControls({ ...DEFAULT_CONTROLS, recognition_pct: 50 })
    if (kind === 'train')
      setControls({ ...DEFAULT_CONTROLS, training_hours_month: 4 })
    if (kind === 'oncall')
      setControls({
        ...DEFAULT_CONTROLS,
        shared_on_call: true,
        task_streams: 1,
      })
  }

  const chartData = useMemo(() => {
    if (!result) return []
    const b0 = result.burnout_risk_avg_pct[0]
    const b1 = result.burnout_risk_avg_pct[1]
    // Illustrative 8-week path — projected, not a second model.
    return [0, 2, 4, 6, 8].map((wk) => {
      const frac = wk / 8
      return {
        label: wk === 0 ? t('h13.now') : t('h13.wk', { n: wk }),
        baseline: Math.round((b0 + b0 * 0.1 * frac) * 10) / 10,
        scenario: Math.round((b0 + (b1 - b0) * frac) * 10) / 10,
      }
    })
  }, [result, t])

  const retentionDelta = result
    ? result.high_risk_count[1] - result.high_risk_count[0]
    : 0

  const nav = isManager ? managerNav : hrNav

  if (meta.isLoading) {
    return (
      <AppShell
        config={nav}
        activePath="/hr/simulator"
        chrome={{ breadcrumbPage: t('h13.title') }}
      >
        <p className="text-muted">{t('h13.loading')}</p>
      </AppShell>
    )
  }

  if (meta.data?.ask_hr) {
    return (
      <AppShell
        config={nav}
        activePath={isManager ? '/manager/matrix' : '/hr/simulator'}
        chrome={{ breadcrumbPage: t('h13.title') }}
      >
        <Card className="!rounded-[14px] max-w-xl">
          <h1 className="text-[22px] font-semibold">{t('h13.title')}</h1>
          <p className="mt-2 text-[14px] text-muted">{t('h13.askHr')}</p>
          <p className="mt-3 text-[12px] text-faint">{t('h13.managerTip')}</p>
        </Card>
      </AppShell>
    )
  }

  return (
    <AppShell
      config={nav}
      activePath="/hr/simulator"
      chrome={{
        breadcrumbPrimary: t('h13.breadcrumbOrg'),
        breadcrumbPage: t('h13.title'),
      }}
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('h13.title')}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted">{t('h13.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[11px] border border-border bg-white px-3.5 py-2 text-[14px] font-semibold"
            onClick={() => setShowAssumptions((v) => !v)}
          >
            <Sparkles className="h-4 w-4 text-navy" />
            {t('h13.explainAssumptions')}
          </button>
          <button
            type="button"
            className="rounded-[11px] border border-border bg-white px-3.5 py-2 text-[14px] font-semibold"
            onClick={() => void runCompare()}
            disabled={compare.isPending}
          >
            {t('h13.compare')}
          </button>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[13px]">
        <span className="rounded-md px-2 py-1 font-mono text-[11px] uppercase text-muted">
          {t('h13.scope')}
        </span>
        {(['organization', 'department', 'team'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={[
              'rounded-md px-2.5 py-1 text-[13px] font-medium',
              scope === s
                ? 'bg-white font-semibold text-navy shadow-sm'
                : 'text-muted',
            ].join(' ')}
          >
            {t(`h13.scopes.${s}`)}
          </button>
        ))}
        <span className="rounded-md bg-white px-2.5 py-1 text-[13px] text-muted">
          {t('h13.employeeMovement')} · {t('common.notCollected')}
        </span>
        <span className="ms-2 text-[12px] text-muted">
          {scopePath} · {t('h13.managerTip')}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px]">
        {scope !== 'organization' && !isManager ? (
          <select
            className="rounded-lg border border-border bg-white px-2 py-1.5"
            value={deptId ?? ''}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : undefined
              setDeptId(v)
              setTeamId(undefined)
            }}
          >
            <option value="">{t('h13.pickDept')}</option>
            {(meta.data?.departments ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        ) : null}
        {scope === 'team' ? (
          <select
            className="rounded-lg border border-border bg-white px-2 py-1.5"
            value={teamId ?? ''}
            onChange={(e) =>
              setTeamId(e.target.value ? Number(e.target.value) : undefined)
            }
          >
            <option value="">{t('h13.pickTeam')}</option>
            {teamsForDept.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['workload', 'h13.presetWorkload'],
            ['streams', 'h13.presetStreams'],
            ['recog', 'h13.presetRecog'],
            ['train', 'h13.presetTrain'],
            ['oncall', 'h13.presetOncall'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => applyPreset(k)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-2.5 py-1.5 text-[12px] font-medium"
          >
            <Sparkles className="h-3 w-3 text-teal" />
            {t(label)}
          </button>
        ))}
      </div>

      {flash ? <p className="mb-3 text-[13px] text-coral">{flash}</p> : null}

      <div className="grid gap-5 lg:grid-cols-[256px_1fr]">
        <Card className="!rounded-[14px] !p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-wide text-muted">
              {t('h13.levers')}
            </h2>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-teal-dark"
              onClick={() => setControls({ ...DEFAULT_CONTROLS })}
            >
              <RotateCcw className="h-3 w-3" />
              {t('h13.reset')}
            </button>
          </div>

          <div className="mb-3 rounded-xl border border-border/70 bg-surface-2/40 px-3.5 py-3.5">
            <div className="mb-2 flex items-center justify-between text-[13px]">
              <span className="font-medium">{t('h13.workload')}</span>
              <span className="rounded bg-teal-light/50 px-1.5 py-0.5 font-mono text-[11px] text-teal-dark ltr-nums">
                {(controls.workload_pct ?? 0) > 0 ? '+' : ''}
                {controls.workload_pct ?? 0}%
              </span>
            </div>
            <input
              type="range"
              min={-20}
              max={10}
              step={5}
              value={controls.workload_pct ?? 0}
              onChange={(e) =>
                setControls((c) => ({
                  ...c,
                  workload_pct: Number(e.target.value),
                }))
              }
              className="w-full accent-teal"
            />
            <span className="mt-1 flex justify-between text-[10px] text-faint">
              <span>−20%</span>
              <span>0</span>
              <span>+10%</span>
            </span>
          </div>

          <div className="mb-3 rounded-xl border border-border/70 bg-surface-2/40 px-3.5 py-3.5">
            <div className="mb-2 flex items-center justify-between text-[13px]">
              <span className="font-medium">{t('h13.streams')}</span>
              <span className="rounded bg-teal-light/50 px-1.5 py-0.5 font-mono text-[11px] text-teal-dark ltr-nums">
                {t('h13.streamsN', { n: controls.task_streams ?? 0 })}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={4}
              step={1}
              value={controls.task_streams ?? 0}
              onChange={(e) =>
                setControls((c) => ({
                  ...c,
                  task_streams: Number(e.target.value),
                }))
              }
              className="w-full accent-teal"
            />
            <span className="mt-1 flex justify-between text-[10px] text-faint">
              <span>{t('h13.keepAll')}</span>
              <span>{t('h13.move4')}</span>
            </span>
          </div>

          <div className="mb-3 rounded-xl border border-border/70 bg-surface-2/40 px-3.5 py-3.5">
            <div className="mb-2 flex items-center justify-between text-[13px]">
              <span className="font-medium">{t('h13.recognition')}</span>
              <span className="rounded bg-teal-light/50 px-1.5 py-0.5 font-mono text-[11px] text-teal-dark ltr-nums">
                +{controls.recognition_pct ?? 0}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={50}
              value={controls.recognition_pct ?? 0}
              onChange={(e) =>
                setControls((c) => ({
                  ...c,
                  recognition_pct: Number(e.target.value),
                }))
              }
              className="w-full accent-teal"
            />
            <span className="mt-1 flex justify-between text-[10px] text-faint">
              <span>{t('h13.asToday')}</span>
              <span>+100%</span>
            </span>
          </div>

          <div className="mb-3 rounded-xl border border-border/70 bg-surface-2/40 px-3.5 py-3.5">
            <div className="mb-2 flex items-center justify-between text-[13px]">
              <span className="font-medium">{t('h13.training')}</span>
              <span className="rounded bg-teal-light/50 px-1.5 py-0.5 font-mono text-[11px] text-teal-dark ltr-nums">
                {t('h13.hoursMonth', { n: controls.training_hours_month ?? 0 })}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={8}
              step={4}
              value={controls.training_hours_month ?? 0}
              onChange={(e) =>
                setControls((c) => ({
                  ...c,
                  training_hours_month: Number(e.target.value),
                }))
              }
              className="w-full accent-teal"
            />
            <span className="mt-1 flex justify-between text-[10px] text-faint">
              <span>0 h</span>
              <span>8 h / month</span>
            </span>
          </div>

          <div className="mb-4 rounded-xl border border-border/70 bg-surface-2/40 px-3.5 py-3.5">
            <p className="mb-2 text-[13px] font-medium">{t('h13.structure')}</p>
            <div className="flex gap-2">
              <button
                type="button"
                className={[
                  'flex-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold',
                  !controls.shared_on_call
                    ? 'bg-white text-ink shadow-sm'
                    : 'text-muted',
                ].join(' ')}
                onClick={() =>
                  setControls((c) => ({ ...c, shared_on_call: false }))
                }
              >
                {t('h13.currentStructure')}
              </button>
              <button
                type="button"
                className={[
                  'flex-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold',
                  controls.shared_on_call
                    ? 'bg-white text-ink shadow-sm'
                    : 'text-muted',
                ].join(' ')}
                onClick={() =>
                  setControls((c) => ({ ...c, shared_on_call: true }))
                }
              >
                {t('h13.sharedOnCall')}
              </button>
            </div>
          </div>

          <Button
            className="w-full !rounded-[11px]"
            onClick={() => void run()}
            disabled={simulate.isPending}
          >
            <Sparkles className="me-2 h-4 w-4" />
            {simulate.isPending ? t('h13.running') : t('h13.run')}
          </Button>
        </Card>

        <div className="space-y-3.5">
          {result ? (
            <>
              <Card className="!rounded-[14px] !p-5">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[16px] font-semibold">
                      {result.scope.label ?? t('h13.scopes.organization')}
                      <span className="text-muted">
                        {' '}
                        · {t('h13.peopleN', { n: result.people })}
                      </span>
                    </h2>
                    <p className="mt-0.5 text-[12px] text-muted">
                      {t('h13.scopeSimulating', { path: scopePath })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="rounded-md bg-surface-2 px-2 py-1 text-muted">
                      {t('h13.currentState')}
                    </span>
                    <RtlFlip>
                      <span className="text-muted">→</span>
                    </RtlFlip>
                    <span className="rounded-md bg-navy/10 px-2 py-1 font-semibold text-navy">
                      {t('h13.simulatedState')}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-border/60">
                  {(
                    [
                      [
                        'performance',
                        result.signals.performance_avg[0],
                        result.signals.performance_avg[1],
                        '',
                      ],
                      [
                        'engagement',
                        result.signals.engagement_avg[0],
                        result.signals.engagement_avg[1],
                        '',
                      ],
                      [
                        'burnout',
                        result.burnout_risk_avg_pct[0],
                        result.burnout_risk_avg_pct[1],
                        '%',
                      ],
                      [
                        'highRisk',
                        result.high_risk_count[0],
                        result.high_risk_count[1],
                        '',
                      ],
                    ] as const
                  ).map(([key, a, b, suf]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between py-3 text-[13px]"
                    >
                      <span>{t(`h13.metrics.${key}`)}</span>
                      <span className="text-[18px] font-medium text-muted ltr-nums">
                        {a}
                        {suf}
                        <span className="mx-1.5 text-faint">→</span>
                        {b}
                        {suf}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-faint">
                  {t('h13.estimated')} · {result.signals.performance_note}
                </p>
              </Card>

              <div className="grid gap-3.5 lg:grid-cols-[1fr_260px]">
                <Card className="!rounded-[14px] !p-5">
                  <h3 className="text-[15px] font-semibold">
                    {t('h13.chartTitle')}
                  </h3>
                  <p className="mt-1 text-[12px] text-muted">
                    {t('h13.chartHint')}{' '}
                    <span className="text-amber-dark">
                      · {t('common.projected')}
                    </span>
                  </p>
                  <div className="mt-2 h-[160px] w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid
                          stroke={colors.border}
                          strokeDasharray="3 3"
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: colors.muted }}
                        />
                        <YAxis
                          domain={[0, 80]}
                          tick={{ fontSize: 10, fill: colors.faint }}
                        />
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                        <Line
                          type="monotone"
                          dataKey="baseline"
                          stroke={colors.faint}
                          strokeDasharray="4 4"
                          strokeWidth={2}
                          dot={false}
                          name={t('h13.ifNothing')}
                        />
                        <Line
                          type="monotone"
                          dataKey="scenario"
                          stroke={colors.teal}
                          strokeWidth={2.5}
                          dot={false}
                          name={t('h13.thisScenario')}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="!rounded-[14px] !bg-navy !p-5 !text-white">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-teal">
                    {t('h13.economic')}
                  </p>
                  <p className="mt-2 text-[32px] font-semibold leading-none ltr-nums">
                    {fmtSar(result.estimated_saving_sar)}
                  </p>
                  <p className="mt-2 text-[12px] text-white/60">
                    {t('h13.perYear')} · {t('h13.estimated')}
                  </p>
                  <div className="my-3 h-px bg-white/15" />
                  <div className="flex justify-between text-[12px]">
                    <span className="text-white/60">{t('h13.retention')}</span>
                    <span className="font-medium ltr-nums">
                      {retentionDelta === 0
                        ? t('h13.retentionFlat')
                        : t('h13.retentionDelta', { n: retentionDelta })}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-[12px]">
                    <span className="text-white/60">{t('h13.teamLoad')}</span>
                    <span className="font-medium ltr-nums">
                      {result.signals.workload_avg[0]} →{' '}
                      {result.signals.workload_avg[1]}
                    </span>
                  </div>
                </Card>
              </div>

              <Card className="!rounded-[14px] !p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="max-w-md text-[13px] text-ink">
                    {result.disclaimer}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-[11px] border border-border bg-white px-3.5 py-2 text-[14px] font-semibold"
                    >
                      {t('h13.save')}
                    </button>
                    <Link
                      to="/hr/interventions"
                      className="inline-flex items-center gap-2 rounded-[11px] bg-coral px-3.5 py-2 text-[14px] font-semibold text-white"
                    >
                      <Zap className="h-4 w-4" />
                      {t('h13.sendIntervention')}
                      <RtlFlip>
                        <ArrowRight className="h-4 w-4" />
                      </RtlFlip>
                    </Link>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <Card className="!rounded-[14px]">
              <p className="text-[14px] text-muted">{t('h13.idle')}</p>
            </Card>
          )}

          {compareRows ? (
            <Card className="!rounded-[14px]">
              <h3 className="text-[14px] font-semibold">{t('h13.compare')}</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[480px] text-start text-[13px]">
                  <thead>
                    <tr className="border-b border-border font-mono text-[10px] uppercase text-muted">
                      <th className="py-2 pe-2 font-medium">
                        {t('h13.scenario')}
                      </th>
                      <th className="py-2 pe-2 font-medium">
                        {t('h13.metrics.burnout')}
                      </th>
                      <th className="py-2 pe-2 font-medium">
                        {t('h13.metrics.highRisk')}
                      </th>
                      <th className="py-2 font-medium">{t('h13.economic')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareRows.map((row) => (
                      <tr
                        key={row.scenario_label}
                        className="border-b border-surface-2"
                      >
                        <td className="py-2 pe-2 font-medium">
                          {row.scenario_label}
                        </td>
                        <td className="py-2 pe-2 font-mono ltr-nums">
                          {row.burnout_risk_avg_pct[0]} →{' '}
                          {row.burnout_risk_avg_pct[1]}
                        </td>
                        <td className="py-2 pe-2 font-mono ltr-nums">
                          {row.high_risk_count[0]} → {row.high_risk_count[1]}
                        </td>
                        <td className="py-2 font-mono ltr-nums">
                          {fmtSar(row.estimated_saving_sar)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          {showAssumptions && result ? (
            <Card className="!rounded-[14px] border-navy/20 bg-navy/5">
              <h3 className="text-[14px] font-semibold">
                {t('h13.explainAssumptions')}
              </h3>
              <ul className="mt-3 space-y-2 text-[12px]">
                {result.assumptions.lever_mapping.map((m, i) => (
                  <li
                    key={`${m.control}-${i}`}
                    className="rounded-lg border border-border/60 bg-white px-3 py-2"
                  >
                    <p className="font-semibold">{m.control}</p>
                    <p className="text-muted">{m.mapping}</p>
                    <p className="font-mono text-[11px] ltr-nums">
                      {m.ui} →{' '}
                      {typeof m.delta === 'object'
                        ? JSON.stringify(m.delta)
                        : String(m.delta)}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-faint">
                {result.assumptions.model} · {t('h13.estimated')}
              </p>
            </Card>
          ) : null}
        </div>
      </div>
    </AppShell>
  )
}
