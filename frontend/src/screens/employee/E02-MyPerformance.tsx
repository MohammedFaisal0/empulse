import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useMePerformance } from '../../api/me'
import { Badge, Button, Card, Medallion, ProgressBar } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { employeeNav } from '../../layout/navConfigs'

function tierOf(raw: string): 'gold' | 'silver' | 'bronze' | 'growth' {
  const t = raw.toLowerCase()
  if (t === 'gold' || t === 'silver' || t === 'bronze' || t === 'growth') return t
  return 'growth'
}

const SLIDER_KEYS = ['innovation', 'collaboration', 'engagement'] as const

export function E02MyPerformance() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useMePerformance()
  const cur = data?.current
  const dims = cur?.dimensions

  const base = useMemo(
    () => ({
      innovation: dims?.innovation ?? 70,
      collaboration: dims?.collaboration ?? 70,
      engagement: dims?.engagement ?? 70,
    }),
    [dims],
  )
  const [sliders, setSliders] = useState(base)
  useEffect(() => {
    setSliders(base)
  }, [base])

  const weights = { innovation: 0.15, collaboration: 0.15, engagement: 0.15 }
  const projected = useMemo(() => {
    if (!cur || !dims) return null
    const score = cur.performance_score
    let delta = 0
    for (const k of SLIDER_KEYS) {
      const now = dims[k] ?? base[k]
      delta += ((sliders[k] - now) * weights[k]) / 0.7 // rough private what-if
    }
    const exact = Math.min(100, Math.max(0, score + delta))
    return { exact: Math.round(exact * 100) / 100, rounded: Math.round(exact) }
  }, [cur, dims, sliders, base])

  const maxBar = 100

  return (
    <AppShell
      config={employeeNav}
      activePath="/employee/performance"
      chrome={{
        breadcrumbPrimary: data
          ? `${data.full_name} · ${data.team ?? ''}`
          : undefined,
        breadcrumbPage: t('e02.title'),
      }}
    >
      <div className="mb-5">
        <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
          {t('e02.title')}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t('e02.subtitle')}</p>
        <p className="mt-1 text-xs font-semibold text-teal-dark">{t('e02.noRank')}</p>
      </div>

      {isLoading ? <p className="text-muted">{t('e02.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data && cur ? (
        <>
          <div className="mb-4 grid gap-4 lg:grid-cols-[340px_1fr]">
            <Card className="!rounded-2xl !bg-navy !text-white">
              <p className="font-mono text-[10.5px] text-white/60">
                {t('e02.yourTier')}
              </p>
              <div className="mt-4 flex justify-center">
                <Medallion
                  score={cur.performance_score}
                  tier={tierOf(cur.performance_tier)}
                  size="lg"
                />
              </div>
              <p className="mt-3 text-center text-[13px] text-white/80">
                {t('e02.tierLine', {
                  tier: cur.performance_tier.toUpperCase(),
                  score: cur.performance_score,
                })}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {(data.recognitions.length
                  ? data.recognitions
                  : data.recognition_types.map((type, i) => ({
                      id: i,
                      type,
                      message: '',
                      created_at: '',
                    }))
                )
                  .slice(0, 4)
                  .map((r) => (
                    <Badge key={r.id} tone="violet" uppercase={false}>
                      {r.type}
                    </Badge>
                  ))}
              </div>
              {data.recognitions[0]?.message ? (
                <p className="mt-3 text-[11.5px] text-white/70">
                  “{data.recognitions[0].message}”
                  {data.recognitions[0].giver_first_name
                    ? ` — ${data.recognitions[0].giver_first_name}`
                    : ''}
                </p>
              ) : null}
              <p className="mt-4 text-[11.5px] text-white/60">{t('e02.identityNote')}</p>
            </Card>

            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('e02.journey')}</h2>
              <p className="mt-1 text-[13px] text-muted">
                {data.own_trend
                  ? t('e02.journeySubTrend', {
                      delta:
                        data.own_trend.delta >= 0
                          ? `+${data.own_trend.delta}`
                          : String(data.own_trend.delta),
                      from: data.own_trend.from_month.slice(5),
                      best: data.own_trend.personal_best
                        ? t('e02.personalBest')
                        : '',
                    })
                  : t('e02.journeySub')}
              </p>
              <div className="mt-6 flex items-end justify-between gap-2">
                {data.journey.map((m, i) => {
                  const h = Math.max(20, (m.score / maxBar) * 120)
                  const last = i === data.journey.length - 1
                  return (
                    <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[11px] font-semibold ltr-nums">
                        {Math.round(m.score)}
                      </span>
                      <div
                        className={`w-8 rounded-t-md ${last ? 'bg-teal' : 'bg-border-blue'}`}
                        style={{ height: h }}
                      />
                      <span className="font-mono text-[9px] text-muted">
                        {m.month.slice(5)}
                      </span>
                    </div>
                  )
                })}
              </div>
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
            </Card>
          </div>

          <Card className="mb-4 !rounded-2xl">
            <h2 className="text-base font-semibold">{t('e02.dimTrends')}</h2>
            <p className="mt-1 text-[13px] text-muted">{t('e02.dimTrendsSub')}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ['task_completion', dims?.task_completion],
                  ['attendance', dims?.attendance],
                  ['professionalism', dims?.professionalism],
                  ['innovation', dims?.innovation],
                  ['collaboration', dims?.collaboration],
                  ['digital', dims?.digital],
                  ['engagement', dims?.engagement],
                  ['wellbeing', dims?.wellbeing],
                ] as const
              ).map(([id, value]) => (
                <div key={id}>
                  <div className="mb-1 flex justify-between text-[13px]">
                    <span>{t(`e02.dim.${id}`)}</span>
                    <span className="ltr-nums font-mono">
                      {value == null ? '—' : Math.round(value)}
                      {id === 'wellbeing' ? (
                        <span className="ms-1 text-faint">({t('e02.notScored')})</span>
                      ) : null}
                    </span>
                  </div>
                  {value == null ? (
                    <p className="text-[11px] text-faint">{t('common.notCollected')}</p>
                  ) : (
                    <ProgressBar
                      value={value}
                      tone={id === 'wellbeing' ? 'coral' : 'teal'}
                    />
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="!rounded-2xl !bg-violet-light/40">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">{t('e02.planner')}</h2>
                <p className="mt-1 text-[13px] text-muted">{t('e02.plannerSub')}</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => setSliders(base)}
              >
                {t('e02.reset')}
              </Button>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
              <div className="space-y-5">
                {SLIDER_KEYS.map((k) => (
                  <label key={k} className="block text-[13px]">
                    <div className="mb-1 flex justify-between">
                      <span className="font-semibold">{t(`e02.dim.${k}`)}</span>
                      <span className="font-mono text-[11px] text-teal-dark ltr-nums">
                        {Math.round(base[k])} → {Math.round(sliders[k])}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={100}
                      value={sliders[k]}
                      onChange={(e) =>
                        setSliders((s) => ({
                          ...s,
                          [k]: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-teal-dark"
                    />
                  </label>
                ))}
              </div>
              <div className="rounded-2xl bg-navy p-5 text-center text-white">
                <p className="font-mono text-[10px] tracking-wide text-white/60">
                  {t('common.projected').toUpperCase()}
                </p>
                <p className="mt-2 text-[48px] font-semibold ltr-nums">
                  {projected?.rounded ?? '—'}
                </p>
                <p className="font-mono text-tier-gold">
                  {(projected?.rounded ?? 0) >= 90 ? 'GOLD' : cur.performance_tier.toUpperCase()}
                </p>
                <p className="mt-2 font-mono text-[10px] text-white/60">
                  EXACT {projected?.exact ?? '—'}
                </p>
                <p className="mt-3 text-[11px] text-white/50">{t('e02.privateWhatIf')}</p>
              </div>
            </div>
          </Card>
        </>
      ) : null}
    </AppShell>
  )
}
