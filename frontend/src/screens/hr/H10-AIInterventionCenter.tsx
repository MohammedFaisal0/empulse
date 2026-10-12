import { useQueryClient } from '@tanstack/react-query'
import { BookOpen, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  useCreateHrIntervention,
  useHrInterventions,
  usePatchHrIntervention,
  type HrInterventionRow,
} from '../../api/hr'
import { Badge, Button, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { hrNav } from '../../layout/navConfigs'
import { colors } from '../../theme/colors'

function dash(v: number | null | undefined, suffix = ''): string {
  if (v == null || Number.isNaN(v)) return '—'
  return `${v}${suffix}`
}

function statusTone(
  status: string,
): 'coral' | 'amber' | 'teal' | 'slate' | 'violet' {
  if (status === 'proposed') return 'amber'
  if (status === 'approved') return 'teal'
  if (status === 'in_progress') return 'violet'
  if (status === 'completed') return 'teal'
  return 'slate'
}

function displayStatus(status: string, outcome: string): string {
  if (status === 'completed' || outcome === 'worked' || outcome === 'partial') {
    if (status === 'completed') return 'measured'
  }
  if (status === 'in_progress' || status === 'approved') return 'active'
  return status
}

export function H10AIInterventionCenter() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading, isError } = useHrInterventions()
  const patch = usePatchHrIntervention()
  const create = useCreateHrIntervention()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const items = data?.interventions ?? []
  const selected: HrInterventionRow | undefined =
    items.find((i) => i.id === selectedId) ?? items[0]
  const featured = data?.featured

  const outcomeChart = useMemo(() => {
    if (!data) return []
    return [
      { key: 'worked', n: data.outcome_mix.worked },
      { key: 'partial', n: data.outcome_mix.partial },
      { key: 'no_change', n: data.outcome_mix.no_change },
    ]
  }, [data])

  async function runAction(
    id: number,
    action: 'approve' | 'start' | 'complete' | 'decline',
  ) {
    setFlash(null)
    try {
      await patch.mutateAsync({
        id,
        action,
        outcome: action === 'complete' ? 'worked' : undefined,
      })
      setFlash(t('h10.actionOk', { action }))
      void qc.invalidateQueries({ queryKey: ['hr', 'interventions'] })
    } catch {
      setFlash(t('common.error'))
    }
  }

  async function proposeFromSignal(p: {
    employee_id: number
    suggested_type: string
    suggested_rationale: string
    driver: string
  }) {
    setFlash(null)
    try {
      const res = await create.mutateAsync({
        employee_id: p.employee_id,
        type: p.suggested_type,
        rationale: p.suggested_rationale,
        driver: p.driver,
      })
      setFlash(t('h10.created', { id: res.display_id }))
      setSelectedId(res.id)
      void qc.invalidateQueries({ queryKey: ['hr', 'interventions'] })
    } catch {
      setFlash(t('common.error'))
    }
  }

  const riskBefore = featured?.baseline_risk_pct
  const riskAfter = featured?.followup_risk_pct

  return (
    <AppShell
      config={hrNav}
      activePath="/hr/interventions"
      chrome={{
        breadcrumbPrimary: t('h10.breadcrumbOrg'),
        breadcrumbPage: t('h10.breadcrumbPage'),
      }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('h10.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('h10.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[11px] border border-border bg-white px-3.5 py-2 text-[14px] font-semibold"
          >
            <BookOpen className="h-4 w-4 text-muted" />
            {t('h10.playbooks')}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[11px] bg-navy px-3.5 py-2 text-[14px] font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            {t('h10.newIntervention')}
          </button>
        </div>
      </div>

      {isLoading ? <p className="text-muted">{t('h10.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}
      {flash ? <p className="mb-3 text-[13px] text-teal">{flash}</p> : null}

      {data ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(
              [
                ['detected', data.kpis.detected_30d, t('h10.kpiDetectedSub')],
                ['proposed', data.kpis.proposed, t('h10.kpiProposedSub')],
                [
                  'active',
                  data.kpis.active,
                  t('h10.kpiActiveSub', {
                    pct: dash(data.kpis.on_track_pct),
                  }),
                ],
                ['followup', data.kpis.followup_due, t('h10.kpiFollowupSub')],
                [
                  'measured',
                  data.kpis.measured,
                  t('h10.kpiMeasuredSub', {
                    pct: dash(data.kpis.improved_pct),
                  }),
                ],
              ] as const
            ).map(([key, value, sub]) => (
              <Card key={key} className="!rounded-[14px]">
                <p
                  className={[
                    'text-[28px] font-semibold ltr-nums',
                    key === 'measured' ? 'text-green' : 'text-ink',
                  ].join(' ')}
                >
                  {value}
                </p>
                <p className="text-[13px] font-semibold">{t(`h10.kpi.${key}`)}</p>
                <p className="text-[12px] text-muted">{sub}</p>
              </Card>
            ))}
          </div>

          {data.executive_individuals_hidden ? (
            <Card className="mb-4 !rounded-[14px]">
              <p className="text-[13px] text-muted">{t('h10.execHidden')}</p>
              <div className="mt-4 h-[160px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={outcomeChart}>
                    <XAxis
                      dataKey="key"
                      tickFormatter={(k) => t(`h10.outcomes.${k}`)}
                      tick={{ fontSize: 11, fill: colors.muted }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: colors.muted }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="n" radius={[6, 6, 0, 0]}>
                      {outcomeChart.map((row) => (
                        <Cell
                          key={row.key}
                          fill={
                            row.key === 'worked'
                              ? colors.tealDark
                              : row.key === 'partial'
                                ? colors.amber
                                : colors.coral
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          ) : (
            <>
              {featured ? (
                <Card className="mb-4 !rounded-[14px]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold ltr-nums">
                          {featured.display_id} · {featured.employee_name}
                        </h2>
                        <Badge tone="teal">{t('h10.status.measured')}</Badge>
                        <Badge tone="teal">{featured.outcome}</Badge>
                      </div>
                      <p className="mt-1 text-[13px] text-muted">
                        {featured.job_title} · {featured.department}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-[11px] border border-border bg-white px-3 py-1.5 text-[13px] font-semibold"
                      >
                        {t('h10.reusePlaybook')}
                      </button>
                      <Button type="button" className="!rounded-[11px]">
                        {t('h10.trackOutcome')}
                      </Button>
                    </div>
                  </div>

                  <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-[13px]">
                    <div>
                      <dt className="font-mono text-[10px] uppercase text-muted">
                        {t('h10.problem')}
                      </dt>
                      <dd className="mt-0.5">{featured.rationale || '—'}</dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[10px] uppercase text-muted">
                        {t('h10.intervention')}
                      </dt>
                      <dd className="mt-0.5">{featured.type}</dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[10px] uppercase text-muted">
                        {t('h10.owner')}
                      </dt>
                      <dd className="mt-0.5">
                        {featured.owner_name ?? '—'}
                        {featured.approved_by_name
                          ? ` · ${featured.approved_by_name}`
                          : ''}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[10px] uppercase text-muted">
                        {t('h10.rootCause')}
                      </dt>
                      <dd className="mt-0.5 text-muted">
                        {featured.driver}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border/60 bg-surface px-3 py-3">
                      <p className="font-mono text-[10px] uppercase text-muted">
                        {t('h10.burnoutRisk')}
                      </p>
                      <p className="mt-1 font-mono text-[18px] font-semibold ltr-nums">
                        {riskBefore ?? '—'}
                        <span className="mx-1 text-faint">→</span>
                        {riskAfter != null ? `${riskAfter}%` : '—'}
                      </p>
                      <p className="text-[12px] text-teal ltr-nums">
                        {featured.risk_delta_pts != null
                          ? t('h10.ptsDelta', {
                              n: -featured.risk_delta_pts,
                              exp: featured.expected_risk_reduction_pts,
                            })
                          : t('common.notCollected')}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-surface px-3 py-3">
                      <p className="font-mono text-[10px] uppercase text-muted">
                        {t('h10.engagement')}
                      </p>
                      <p className="mt-1 text-[18px] font-semibold">—</p>
                      <p className="text-[12px] text-faint">
                        {t('common.notCollected')}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-surface px-3 py-3">
                      <p className="font-mono text-[10px] uppercase text-muted">
                        {t('h10.performance')}
                      </p>
                      <p className="mt-1 text-[18px] font-semibold">—</p>
                      <p className="text-[12px] text-faint">
                        {t('common.notCollected')}
                      </p>
                    </div>
                  </div>
                </Card>
              ) : null}

              <Card className="mb-4 !rounded-[14px] border-teal/30 bg-teal/5">
                <p className="text-[14px] font-semibold text-ink">
                  {t('h10.playbookLearn', {
                    strong: data.playbook.workload_rebalance.strong_n,
                    total: data.playbook.workload_rebalance.total_n,
                    pts: data.playbook.workload_rebalance.threshold_pts,
                  })}
                </p>
                <p className="mt-1 text-[13px] text-muted">
                  {t('h10.playbookRecog', {
                    worked: data.playbook.recognition_only.worked_n,
                    total: data.playbook.recognition_only.total_n,
                  })}
                </p>
              </Card>

              <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_280px]">
                <Card className="!rounded-[14px]">
                  <h2 className="mb-3 text-base font-semibold">
                    {t('h10.allInterventions')}
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-start text-[13px]">
                      <thead>
                        <tr className="border-b border-border font-mono text-[10px] uppercase text-muted">
                          <th className="py-2 pe-2 font-medium">{t('h10.colWho')}</th>
                          <th className="py-2 pe-2 font-medium">
                            {t('h10.colProblem')}
                          </th>
                          <th className="py-2 pe-2 font-medium">
                            {t('h10.colIntervention')}
                          </th>
                          <th className="py-2 pe-2 font-medium">
                            {t('h10.colExpected')}
                          </th>
                          <th className="py-2 pe-2 font-medium">
                            {t('h10.colOwner')}
                          </th>
                          <th className="py-2 font-medium">{t('h10.colStatus')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.slice(0, 40).map((row) => {
                          const label = displayStatus(row.status, row.outcome)
                          return (
                            <tr
                              key={row.id}
                              className={[
                                'cursor-pointer border-b border-surface-2',
                                selected?.id === row.id ? 'bg-teal/10' : '',
                              ].join(' ')}
                              onClick={() => setSelectedId(row.id)}
                            >
                              <td className="py-2.5 pe-2 font-medium">
                                {row.employee_name}
                              </td>
                              <td className="py-2.5 pe-2 text-muted">
                                {t('h10.riskLine', {
                                  pct: row.baseline_risk_pct,
                                })}
                              </td>
                              <td className="py-2.5 pe-2">{row.type}</td>
                              <td className="py-2.5 pe-2 font-mono ltr-nums">
                                {row.baseline_risk_pct}% → {row.expected_to_pct}%
                              </td>
                              <td className="py-2.5 pe-2 text-muted">
                                {row.owner_name ?? '—'}
                              </td>
                              <td className="py-2.5">
                                <Badge tone={statusTone(row.status)}>
                                  {t(`h10.status.${label}`, {
                                    defaultValue: label,
                                  })}
                                </Badge>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>

                <div className="space-y-4">
                  {selected ? (
                    <Card className="!rounded-[14px]">
                      <p className="font-mono text-[11px] text-muted ltr-nums">
                        {selected.display_id}
                      </p>
                      <h3 className="text-[15px] font-semibold">
                        {selected.employee_name}
                      </h3>
                      <p className="mt-1 text-[12px] text-muted">
                        {selected.department}
                        {selected.team ? ` · ${selected.team}` : ''}
                      </p>
                      <p className="mt-3 text-[13px]">{selected.rationale}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selected.status === 'proposed' ? (
                          <>
                            <Button
                              type="button"
                              className="!rounded-[11px]"
                              disabled={patch.isPending}
                              onClick={() => runAction(selected.id, 'approve')}
                            >
                              {t('h10.approve')}
                            </Button>
                            <button
                              type="button"
                              className="rounded-[11px] border border-border px-3 py-1.5 text-[13px] font-semibold"
                              disabled={patch.isPending}
                              onClick={() => runAction(selected.id, 'decline')}
                            >
                              {t('h10.decline')}
                            </button>
                          </>
                        ) : null}
                        {selected.status === 'approved' ? (
                          <Button
                            type="button"
                            className="!rounded-[11px]"
                            disabled={patch.isPending}
                            onClick={() => runAction(selected.id, 'start')}
                          >
                            {t('h10.start')}
                          </Button>
                        ) : null}
                        {selected.status === 'in_progress' ? (
                          <Button
                            type="button"
                            className="!rounded-[11px]"
                            disabled={patch.isPending}
                            onClick={() => runAction(selected.id, 'complete')}
                          >
                            {t('h10.complete')}
                          </Button>
                        ) : null}
                      </div>
                      <p className="mt-3 text-[11px] text-faint">
                        {t('h10.hitlNote')}
                      </p>
                    </Card>
                  ) : null}

                  <Card className="!rounded-[14px]">
                    <h3 className="text-[14px] font-semibold">
                      {t('h10.signalProposals')}
                    </h3>
                    <p className="mb-2 text-[12px] text-muted">
                      {t('h10.signalSub')}
                    </p>
                    <ul className="max-h-64 space-y-2 overflow-y-auto">
                      {(data.signal_proposals ?? []).slice(0, 8).map((p) => (
                        <li
                          key={p.employee_id}
                          className="rounded-lg border border-border/60 px-2.5 py-2"
                        >
                          <p className="text-[13px] font-medium">
                            {p.employee_name}
                          </p>
                          <p className="font-mono text-[11px] text-muted ltr-nums">
                            {t('h10.riskLine', { pct: p.burnout_risk_pct })}
                          </p>
                          <button
                            type="button"
                            className="mt-1 text-[12px] font-semibold text-teal"
                            disabled={create.isPending}
                            onClick={() => proposeFromSignal(p)}
                          >
                            {t('h10.createProposed')}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Card>

                  <Card className="!rounded-[14px]">
                    <h3 className="mb-2 text-[14px] font-semibold">
                      {t('h10.outcomesTitle')}
                    </h3>
                    <div className="h-[140px] w-full" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={outcomeChart}>
                          <XAxis
                            dataKey="key"
                            tickFormatter={(k) => t(`h10.outcomes.${k}`)}
                            tick={{ fontSize: 10, fill: colors.muted }}
                          />
                          <YAxis hide />
                          <Tooltip contentStyle={{ fontSize: 12 }} />
                          <Bar dataKey="n" radius={[6, 6, 0, 0]}>
                            {outcomeChart.map((row) => (
                              <Cell
                                key={row.key}
                                fill={
                                  row.key === 'worked'
                                    ? colors.tealDark
                                    : row.key === 'partial'
                                      ? colors.amber
                                      : colors.coral
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>
              </div>
            </>
          )}
        </>
      ) : null}
    </AppShell>
  )
}
