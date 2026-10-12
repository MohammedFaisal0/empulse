import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useHrMorale } from '../../api/hr'
import { RtlFlip } from '../../components/RtlFlip'
import { Badge, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { hrNav } from '../../layout/navConfigs'

function dotColor(v: number): string {
  if (v < 45) return 'bg-coral'
  if (v < 65) return 'bg-amber'
  if (v < 80) return 'bg-navy2'
  return 'bg-teal'
}

function cellTone(
  key: string,
  v: number | null | undefined,
): string {
  if (v == null) return 'bg-surface-3 text-faint'
  if (key === 'burnout_risk_pct') {
    if (v >= 50) return 'bg-coral/50 text-ink'
    if (v >= 40) return 'bg-amber/40 text-ink'
    return 'bg-teal/30 text-ink'
  }
  if (key === 'innovation') return 'bg-violet-light text-violet'
  if (v >= 80) return 'bg-teal/40 text-ink'
  if (v >= 65) return 'bg-navy2/10 text-ink'
  if (v >= 45) return 'bg-amber/30 text-ink'
  return 'bg-coral/40 text-ink'
}

export function H07OrganizationMorale() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useHrMorale()

  return (
    <AppShell
      config={hrNav}
      activePath="/hr/morale"
      chrome={{
        breadcrumbPrimary: t('h07.breadcrumbOrg'),
        breadcrumbPage: t('h07.title'),
      }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('h07.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('h07.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/hr/recognition"
            className="rounded-[11px] border border-border bg-white px-3.5 py-2 text-[14px] font-semibold"
          >
            {t('h07.whoRecognition')}
          </Link>
          <Link
            to="/hr/organization"
            className="inline-flex items-center gap-2 rounded-[11px] bg-navy px-3.5 py-2 text-[14px] font-semibold text-white"
          >
            {t('h07.explorePulse')}
            <RtlFlip>
              <ArrowRight className="h-4 w-4 text-teal-lighter" />
            </RtlFlip>
          </Link>
        </div>
      </div>

      {isLoading ? <p className="text-muted">{t('h07.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data ? (
        <>
          <Card className="mb-4 !rounded-[14px]">
            <h2 className="text-base font-semibold">{t('h07.spectrum')}</h2>
            <p className="text-[13px] text-muted">{t('h07.spectrumSub')}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted">
              <span>
                <span className="me-1 inline-block h-2 w-2 rounded-full bg-coral" />
                {'<45'}
              </span>
              <span>
                <span className="me-1 inline-block h-2 w-2 rounded-full bg-amber" />
                45–64
              </span>
              <span>
                <span className="me-1 inline-block h-2 w-2 rounded-full bg-navy2" />
                65–79
              </span>
              <span>
                <span className="me-1 inline-block h-2 w-2 rounded-full bg-teal" />
                80+
              </span>
            </div>
            <ul className="mt-4 space-y-3">
              {data.spectrum.slice(0, 12).map((row) => (
                <li
                  key={row.team_id}
                  className="grid items-center gap-3 border-b border-surface-2 pb-3 last:border-0 sm:grid-cols-[160px_1fr_auto]"
                >
                  <div>
                    <p className="text-[13px] font-semibold">{row.team}</p>
                    <p className="font-mono text-[11px] text-muted ltr-nums">
                      {t('h07.peopleN', { n: row.n })}
                    </p>
                  </div>
                  <div className="relative h-8 rounded bg-surface-3/60" dir="ltr">
                    {/* scale 0–100 */}
                    {row.dots.map((v, i) => (
                      <span
                        key={`${row.team_id}-${i}`}
                        className={[
                          'absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full opacity-80',
                          dotColor(v),
                        ].join(' ')}
                        style={{
                          left: `${Math.min(98, Math.max(1, v))}%`,
                          marginTop: `${((i % 5) - 2) * 2}px`,
                        }}
                      />
                    ))}
                    {row.morale_median != null ? (
                      <span
                        className="absolute top-0 h-full w-0.5 bg-ink"
                        style={{ left: `${row.morale_median}%` }}
                      />
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 text-[13px]">
                    <span className="font-semibold ltr-nums">
                      {row.morale_median ?? '—'}
                    </span>
                    <span
                      className={[
                        'font-mono text-[11px] ltr-nums',
                        (row.morale_delta_vs_aug ?? 0) >= 0
                          ? 'text-teal-dark'
                          : 'text-coral-dark',
                      ].join(' ')}
                    >
                      {row.morale_delta_vs_aug == null
                        ? '—'
                        : `${row.morale_delta_vs_aug >= 0 ? '+' : ''}${row.morale_delta_vs_aug} ${t('h07.vsAug')}`}
                    </span>
                    <Badge
                      tone={
                        row.status === 'needs_support'
                          ? 'coral'
                          : row.status === 'watch'
                            ? 'amber'
                            : 'teal'
                      }
                      uppercase={false}
                    >
                      {t(`h07.status.${row.status}`)}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
            {data.spectrum.length === 0 ? (
              <p className="mt-3 text-[13px] text-muted">{t('h07.allSuppressed')}</p>
            ) : null}
          </Card>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card className="!rounded-[14px] overflow-hidden">
              <h2 className="px-4 pt-4 text-base font-semibold">
                {t('h07.grid')}
              </h2>
              <p className="px-4 text-[13px] text-muted">{t('h07.gridSub')}</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="font-mono text-[10px] text-muted">
                      <th className="px-3 py-2 text-start">{t('h07.colTeam')}</th>
                      <th className="px-2 py-2">{t('h07.colMorale')}</th>
                      <th className="px-2 py-2">{t('h07.colEng')}</th>
                      <th className="px-2 py-2">{t('h07.colBurn')}</th>
                      <th className="px-2 py-2">{t('h07.colRecog')}</th>
                      <th className="px-2 py-2">{t('h07.colInnov')}</th>
                      <th className="px-2 py-2">{t('h07.colPerf')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.grid.slice(0, 16).map((g) => (
                      <tr key={g.team_id} className="border-t border-surface-2">
                        <td className="px-3 py-1.5 font-semibold">{g.team}</td>
                        {(
                          [
                            ['morale', g.morale],
                            ['engagement', g.engagement],
                            ['burnout_risk_pct', g.burnout_risk_pct],
                            ['recognition', g.recognition],
                            ['innovation', g.innovation],
                            ['performance', g.performance],
                          ] as const
                        ).map(([key, v]) => (
                          <td key={key} className="px-1 py-1.5 text-center">
                            <span
                              className={[
                                'inline-block min-w-[2.5rem] rounded px-1.5 py-0.5 font-mono ltr-nums',
                                cellTone(key, v),
                              ].join(' ')}
                            >
                              {v != null ? Math.round(v) : '—'}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="!rounded-[14px]">
              <h2 className="text-base font-semibold">{t('h07.needing')}</h2>
              <ul className="mt-3 space-y-3">
                {data.needing_support.map((n) => (
                  <li
                    key={n.team_id}
                    className="rounded-xl border border-border px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{n.team}</p>
                      <Badge
                        tone={n.status === 'needs_support' ? 'coral' : 'amber'}
                        uppercase={false}
                      >
                        {t('h07.moraleBadge', { n: n.morale ?? '—' })}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[12.5px] text-muted">
                      {n.detail_key === 'recognition_gap'
                        ? t('h07.detailRecog', { pct: n.recognition_pct ?? '—' })
                        : t('h07.detailBurnout', {
                            elevated: n.elevated ?? 0,
                            pct:
                              n.burnout_risk_pct != null
                                ? Math.round(n.burnout_risk_pct)
                                : '—',
                          })}
                    </p>
                    <Link
                      to={
                        n.detail_key === 'recognition_gap'
                          ? '/hr/interventions'
                          : '/hr/burnout'
                      }
                      className={[
                        'mt-2 inline-flex rounded-[11px] px-3 py-1.5 text-[13px] font-semibold text-white',
                        n.status === 'needs_support' ? 'bg-coral-dark' : 'bg-teal-dark',
                      ].join(' ')}
                    >
                      {n.detail_key === 'recognition_gap'
                        ? t('h07.startIntervention')
                        : t('h07.viewRoot')}
                    </Link>
                  </li>
                ))}
              </ul>
              {data.needing_support.length === 0 ? (
                <p className="mt-3 text-[13px] text-muted">{t('h07.noneNeeding')}</p>
              ) : null}
              <p className="mt-4 text-[11px] text-faint">{t('h07.privacy')}</p>
            </Card>
          </div>
        </>
      ) : null}
    </AppShell>
  )
}
