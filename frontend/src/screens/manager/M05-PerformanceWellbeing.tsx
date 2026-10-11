import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useManagerTeam, type TeamMemberRow } from '../../api/manager'
import { Avatar, Badge, Button, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { managerNav } from '../../layout/navConfigs'

type Quad = 'thriving' | 'burnout_risk' | 'development' | 'critical_support'

function quadrantOf(p: TeamMemberRow): Quad {
  const highP = p.performance_score >= 70
  const highW = p.wellbeing_score >= 55
  if (highP && highW) return 'thriving'
  if (highP && !highW) return 'burnout_risk'
  if (!highP && highW) return 'development'
  return 'critical_support'
}

function pct(v: number): string {
  return `${Math.min(95, Math.max(5, v))}%`
}

export function M05PerformanceWellbeing() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useManagerTeam()
  const [active, setActive] = useState<Quad>('burnout_risk')

  const people = data?.people ?? []
  const byQuad = useMemo(() => {
    const map: Record<Quad, TeamMemberRow[]> = {
      thriving: [],
      burnout_risk: [],
      development: [],
      critical_support: [],
    }
    for (const p of [...people].sort((a, b) =>
      a.full_name.localeCompare(b.full_name),
    )) {
      map[quadrantOf(p)].push(p)
    }
    return map
  }, [people])

  const counts = {
    thriving: byQuad.thriving.length,
    burnout_risk: byQuad.burnout_risk.length,
    development: byQuad.development.length,
    critical_support: byQuad.critical_support.length,
  }

  return (
    <AppShell
      config={managerNav}
      activePath="/manager/matrix"
      attentionCount={data?.attention_count}
      chrome={{ breadcrumbPage: t('m05.title') }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('m05.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('m05.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary">{t('m05.whoFirst')}</Button>
          <Button variant="primary">{t('m05.simulate')}</Button>
        </div>
      </div>

      {isLoading ? <p className="text-muted">{t('m05.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('errors.error.unknown')}</p> : null}

      {data ? (
        <>
          <p className="mb-3 text-[12.5px] text-muted">
            {t('m05.summary', {
              plotted: people.length,
              team: data.team ?? '—',
            })}
          </p>

          <div className="mb-4 flex flex-wrap gap-2">
            {(
              [
                ['thriving', 'teal'],
                ['burnout_risk', 'amber'],
                ['development', 'violet'],
                ['critical_support', 'coral'],
              ] as const
            ).map(([id, tone]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActive(id)}
                className={[
                  'rounded-lg px-3 py-2 text-[13px]',
                  active === id
                    ? 'bg-navy font-semibold text-white'
                    : 'border border-border bg-white',
                ].join(' ')}
              >
                <Badge tone={tone} className="me-2">
                  {counts[id]}
                </Badge>
                {t(`m05.quad.${id}`)}
              </button>
            ))}
          </div>

          <div className="mb-4 grid gap-3 lg:grid-cols-2">
            <Card className="relative h-80 !rounded-2xl overflow-hidden">
              <p className="absolute start-3 top-3 z-10 font-mono text-[10px] text-muted">
                {t('m05.wellbeingAxis')}
              </p>
              <p className="absolute bottom-3 end-3 z-10 font-mono text-[10px] text-muted">
                {t('m05.performanceAxis')}
              </p>
              <div className="absolute inset-8">
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 border border-border">
                  <QuadCell
                    label={t('m05.quad.development')}
                    active={active === 'development'}
                    onClick={() => setActive('development')}
                    tone="bg-violet-light/40"
                  />
                  <QuadCell
                    label={t('m05.quad.thriving')}
                    active={active === 'thriving'}
                    onClick={() => setActive('thriving')}
                    tone="bg-teal-light/50"
                  />
                  <QuadCell
                    label={t('m05.quad.critical_support')}
                    active={active === 'critical_support'}
                    onClick={() => setActive('critical_support')}
                    tone="bg-coral-light/50"
                  />
                  <QuadCell
                    label={t('m05.quad.burnout_risk')}
                    active={active === 'burnout_risk'}
                    onClick={() => setActive('burnout_risk')}
                    tone="bg-amber/10"
                  />
                </div>
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  aria-hidden
                >
                  {people.map((p) => {
                    const prior = p.prior_quarter
                    if (
                      prior.performance_score == null ||
                      prior.wellbeing_score == null
                    ) {
                      return null
                    }
                    const x1 = Math.min(95, Math.max(5, prior.performance_score))
                    const y1 = 100 - Math.min(95, Math.max(5, prior.wellbeing_score))
                    const x2 = Math.min(95, Math.max(5, p.performance_score))
                    const y2 = 100 - Math.min(95, Math.max(5, p.wellbeing_score))
                    return (
                      <line
                        key={`line-${p.id}`}
                        x1={`${x1}%`}
                        y1={`${y1}%`}
                        x2={`${x2}%`}
                        y2={`${y2}%`}
                        stroke="currentColor"
                        className="text-faint"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                      />
                    )
                  })}
                </svg>
                {people.map((p) => {
                  const prior = p.prior_quarter
                  if (
                    prior.performance_score == null ||
                    prior.wellbeing_score == null
                  ) {
                    return null
                  }
                  return (
                    <span
                      key={`ghost-${p.id}`}
                      title={`${p.full_name} (prior)`}
                      className="absolute h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded-full border border-dashed border-faint bg-white/60"
                      style={{
                        left: pct(prior.performance_score),
                        bottom: pct(prior.wellbeing_score),
                      }}
                    />
                  )
                })}
                {people.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    title={p.full_name}
                    onClick={() => setActive(quadrantOf(p))}
                    className="absolute z-[1] -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white shadow-card"
                    style={{
                      left: pct(p.performance_score),
                      bottom: pct(p.wellbeing_score),
                    }}
                  >
                    <Avatar name={p.full_name} size="sm" />
                  </button>
                ))}
              </div>
            </Card>

            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">
                {t(`m05.quad.${active}`)} · {counts[active]}
              </h2>
              <p className="mt-1 text-xs text-muted">{t(`m05.quadHelp.${active}`)}</p>
              <ul className="mt-4 space-y-2">
                {byQuad[active].map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-[13px]"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar name={p.full_name} size="sm" />
                      <div>
                        <p className="font-semibold">{p.full_name}</p>
                        <p className="ltr-nums font-mono text-[11px] text-muted">
                          P {p.performance_score} · W {p.wellbeing_score}
                          {p.prior_quarter.performance_score != null
                            ? ` · was P ${p.prior_quarter.performance_score} / W ${p.prior_quarter.wellbeing_score}`
                            : ''}
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/manager/members/${p.id}`}
                      className="font-semibold text-teal-dark"
                    >
                      {t('m05.profile')}
                    </Link>
                  </li>
                ))}
                {byQuad[active].length === 0 ? (
                  <p className="text-muted">{t('m05.emptyQuad')}</p>
                ) : null}
              </ul>
              <div className="mt-4 rounded-lg bg-surface px-3 py-2 text-[12.5px] text-muted">
                {t('m05.playbook')}
              </div>
              <Link to="/manager/burnout" className="mt-3 inline-block">
                <Button variant="accent" className="!bg-coral-dark">
                  {t('m05.startIntervention')}
                </Button>
              </Link>
            </Card>
          </div>
          <p className="text-[11.5px] text-muted">{t('m05.footnote')}</p>
        </>
      ) : null}
    </AppShell>
  )
}

function QuadCell({
  label,
  active,
  onClick,
  tone,
}: {
  label: string
  active: boolean
  onClick: () => void
  tone: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'p-2 text-start text-[11px] font-semibold',
        tone,
        active ? 'ring-2 ring-inset ring-navy' : '',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
