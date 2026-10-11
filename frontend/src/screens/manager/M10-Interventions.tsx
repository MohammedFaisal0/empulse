import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  useCreateIntervention,
  useManagerInterventions,
  useManagerTeam,
  usePatchIntervention,
  type InterventionRow,
} from '../../api/manager'
import { Badge, Button, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { managerNav } from '../../layout/navConfigs'

const FLOW = [
  'proposed',
  'approved',
  'in_progress',
  'completed',
] as const

function statusTone(
  status: string,
): 'coral' | 'amber' | 'teal' | 'slate' | 'violet' {
  if (status === 'proposed') return 'amber'
  if (status === 'approved') return 'teal'
  if (status === 'in_progress') return 'violet'
  if (status === 'completed') return 'teal'
  return 'slate'
}

export function M10Interventions() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading, isError } = useManagerInterventions()
  const team = useManagerTeam()
  const patch = usePatchIntervention()
  const create = useCreateIntervention()

  const items = data?.interventions ?? []
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [employeeId, setEmployeeId] = useState<number | null>(null)
  const [type, setType] = useState('workload_relief')
  const [rationale, setRationale] = useState('')
  const [flash, setFlash] = useState<string | null>(null)

  const selected: InterventionRow | undefined =
    items.find((i) => i.id === selectedId) ?? items[0]

  const people = useMemo(
    () =>
      [...(team.data?.people ?? [])].sort((a, b) =>
        a.full_name.localeCompare(b.full_name),
      ),
    [team.data],
  )

  const completed = items.filter((i) => i.status === 'completed')
  const pendingCount = items.filter(
    (i) => i.status === 'proposed' || i.status === 'approved',
  ).length

  async function runAction(
    id: number,
    action: 'approve' | 'start' | 'complete' | 'decline',
  ) {
    setFlash(null)
    try {
      await patch.mutateAsync({ id, action })
      setFlash(t('m10.actionOk', { action }))
      void qc.invalidateQueries({ queryKey: ['manager', 'interventions'] })
    } catch {
      setFlash(t('common.error'))
    }
  }

  async function createProposed() {
    const emp = employeeId ?? people[0]?.id
    if (!emp) return
    setFlash(null)
    try {
      const res = await create.mutateAsync({
        employee_id: emp,
        type,
        rationale: rationale.trim() || t('m10.defaultRationale'),
        driver: 'workload',
      })
      setFlash(t('m10.created', { id: res.display_id }))
      setShowCreate(false)
      setRationale('')
      setSelectedId(res.id)
      void qc.invalidateQueries({ queryKey: ['manager', 'interventions'] })
    } catch {
      setFlash(t('common.error'))
    }
  }

  const expected =
    selected != null
      ? Math.max(
          0,
          selected.baseline_risk_pct - selected.expected_risk_reduction_pts,
        )
      : 0

  return (
    <AppShell
      config={managerNav}
      activePath="/manager/interventions"
      attentionCount={team.data?.attention_count}
      chrome={{ breadcrumbPage: t('m10.title') }}
      // badge on nav comes from attention; pending shown in header
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('m10.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('m10.subtitle')}</p>
          <p className="mt-1 text-xs text-muted">
            {t('m10.pending', { n: pendingCount })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setShowCreate((v) => !v)}>
            <Plus className="me-1 h-4 w-4" />
            {t('m10.new')}
          </Button>
        </div>
      </div>

      {isLoading ? <p className="text-muted">{t('m10.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}
      {flash ? <p className="mb-3 text-[13px] text-teal-dark">{flash}</p> : null}

      {showCreate ? (
        <Card className="mb-4 !rounded-2xl">
          <h2 className="text-base font-semibold">{t('m10.createTitle')}</h2>
          <p className="mt-1 text-[13px] text-muted">{t('m10.createSub')}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-[13px]">
              <span className="mb-1 block text-muted">{t('m10.employee')}</span>
              <select
                className="w-full rounded-[10px] border border-border px-3 py-2"
                value={employeeId ?? people[0]?.id ?? ''}
                onChange={(e) => setEmployeeId(Number(e.target.value))}
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[13px]">
              <span className="mb-1 block text-muted">{t('m10.type')}</span>
              <select
                className="w-full rounded-[10px] border border-border px-3 py-2"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="workload_relief">{t('m10.typeWorkload')}</option>
                <option value="schedule_checkin">{t('m10.typeCheckin')}</option>
                <option value="recognition">{t('m10.typeRecognize')}</option>
              </select>
            </label>
          </div>
          <textarea
            className="mt-3 min-h-[80px] w-full rounded-[10px] border border-border px-3 py-2 text-[13px]"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder={t('m10.rationalePh')}
          />
          <div className="mt-3">
            <Button
              variant="primary"
              disabled={create.isPending || people.length === 0}
              onClick={() => void createProposed()}
            >
              {t('m10.createSubmit')}
            </Button>
          </div>
        </Card>
      ) : null}

      {data ? (
        <>
          {selected ? (
            <Card className="mb-4 !rounded-2xl">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold">
                    {selected.display_id} · {selected.employee_name}
                  </h2>
                  <p className="mt-1 text-[13px] text-muted">{t('m10.flowHint')}</p>
                </div>
                <Badge tone={statusTone(selected.status)}>
                  {t(`m10.status.${selected.status}`, {
                    defaultValue: selected.status,
                  })}
                </Badge>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {FLOW.map((step, idx) => {
                  const active =
                    FLOW.indexOf(
                      selected.status as (typeof FLOW)[number],
                    ) >= idx ||
                    (selected.status === 'declined' && step === 'proposed')
                  return (
                    <div
                      key={step}
                      className={[
                        'rounded-xl border px-2.5 py-3 text-[12px]',
                        active
                          ? 'border-teal bg-teal-light'
                          : 'border-border bg-white',
                        selected.status === step ? 'ring-1 ring-navy' : '',
                      ].join(' ')}
                    >
                      <p className="font-mono text-[10px] text-muted">
                        {String(idx + 1).padStart(2, '0')}
                      </p>
                      <p className="mt-1 font-bold">{t(`m10.step.${step}`)}</p>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_280px]">
                <div className="space-y-2 text-[13px]">
                  <p>
                    <span className="font-semibold">{t('m10.problem')}: </span>
                    {t('m10.burnoutLine', { pct: selected.baseline_risk_pct })}
                  </p>
                  <p>
                    <span className="font-semibold">{t('m10.reason')}: </span>
                    {selected.driver || '—'} · {selected.type}
                  </p>
                  <p>
                    <span className="font-semibold">{t('m10.rationale')}: </span>
                    {selected.rationale || '—'}
                  </p>
                </div>
                <div className="rounded-2xl bg-surface p-4">
                  <p className="font-mono text-[11px] tracking-wide text-muted">
                    {t('m10.expected')}
                  </p>
                  <p className="mt-2 text-[26px] font-bold ltr-nums">
                    <span className="text-coral-dark">
                      {selected.baseline_risk_pct}%
                    </span>
                    <span className="mx-2 text-ink">→</span>
                    <span className="text-teal-dark">{expected}%</span>
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {t('m10.expectedPts', {
                      n: selected.expected_risk_reduction_pts,
                    })}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selected.status === 'proposed' ? (
                      <>
                        <Button
                          variant="accent"
                          className="!bg-coral-dark"
                          disabled={patch.isPending}
                          onClick={() => void runAction(selected.id, 'approve')}
                        >
                          {t('m10.approve')}
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={patch.isPending}
                          onClick={() => void runAction(selected.id, 'decline')}
                        >
                          {t('m10.decline')}
                        </Button>
                      </>
                    ) : null}
                    {selected.status === 'approved' ? (
                      <Button
                        variant="primary"
                        disabled={patch.isPending}
                        onClick={() => void runAction(selected.id, 'start')}
                      >
                        {t('m10.start')}
                      </Button>
                    ) : null}
                    {selected.status === 'in_progress' ? (
                      <Button
                        variant="primary"
                        disabled={patch.isPending}
                        onClick={() => void runAction(selected.id, 'complete')}
                      >
                        {t('m10.complete')}
                      </Button>
                    ) : null}
                  </div>
                  <p className="mt-3 text-[11px] text-faint">{t('m10.hitl')}</p>
                </div>
              </div>
            </Card>
          ) : (
            <p className="mb-4 text-muted">{t('m10.empty')}</p>
          )}

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('m10.listTitle')}</h2>
              <p className="mt-1 text-[13px] text-muted">{t('m10.listSub')}</p>
              <ul className="mt-3 divide-y divide-border">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={[
                        'flex w-full flex-wrap items-center justify-between gap-2 px-1 py-3 text-start text-[13px]',
                        selected?.id === item.id ? 'bg-surface' : '',
                      ].join(' ')}
                    >
                      <div>
                        <p className="font-semibold">
                          {item.display_id} · {item.employee_name}
                        </p>
                        <p className="text-xs text-muted">{item.type}</p>
                      </div>
                      <Badge tone={statusTone(item.status)}>
                        {t(`m10.status.${item.status}`, {
                          defaultValue: item.status,
                        })}
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('m10.workedTitle')}</h2>
              <ul className="mt-3 space-y-3">
                {completed.slice(0, 4).map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-border px-3 py-2.5 text-[13px]"
                  >
                    <p className="font-semibold">
                      {item.display_id} · {item.employee_name}
                    </p>
                    <p className="mt-1 ltr-nums text-muted">
                      {item.baseline_risk_pct}%
                      {item.followup_risk_pct != null
                        ? ` → ${item.followup_risk_pct}%`
                        : ''}
                    </p>
                    <p className="mt-1 text-xs text-teal-dark">
                      {t('m10.outcome', { outcome: item.outcome })}
                    </p>
                  </li>
                ))}
                {completed.length === 0 ? (
                  <li className="text-muted">{t('m10.noCompleted')}</li>
                ) : null}
              </ul>
            </Card>
          </div>
        </>
      ) : null}
    </AppShell>
  )
}
