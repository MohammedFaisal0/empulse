import { ArrowRight, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import {
  useHrMatrix,
  type HrMatrixPerson,
} from '../../api/hr'
import { RtlFlip } from '../../components/RtlFlip'
import { Avatar, Badge, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { hrNav } from '../../layout/navConfigs'

type Quad = 'thriving' | 'burnout_risk' | 'development' | 'critical_support'

function pctPos(v: number): string {
  return `${Math.min(92, Math.max(8, v))}%`
}

const QUADS: Quad[] = [
  'thriving',
  'burnout_risk',
  'development',
  'critical_support',
]

const QUAD_TONE: Record<Quad, string> = {
  thriving: 'border-teal/40 bg-teal/10 text-teal-dark',
  burnout_risk: 'border-coral/40 bg-coral/10 text-coral-dark',
  development: 'border-amber/40 bg-amber/10 text-amber-dark',
  critical_support: 'border-coral/50 bg-coral/15 text-coral-dark',
}

const DOT_CLASS: Record<Quad, string> = {
  thriving: 'bg-teal text-white',
  burnout_risk: 'bg-coral text-white',
  development: 'bg-amber text-ink',
  critical_support: 'bg-coral-dark text-white',
}

export function H11PerformanceWellbeingMatrix() {
  const { t } = useTranslation()
  const [deptId, setDeptId] = useState<number | undefined>()
  const [active, setActive] = useState<Quad>('burnout_risk')
  const { data, isLoading, isError } = useHrMatrix(
    deptId ? { department_id: deptId } : undefined,
  )

  const people = data?.people?.[active] ?? []
  const allDots = useMemo(() => {
    if (!data?.people) return [] as (HrMatrixPerson & { quadrant: Quad })[]
    const out: (HrMatrixPerson & { quadrant: Quad })[] = []
    for (const q of QUADS) {
      for (const p of data.people[q] ?? []) {
        out.push({ ...p, quadrant: q })
      }
    }
    return out
  }, [data])

  const movedTotal =
    data?.moved.up != null && data.moved.down != null
      ? data.moved.up + data.moved.down
      : null

  return (
    <AppShell
      config={hrNav}
      activePath="/hr/matrix"
      chrome={{
        breadcrumbPrimary: t('h11.breadcrumbOrg'),
        breadcrumbPage: t('h11.breadcrumbPage'),
      }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('h11.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('h11.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[11px] border border-border bg-white px-3.5 py-2 text-[14px] font-semibold"
            onClick={() => setActive('critical_support')}
          >
            <Sparkles className="h-4 w-4 text-teal" />
            {t('h11.whoNeeds')}
          </button>
          <Link
            to="/hr/simulator"
            className="inline-flex items-center gap-2 rounded-[11px] bg-navy px-3.5 py-2 text-[14px] font-semibold text-white"
          >
            {t('h11.simulate')}
            <RtlFlip>
              <ArrowRight className="h-4 w-4 text-teal-lighter" />
            </RtlFlip>
          </Link>
        </div>
      </div>

      {isLoading ? <p className="text-muted">{t('h11.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-4 text-[13px]">
            <div>
              <p className="font-mono text-[10px] uppercase text-muted">
                {t('h11.peoplePlotted')}
              </p>
              <p className="font-semibold ltr-nums">
                {data.scope.n}
                <span className="ms-1 font-normal text-muted">
                  · {t('h11.teamsN', { n: data.scope.teams })}
                </span>
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase text-muted">
                {t('h11.moved')}
              </p>
              {movedTotal != null ? (
                <p className="font-semibold ltr-nums">
                  {movedTotal}
                  <span className="ms-1 font-normal text-muted">
                    {t('h11.movedDetail', {
                      up: data.moved.up,
                      down: data.moved.down,
                    })}
                  </span>
                </p>
              ) : (
                <p className="text-faint">— · {t('common.notCollected')}</p>
              )}
            </div>
            <label className="ms-auto flex items-center gap-2 text-[13px]">
              <span className="text-muted">{t('h11.filterDept')}</span>
              <select
                className="rounded-lg border border-border bg-white px-2 py-1.5"
                value={deptId ?? ''}
                onChange={(e) =>
                  setDeptId(e.target.value ? Number(e.target.value) : undefined)
                }
              >
                <option value="">{t('h11.allDepts')}</option>
                {data.filters.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mb-4 text-[12px] text-muted">{t('h11.matrixHint')}</p>

          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {QUADS.map((q) => {
              const n = data.counts[q]
              const selected = active === q
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => setActive(q)}
                  className={[
                    'rounded-[14px] border px-4 py-3 text-start transition',
                    selected
                      ? QUAD_TONE[q] + ' ring-2 ring-navy/20'
                      : 'border-border bg-white',
                  ].join(' ')}
                >
                  <p className="text-[13px] font-semibold">
                    {t(`h11.quads.${q}`)}
                  </p>
                  <p className="mt-1 text-[24px] font-semibold ltr-nums">{n}</p>
                </button>
              )
            })}
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_300px]">
            <Card className="!rounded-[14px]">
              <div
                className="relative mx-auto aspect-square max-h-[480px] w-full max-w-[520px] rounded-xl border border-border bg-surface"
                dir="ltr"
              >
                {/* quadrant fills */}
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                  <div className="border-e border-b border-border/60 bg-coral/10" />
                  <div className="border-b border-border/60 bg-teal/10" />
                  <div className="border-e border-border/60 bg-coral/15" />
                  <div className="bg-amber/10" />
                </div>
                <span className="absolute start-2 top-2 text-[10px] font-semibold uppercase text-coral-dark">
                  {t('h11.axisBurnout')}
                </span>
                <span className="absolute end-2 top-2 text-[10px] font-semibold uppercase text-teal-dark">
                  {t('h11.axisThriving')}
                </span>
                <span className="absolute start-2 bottom-2 text-[10px] font-semibold uppercase text-coral-dark">
                  {t('h11.axisCritical')}
                </span>
                <span className="absolute end-2 bottom-2 text-[10px] font-semibold uppercase text-amber-dark">
                  {t('h11.axisDev')}
                </span>
                <span className="absolute -start-1 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-mono uppercase text-muted">
                  {t('h11.performance')}
                </span>
                <span className="absolute bottom-0 start-1/2 -translate-x-1/2 translate-y-5 text-[10px] font-mono uppercase text-muted">
                  {t('h11.wellbeing')}
                </span>

                {data.executive_individuals_hidden ? (
                  <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-[13px] text-muted">
                    {t('h11.execNoDots')}
                  </div>
                ) : (
                  allDots.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      title={p.full_name}
                      onClick={() => setActive(p.quadrant)}
                      className={[
                        'absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[9px] font-bold shadow-sm',
                        DOT_CLASS[p.quadrant],
                        p.quadrant === active ? 'ring-2 ring-navy' : '',
                      ].join(' ')}
                      style={{
                        left: pctPos(p.wellbeing_score),
                        bottom: pctPos(p.performance_score),
                      }}
                    >
                      {p.initials.slice(0, 2)}
                    </button>
                  ))
                )}

                {/* threshold crosshair */}
                <div
                  className="pointer-events-none absolute inset-y-0 w-px border-s border-dashed border-navy/30"
                  style={{ left: pctPos(data.thresholds.wellbeing) }}
                />
                <div
                  className="pointer-events-none absolute inset-x-0 h-px border-t border-dashed border-navy/30"
                  style={{ bottom: pctPos(data.thresholds.performance) }}
                />
              </div>
              <p className="mt-6 text-center text-[11px] text-faint">
                {t('h11.thresholds', {
                  p: data.thresholds.performance,
                  w: data.thresholds.wellbeing,
                })}
              </p>
            </Card>

            <div className="space-y-4">
              <Card className="!rounded-[14px]">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold">
                    {t(`h11.quads.${active}`)}
                  </h2>
                  <Badge tone="slate">
                    {t('h11.peopleN', { n: data.counts[active] })}
                  </Badge>
                </div>
                <p className="mt-1 text-[12px] text-muted">
                  {t(`h11.quadSubs.${active}`)}
                </p>

                {data.executive_individuals_hidden ? (
                  <p className="mt-4 text-[13px] text-muted">{t('h11.execList')}</p>
                ) : (
                  <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                    {people.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center gap-2 rounded-lg border border-border/50 px-2 py-2"
                      >
                        <Avatar name={p.full_name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium">
                            {p.full_name}
                          </p>
                          <p className="truncate text-[11px] text-muted">
                            {p.team ?? p.department}
                          </p>
                        </div>
                        <p className="shrink-0 font-mono text-[11px] text-muted ltr-nums">
                          P {Math.round(p.performance_score)} · W{' '}
                          {Math.round(p.wellbeing_score)}
                        </p>
                      </li>
                    ))}
                    {people.length === 0 ? (
                      <li className="text-[13px] text-muted">{t('h11.emptyQuad')}</li>
                    ) : null}
                  </ul>
                )}

                <div className="mt-4 rounded-xl border border-border/60 bg-surface px-3 py-3">
                  <p className="font-mono text-[10px] uppercase text-muted">
                    {t('h11.suggestedPlaybook')}
                  </p>
                  <p className="mt-1 text-[13px] font-semibold">
                    {t(`h11.playbooks.${active}.title`)}
                  </p>
                  <p className="mt-1 text-[12px] text-muted">
                    {t(`h11.playbooks.${active}.detail`)}
                  </p>
                  <Link
                    to="/hr/simulator"
                    className="mt-3 inline-flex text-[13px] font-semibold text-teal"
                  >
                    {t('h11.simulateRelief')}
                  </Link>
                </div>
              </Card>
            </div>
          </div>

          <Card className="!rounded-[14px]">
            <h2 className="text-base font-semibold">{t('h11.byDept')}</h2>
            <p className="mb-3 text-[13px] text-muted">{t('h11.byDeptSub')}</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-start text-[13px]">
                <thead>
                  <tr className="border-b border-border font-mono text-[10px] uppercase text-muted">
                    <th className="py-2 pe-2 font-medium">{t('h11.colDept')}</th>
                    <th className="py-2 pe-2 font-medium">{t('h11.quads.thriving')}</th>
                    <th className="py-2 pe-2 font-medium">
                      {t('h11.quads.burnout_risk')}
                    </th>
                    <th className="py-2 pe-2 font-medium">
                      {t('h11.quads.development')}
                    </th>
                    <th className="py-2 font-medium">
                      {t('h11.quads.critical_support')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_department.map((d) => (
                    <tr key={d.department_id} className="border-b border-surface-2">
                      <td className="py-2.5 pe-2 font-medium">{d.department}</td>
                      <td className="py-2.5 pe-2 font-mono ltr-nums">
                        {d.counts.thriving}
                      </td>
                      <td className="py-2.5 pe-2 font-mono ltr-nums">
                        {d.counts.burnout_risk}
                      </td>
                      <td className="py-2.5 pe-2 font-mono ltr-nums">
                        {d.counts.development}
                      </td>
                      <td className="py-2.5 font-mono ltr-nums">
                        {d.counts.critical_support}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] text-faint">{t('h11.noRanking')}</p>
          </Card>
        </>
      ) : null}
    </AppShell>
  )
}
