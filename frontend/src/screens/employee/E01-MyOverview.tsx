import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useMeOverview } from '../../api/me'
import { Badge, Button, Card, Medallion } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { employeeNav } from '../../layout/navConfigs'
import { colors } from '../../theme/colors'

function tierOf(raw: string): 'gold' | 'silver' | 'bronze' | 'growth' {
  const t = raw.toLowerCase()
  if (t === 'gold' || t === 'silver' || t === 'bronze' || t === 'growth') return t
  return 'growth'
}

export function E01MyOverview() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useMeOverview()
  const cur = data?.current
  const dims = cur?.dimensions

  const pulsePoints = dims
    ? [
        { key: 'PERF', value: dims.task_completion },
        { key: 'INNOV', value: dims.innovation },
        { key: 'COLLAB', value: dims.collaboration },
        { key: 'PROF', value: dims.professionalism },
        { key: 'DIGITAL', value: dims.digital },
        { key: 'ENGAGE', value: dims.engagement },
        { key: 'WELL', value: dims.wellbeing },
      ]
    : []

  const chartData = (data?.trajectory ?? []).slice(-12).map((w) => ({
    label: w.week_start.slice(5),
    performance: w.performance_score,
    wellbeing: w.wellbeing_score,
    engagement: w.engagement_score,
  }))

  return (
    <AppShell
      config={employeeNav}
      activePath="/employee/overview"
      chrome={{
        breadcrumbPrimary: data
          ? `${data.full_name} · ${data.team ?? data.department}`
          : undefined,
        breadcrumbPage: t('e01.title'),
      }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('e01.greeting', { name: data?.first_name ?? '—' })}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('e01.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/employee/pulseai">
            <Button variant="secondary">{t('e01.askPulse')}</Button>
          </Link>
          <Button variant="accent">{t('e01.shareCheckin')}</Button>
        </div>
      </div>

      {isLoading ? <p className="text-muted">{t('e01.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data && cur ? (
        <>
          <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_330px]">
            <Card className="!rounded-2xl">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold">{t('e01.myPulse')}</h2>
                <Link
                  to="/employee/twin"
                  className="text-[13px] font-semibold text-teal-dark"
                >
                  {t('e01.howMeasured')}
                </Link>
              </div>
              <div className="flex flex-wrap gap-3">
                {pulsePoints.map((p) => (
                  <div key={p.key} className="min-w-[72px] text-center">
                    <p className="ltr-nums text-lg font-semibold">
                      {p.value == null ? '—' : Math.round(p.value)}
                    </p>
                    <p className="font-mono text-[9px] text-muted">{p.key}</p>
                    {p.value == null ? (
                      <p className="text-[10px] text-faint">{t('common.notCollected')}</p>
                    ) : null}
                    {p.key === 'WELL' ? (
                      <p className="text-[10px] text-faint">{t('e01.notScored')}</p>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="mt-4 h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="label" hide />
                    <YAxis domain={[40, 100]} hide />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="performance"
                      stroke={colors.tealDark}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="teal">{t('e01.thriving')}</Badge>
                <p className="text-xs text-muted">{t('e01.pulseNote')}</p>
              </div>
            </Card>

            <Card className="!rounded-2xl !bg-navy !text-white">
              <p className="font-mono text-[10.5px] tracking-wide text-white/60">
                {t('e01.empulseTier')}
              </p>
              <div className="mt-4 flex justify-center">
                <Medallion
                  score={cur.performance_score}
                  tier={tierOf(cur.performance_tier)}
                  size="lg"
                />
              </div>
              <p className="mt-3 text-center text-[13px] text-white/80">
                {t('e01.tierSummary', { score: cur.performance_score })}
              </p>
              <p className="mt-2 text-center text-xs text-white/60">
                {cur.points_to_next_tier > 0
                  ? t('e01.toGold', { n: cur.points_to_next_tier })
                  : t('e01.atGold')}
                <span className="ms-2 font-mono text-tier-gold">
                  {cur.performance_score} / 90
                </span>
              </p>
              {cur.performance_delta != null ? (
                <p className="mt-2 text-center text-sm font-semibold text-teal">
                  {cur.performance_delta >= 0 ? '↑' : '↓'}{' '}
                  {Math.abs(cur.performance_delta)}
                </p>
              ) : null}
            </Card>
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('e01.whatChanged')}</h2>
              <p className="mt-1 text-[13px] text-muted">{t('e01.whatChangedSub')}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {(data.changes ?? []).map((c) => (
                  <div key={c.metric} className="rounded-[10px] bg-surface p-3">
                    <p className="text-xs text-muted">{t(`e01.metric.${c.metric}`)}</p>
                    <p className="mt-1 text-[15px] font-semibold ltr-nums">
                      {c.from}
                      {c.unit} → {c.to}
                      {c.unit}
                    </p>
                    <p
                      className={`mt-1 text-[11px] font-semibold ${
                        c.delta >= 0 ? 'text-teal-dark' : 'text-coral-dark'
                      }`}
                    >
                      {c.delta >= 0 ? '↑' : '↓'} {Math.abs(c.delta)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('e01.pathGold')}</h2>
              <p className="mt-1 text-[13px] text-muted">
                {t('e01.pathGoldSub', {
                  score: cur.performance_score,
                  n: cur.points_to_next_tier,
                })}
              </p>
              <div className="mt-4 flex h-3.5 overflow-hidden rounded-full">
                <div className="w-1/3 bg-tier-bronze/50" />
                <div className="w-1/3 bg-border-blue" />
                <div className="w-1/3 bg-tier-gold/80" />
              </div>
              <div className="mt-1 flex justify-between font-mono text-[10px] text-muted">
                <span>BRONZE 70</span>
                <span>SILVER 80</span>
                <span>YOU · {cur.performance_score}</span>
                <span>GOLD 90</span>
              </div>
              <p className="mt-3 text-[11px] text-faint">{t('e01.neverRank')}</p>
              <Link
                to="/employee/performance"
                className="mt-2 inline-block text-[13px] font-semibold text-teal-dark"
              >
                {t('e01.openPlanner')}
              </Link>
            </Card>
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-3">
            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('e01.balance')}</h2>
              <p className="mt-1 text-[13px] text-muted">{t('e01.balanceSub')}</p>
              <p className="mt-4 text-[22px] font-semibold ltr-nums">
                {data.balance.work_hours != null
                  ? `${data.balance.work_hours} h`
                  : '—'}
              </p>
              {data.balance.work_hours_projected ? (
                <p className="text-[11px] text-amber-dark">{t('common.projected')}</p>
              ) : null}
              <ul className="mt-3 space-y-2 text-[13px]">
                <li className="flex justify-between border-b border-border py-2">
                  <span>{t('e01.focus')}</span>
                  <span className="text-faint">
                    {data.balance.focus_hours ?? '—'}{' '}
                    <span className="text-[10px]">{t('common.notCollected')}</span>
                  </span>
                </li>
                <li className="flex justify-between border-b border-border py-2">
                  <span>{t('e01.meetings')}</span>
                  <span className="text-faint">
                    {data.balance.meeting_hours ?? '—'}{' '}
                    <span className="text-[10px]">{t('common.notCollected')}</span>
                  </span>
                </li>
                <li className="flex justify-between py-2">
                  <span>{t('e01.afterHours')}</span>
                  <span className="ltr-nums font-semibold">
                    {data.balance.after_hours != null
                      ? `${data.balance.after_hours} h`
                      : '—'}
                  </span>
                </li>
              </ul>
            </Card>

            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('e01.checkin')}</h2>
              <p className="mt-1 text-[13px] text-muted">{t('e01.checkinSub')}</p>
              <p className="mt-4 text-sm text-muted">{t('common.notCollected')}</p>
              <p className="mt-2 text-[11px] text-faint">{t('e01.checkinPrivacy')}</p>
            </Card>

            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('e01.nextGrowth')}</h2>
              <p className="mt-1 text-[13px] text-muted">{t('e01.nextGrowthSub')}</p>
              <Link
                to="/employee/growth"
                className="mt-3 inline-block text-[13px] font-semibold text-teal-dark"
              >
                {t('e01.growthPath')}
              </Link>
              <p className="mt-3 text-[11px] text-faint">{t('common.notCollected')}</p>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('e01.recognition')}</h2>
              <ul className="mt-3 space-y-2">
                {data.recognitions.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-border px-3 py-2 text-[13px]"
                  >
                    <p className="font-semibold text-violet">{r.type}</p>
                    <p className="text-muted">— {r.giver_name}</p>
                  </li>
                ))}
                {data.recognitions.length === 0 ? (
                  <li className="text-muted">{t('e01.noRecognition')}</li>
                ) : null}
              </ul>
            </Card>

            <Card className="!rounded-2xl">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold">{t('e01.ideas')}</h2>
                <Link
                  to="/employee/innovation-lab"
                  className="text-[13px] font-semibold text-teal-dark"
                >
                  {t('e01.submitIdea')}
                </Link>
              </div>
              <ul className="mt-3 space-y-2">
                {data.ideas.slice(0, 3).map((idea) => (
                  <li
                    key={idea.id}
                    className="rounded-xl bg-surface px-3 py-2 text-[13px]"
                  >
                    <p className="font-mono text-[10px] text-muted">
                      {idea.display_id}
                    </p>
                    <p className="font-semibold">{idea.title}</p>
                    <p className="text-xs text-muted">
                      {idea.status}
                      {idea.realized_value_sar
                        ? ` · SAR ${Math.round(idea.realized_value_sar / 1000)}K`
                        : ''}
                    </p>
                  </li>
                ))}
                {data.ideas.length === 0 ? (
                  <li className="text-muted">{t('e01.noIdeas')}</li>
                ) : null}
              </ul>
            </Card>
          </div>

          <p className="mt-6 text-[12px] text-faint">{t('e01.privacyFooter')}</p>
        </>
      ) : null}
    </AppShell>
  )
}
