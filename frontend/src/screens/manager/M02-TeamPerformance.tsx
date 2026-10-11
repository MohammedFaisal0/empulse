import { ArrowRight } from 'lucide-react'
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

import { useManagerTeam } from '../../api/manager'
import { RtlFlip } from '../../components/RtlFlip'
import { Badge, Button, Card, Medallion, ProgressBar } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { managerNav } from '../../layout/navConfigs'
import { colors } from '../../theme/colors'

export function M02TeamPerformance() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useManagerTeam()
  const agg = data?.aggregates

  const chartData = (data?.trend ?? []).map((w) => ({
    label: w.week_start.slice(5),
    score: w.performance_score,
  }))

  const dims =
    agg && !agg.suppressed
      ? [
          {
            id: 'task',
            label: t('m02.dimTask'),
            value: agg.dimensions.task_completion,
            weight: 25,
          },
          {
            id: 'attendance',
            label: t('m02.dimAttendance'),
            value: agg.dimensions.attendance,
            weight: 15,
            todo: true,
          },
          {
            id: 'behaviour',
            label: t('m02.dimBehaviour'),
            value: agg.dimensions.professionalism,
            weight: 15,
            todo: true,
          },
          {
            id: 'innovation',
            label: t('m02.dimInnovation'),
            value: agg.dimensions.innovation,
            weight: 10,
          },
          {
            id: 'collab',
            label: t('m02.dimCollab'),
            value: agg.dimensions.collaboration,
            weight: 10,
          },
          {
            id: 'digital',
            label: t('m02.dimDigital'),
            value: agg.dimensions.digital,
            weight: 10,
            todo: true,
          },
          {
            id: 'engagement',
            label: t('m02.dimEngagement'),
            value: agg.dimensions.engagement,
            weight: 5,
          },
          {
            id: 'wellbeing',
            label: t('m02.dimWellbeing'),
            value: agg.dimensions.wellbeing,
            weight: 0,
          },
        ]
      : []

  return (
    <AppShell
      config={managerNav}
      activePath="/manager/performance"
      attentionCount={data?.attention_count}
      chrome={{ breadcrumbPage: t('m02.title') }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('m02.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('m02.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">{t('m02.export')}</Button>
          <Link
            to="/manager/pulse"
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-navy px-3.5 text-[13px] font-semibold text-white"
          >
            {t('m02.teamPulse')}
            <RtlFlip>
              <ArrowRight className="h-4 w-4 text-teal" />
            </RtlFlip>
          </Link>
        </div>
      </div>

      {isLoading ? <p className="text-muted">{t('m02.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('errors.error.unknown')}</p> : null}

      {agg?.suppressed ? (
        <Card>
          <p className="text-muted">{t('m02.suppressed')}</p>
        </Card>
      ) : null}

      {agg && !agg.suppressed ? (
        <>
          <Card className="mb-4 border-teal/30 bg-teal-light/40">
            <p className="text-[13px] text-ink">{t('m02.insight')}</p>
            <p className="mt-1 text-xs text-muted">{t('m02.insightSub')}</p>
          </Card>

          <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_220px]">
            <Card>
              <h2 className="mb-3 text-sm font-semibold">{t('m02.thisMonth')}</h2>
              <div className="space-y-3">
                {dims.map((d) => (
                  <div key={d.id}>
                    <div className="mb-1 flex justify-between text-[13px]">
                      <span>
                        {d.label}
                        <span className="ms-2 font-mono text-[10px] text-muted">
                          {d.weight}%
                        </span>
                      </span>
                      <span className="ltr-nums font-mono">
                        {d.value == null ? '—' : Math.round(d.value)}
                        {d.weight === 0 ? (
                          <span className="ms-1 text-faint">({t('m02.notScored')})</span>
                        ) : null}
                      </span>
                    </div>
                    {d.value == null ? (
                      <p className="text-[11px] text-faint">{t('common.notCollected')}</p>
                    ) : (
                      <ProgressBar
                        value={d.value}
                        tone={d.id === 'wellbeing' ? 'coral' : 'teal'}
                      />
                    )}
                  </div>
                ))}
              </div>
            </Card>
            <div className="space-y-3">
              <Card className="bg-navy text-white">
                <p className="font-mono text-[10px] tracking-wide text-faint">
                  {t('m02.empulseTier')}
                </p>
                <div className="mt-3 flex justify-center">
                  <Medallion
                    score={Math.round(agg.empulse_score ?? 0)}
                    tier={agg.empulse_tier as 'gold' | 'silver' | 'bronze' | 'growth'}
                  />
                </div>
                <p className="mt-2 text-center text-sm font-bold uppercase">
                  {agg.empulse_tier}
                </p>
              </Card>
              <Card>
                <p className="mb-2 font-mono text-[10px] tracking-wide text-muted">
                  {t('m02.tierMix')}
                </p>
                <p className="mb-2 text-[11px] text-muted">{t('m02.tierMixNote')}</p>
                {Object.entries(agg.tier_mix).map(([tier, count]) => (
                  <div
                    key={tier}
                    className="flex justify-between border-b border-surface-2 py-1.5 text-[13px]"
                  >
                    <Badge tone="slate">{tier}</Badge>
                    <span className="ltr-nums font-mono">{count}</span>
                  </div>
                ))}
              </Card>
            </div>
          </div>

          <Card>
            <h2 className="mb-3 text-sm font-semibold">{t('m02.trend')}</h2>
            <div className="h-56" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={colors.tealDark}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11.5px] text-muted">{t('m02.wellbeingFootnote')}</p>
          </Card>
        </>
      ) : null}
    </AppShell>
  )
}
