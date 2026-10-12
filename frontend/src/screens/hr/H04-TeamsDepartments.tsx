import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { ApiRequestError } from '../../api/client'
import { useHrTeamMembers, useHrTeams } from '../../api/hr'
import { RtlFlip } from '../../components/RtlFlip'
import { Avatar, Badge, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { hrNav } from '../../layout/navConfigs'

export function H04TeamsDepartments() {
  const { t } = useTranslation()
  const [deptId, setDeptId] = useState<number | undefined>()
  const [teamId, setTeamId] = useState<number | undefined>()
  const { data, isLoading, isError } = useHrTeams(deptId, teamId)
  const members = useHrTeamMembers(teamId)
  const membersForbidden =
    members.isError &&
    members.error instanceof ApiRequestError &&
    members.error.code === 'privacy.executive_aggregates_only'

  return (
    <AppShell
      config={hrNav}
      activePath="/hr/teams"
      chrome={{
        breadcrumbPrimary: t('h04.breadcrumbOrg'),
        breadcrumbPage: t('h04.title'),
      }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('h04.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('h04.subtitle')}</p>
        </div>
        <Link
          to="/hr/organization"
          className="rounded-[11px] border border-border bg-white px-3.5 py-2 text-[14px] font-semibold"
        >
          {t('h04.compare')}
        </Link>
      </div>

      {isLoading ? <p className="text-muted">{t('h04.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data ? (
        <div className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_280px]">
          {/* Org → departments */}
          <Card className="!rounded-[14px]">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
              {t('h04.colOrg')}
            </p>
            <div className="mt-2 rounded-xl bg-navy px-3 py-2.5 text-white">
              <p className="text-[13px] font-semibold">{data.organization.name}</p>
              <p className="font-mono text-[11px] text-white/70 ltr-nums">
                {data.organization.headcount?.toLocaleString()} · EMPULSE{' '}
                {data.organization.suppressed
                  ? '—'
                  : (data.organization.empulse_score ?? '—')}
              </p>
            </div>
            <ul className="mt-3 space-y-1.5">
              {data.departments.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setDeptId(d.id)
                      setTeamId(undefined)
                    }}
                    className={[
                      'flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-start text-[13px]',
                      deptId === d.id
                        ? 'border-teal bg-teal-light/50'
                        : 'border-border bg-white',
                    ].join(' ')}
                  >
                    <span>
                      <span className="font-semibold">{d.name}</span>
                      <span className="mt-0.5 block text-[11.5px] text-muted ltr-nums">
                        {d.suppressed
                          ? t('h04.suppressed')
                          : t('h04.peopleBurnout', {
                              n: d.headcount,
                              pct:
                                d.burnout_risk_pct != null
                                  ? Math.round(d.burnout_risk_pct)
                                  : '—',
                            })}
                      </span>
                    </span>
                    <span className="text-[17px] font-semibold ltr-nums">
                      {d.suppressed ? '—' : (d.empulse_score ?? '—')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {/* Department → teams */}
          <Card className="!rounded-[14px]">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
              {t('h04.colDept')}
            </p>
            {!deptId ? (
              <p className="mt-4 text-[13px] text-muted">{t('h04.pickDept')}</p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {data.teams.map((tm) => (
                  <li key={tm.id}>
                    <button
                      type="button"
                      onClick={() => setTeamId(tm.id)}
                      className={[
                        'flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-start text-[13px]',
                        teamId === tm.id
                          ? 'border-teal bg-teal-light/50'
                          : 'border-border bg-white',
                      ].join(' ')}
                    >
                      <span>
                        <span className="font-semibold">{tm.name}</span>
                        <span className="mt-0.5 block text-[11.5px] text-muted ltr-nums">
                          {tm.suppressed
                            ? t('h04.suppressed')
                            : t('h04.peopleBurnout', {
                                n: tm.headcount,
                                pct:
                                  tm.burnout_risk_pct != null
                                    ? Math.round(tm.burnout_risk_pct)
                                    : '—',
                              })}
                        </span>
                      </span>
                      <span className="text-[17px] font-semibold ltr-nums">
                        {tm.suppressed ? '—' : (tm.empulse_score ?? '—')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Team → employees */}
          <Card className="!rounded-[14px]">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
              {t('h04.colTeam')}
            </p>
            {!teamId ? (
              <p className="mt-4 text-[13px] text-muted">{t('h04.pickTeam')}</p>
            ) : membersForbidden ? (
              <p className="mt-4 text-[13px] text-muted">{t('h04.execNoPeople')}</p>
            ) : members.isLoading ? (
              <p className="mt-4 text-muted">{t('common.loading')}</p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {(members.data?.people ?? []).map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/hr/employees/${p.id}`}
                      className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-[13px]"
                    >
                      <span className="flex items-center gap-2">
                        <Avatar name={p.full_name} size="sm" />
                        <span className="font-semibold">{p.full_name}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[11px] ltr-nums">
                          {(p.performance_tier ?? '—').toUpperCase()}{' '}
                          {p.performance_score ?? '—'}
                        </span>
                        <span
                          className={[
                            'h-2 w-2 rounded-full',
                            p.wellbeing_alert ? 'bg-coral' : 'bg-teal',
                          ].join(' ')}
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {teamId && members.data ? (
              <p className="mt-3 text-[11px] text-faint">{t('h04.alphaNote')}</p>
            ) : null}
          </Card>

          {/* Right rail */}
          <div className="space-y-3">
            <Card className="!rounded-[14px]">
              <p className="text-[13px] font-semibold">
                {t('h04.selected', {
                  name: data.selected?.name ?? t('h04.noneSelected'),
                })}
              </p>
              {data.selected && !data.selected.suppressed ? (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                    <div>
                      <p className="font-mono text-[10px] text-muted">
                        {t('h04.kpiEmpulse')}
                      </p>
                      <p className="text-[20px] font-semibold ltr-nums">
                        {data.selected.empulse_score ?? '—'}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-muted">
                        {t('h04.kpiBurnout')}
                      </p>
                      <p className="text-[20px] font-semibold ltr-nums">
                        {data.selected.burnout_risk_pct != null
                          ? `${Math.round(data.selected.burnout_risk_pct)}%`
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-muted">
                        {t('h04.kpiEngagement')}
                      </p>
                      <p className="text-[20px] font-semibold ltr-nums">
                        {data.selected.engagement != null
                          ? Math.round(data.selected.engagement)
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-muted">
                        {t('h04.kpiPeople')}
                      </p>
                      <p className="text-[20px] font-semibold ltr-nums">
                        {data.selected.n ?? data.selected.headcount ?? '—'}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-faint">
                    {t('h04.wellbeingBeside')}:{' '}
                    <span className="ltr-nums">
                      {data.selected.wellbeing != null
                        ? Math.round(data.selected.wellbeing)
                        : '—'}
                    </span>
                  </p>
                  {data.selected.note === 'burnout_hotspot' ? (
                    <p className="mt-3 rounded-lg bg-coral-light/50 px-2.5 py-2 text-[12px] text-coral-dark">
                      {t('h04.hotspotNote')}
                    </p>
                  ) : null}
                  <Link
                    to="/hr/burnout"
                    className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-teal-dark"
                  >
                    {t('h04.openBurnout')}
                    <RtlFlip>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </RtlFlip>
                  </Link>
                </>
              ) : (
                <p className="mt-3 text-[13px] text-muted">
                  {data.selected?.suppressed
                    ? t('h04.suppressed')
                    : t('h04.pickDept')}
                </p>
              )}
            </Card>
            <Card className="!rounded-[14px]">
              <p className="text-[13px] font-semibold">{t('h04.drillPath')}</p>
              <ol className="mt-3 space-y-2 font-mono text-[11px] uppercase tracking-wide text-muted">
                <li>{t('h04.pathOrg')}</li>
                <li className="text-ink">
                  {data.selected?.department || '—'}
                </li>
                <li className="text-ink">
                  {teamId ? data.selected?.name || '—' : '—'}
                </li>
                <li>{t('h04.pathProfile')}</li>
              </ol>
              <Badge tone="slate" uppercase={false} className="mt-3">
                {t('h04.noRank')}
              </Badge>
            </Card>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}
