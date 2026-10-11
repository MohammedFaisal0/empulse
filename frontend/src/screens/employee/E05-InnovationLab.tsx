import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useMeInnovationLab, useSubmitIdea } from '../../api/me'
import { Badge, Button, Card, ProgressBar } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { employeeNav } from '../../layout/navConfigs'

export function E05InnovationLab() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useMeInnovationLab()
  const submit = useSubmitIdea()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Process')
  const [cost, setCost] = useState('40000')
  const [savings, setSavings] = useState('150000')
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof submit.mutateAsync>
  > | null>(null)

  const costN = Number(cost) || 0
  const savingsN = Number(savings) || 0
  const roi = costN > 0 ? Math.round((savingsN / costN) * 100) / 100 : null

  async function onSubmit() {
    if (!title.trim()) return
    const res = await submit.mutateAsync({
      title: title.trim(),
      category,
      expected_cost_sar: costN,
      expected_savings_sar: savingsN,
    })
    setResult(res)
  }

  return (
    <AppShell
      config={employeeNav}
      activePath="/employee/innovation-lab"
      chrome={{
        breadcrumbPrimary: data?.full_name,
        breadcrumbPage: t('e05.title'),
      }}
    >
      <div className="mb-5">
        <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
          {t('e05.title')}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t('e05.subtitle')}</p>
      </div>

      {isLoading ? <p className="text-muted">{t('e05.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_390px]">
        <div className="space-y-4">
          <Card className="!rounded-2xl">
            <h2 className="text-base font-semibold">{t('e05.step1')}</h2>
            <label className="mt-3 block text-[13px]">
              <span className="mb-1 block font-semibold">{t('e05.titleField')}</span>
              <input
                className="w-full rounded-[10px] border border-border px-3 py-2.5"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('e05.titlePh')}
              />
            </label>
            <label className="mt-3 block text-[13px]">
              <span className="mb-1 block font-semibold">{t('e05.category')}</span>
              <select
                className="w-full rounded-[10px] border border-border px-3 py-2.5"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Process">{t('e05.catProcess')}</option>
                <option value="Product">{t('e05.catProduct')}</option>
                <option value="People">{t('e05.catPeople')}</option>
                <option value="Technology">{t('e05.catTech')}</option>
              </select>
            </label>
          </Card>

          <Card className="!rounded-2xl">
            <h2 className="text-base font-semibold">{t('e05.step2')}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="text-[13px]">
                <span className="mb-1 block font-semibold">{t('e05.cost')}</span>
                <input
                  className="w-full rounded-[10px] border border-border px-3 py-2.5 ltr-nums"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </label>
              <label className="text-[13px]">
                <span className="mb-1 block font-semibold">{t('e05.savings')}</span>
                <input
                  className="w-full rounded-[10px] border border-border px-3 py-2.5 ltr-nums"
                  value={savings}
                  onChange={(e) => setSavings(e.target.value)}
                />
              </label>
              <div className="rounded-[10px] bg-teal-light px-3 py-2">
                <p className="text-[12.5px] font-semibold">{t('e05.duration')}</p>
                <p className="mt-2 text-[13px] text-faint">{t('common.notCollected')}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-[10px] bg-teal-light px-3.5 py-3.5">
              <span className="text-[13px] text-teal-dark">{t('e05.roi')}</span>
              <span className="text-2xl font-semibold text-teal-dark ltr-nums">
                {roi != null ? `${roi}×` : '—'}
              </span>
              <span className="font-mono text-[10px] text-muted">
                {t('e05.roiNote')}
              </span>
            </div>
          </Card>

          <Card className="!rounded-2xl">
            <h2 className="text-base font-semibold">{t('e05.step3')}</h2>
            <div className="mt-3 rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <p className="text-[12.5px] font-semibold">{t('e05.drop')}</p>
              <p className="mt-1 text-[10.5px] text-muted">{t('e05.formats')}</p>
              <p className="mt-2 text-[11px] text-faint">{t('common.notCollected')}</p>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-muted">{t('e05.draftHint')}</p>
              <Button
                variant="primary"
                disabled={!title.trim() || submit.isPending}
                onClick={() => void onSubmit()}
              >
                {t('e05.submit')}
              </Button>
            </div>
            {submit.isError ? (
              <p className="mt-2 text-[13px] text-coral-dark">{t('common.error')}</p>
            ) : null}
            {result ? (
              <p className="mt-2 text-[13px] text-teal-dark">
                {t('e05.submitted', { id: result.display_id })}
              </p>
            ) : null}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="!rounded-2xl !bg-navy !text-white">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[15px] font-semibold">{t('e05.pulseaiLive')}</p>
              <Badge tone="teal" uppercase={false}>
                {result?.pulseai.projected
                  ? t('common.projected')
                  : t('e05.updating')}
              </Badge>
            </div>
            {result?.pulseai ? (
              <>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-[7px] border-teal text-2xl font-semibold ltr-nums">
                    {result.pulseai.readiness}
                  </div>
                  <div>
                    <p className="font-semibold">{t('e05.readinessStrong')}</p>
                    <p className="text-[11.5px] text-white/66">
                      {t('e05.readinessBody')}
                    </p>
                  </div>
                </div>
                <p className="mt-3 font-mono text-[10px] text-amber">
                  {t('e05.stubNote')}
                </p>
              </>
            ) : (
              <p className="mt-4 text-[13px] text-white/70">{t('e05.pulseaiIdle')}</p>
            )}
          </Card>

          <Card className="!rounded-2xl">
            <h2 className="text-base font-semibold">{t('e05.aiDims')}</h2>
            {result?.pulseai ? (
              <ul className="mt-3 space-y-4">
                {(
                  [
                    ['novelty', result.pulseai.novelty],
                    ['feasibility', result.pulseai.feasibility],
                    ['expected_value', result.pulseai.expected_value],
                    ['potential_impact', result.pulseai.potential_impact],
                  ] as const
                ).map(([key, value]) => (
                  <li key={key}>
                    <div className="mb-1 flex justify-between text-[12.5px]">
                      <span className="font-semibold">{t(`e05.dim.${key}`)}</span>
                      <span className="font-mono text-violet ltr-nums">{value}</span>
                    </div>
                    <ProgressBar value={value} tone="violet" />
                    <p className="mt-1 text-[11px] text-muted">
                      {t(`e05.dimHelp.${key}`)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">{t('e05.aiIdle')}</p>
            )}
          </Card>

          <Card className="!rounded-2xl">
            <h2 className="text-base font-semibold">{t('e05.yourRoi')}</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-[10px] bg-teal-light p-3">
                <p className="text-[11px] text-muted">{t('e05.yourRoi')}</p>
                <p className="text-2xl font-semibold text-teal-dark ltr-nums">
                  {roi != null ? `${roi}×` : '—'}
                </p>
              </div>
              <div className="rounded-[10px] bg-violet-light p-3">
                <p className="text-[11px] text-muted">{t('e05.aiRoi')}</p>
                <p className="text-2xl font-semibold text-violet ltr-nums">
                  {result?.pulseai.roi_estimate != null
                    ? `${result.pulseai.roi_estimate}×`
                    : '—'}
                </p>
                <p className="text-[10px] text-amber-dark">{t('common.projected')}</p>
              </div>
            </div>
          </Card>

          <Card className="!rounded-2xl">
            <h2 className="text-base font-semibold">{t('e05.recent')}</h2>
            <ul className="mt-2 space-y-2 text-[13px]">
              {(data?.ideas ?? []).slice(0, 4).map((idea) => (
                <li key={idea.id} className="rounded-lg border border-border px-3 py-2">
                  <p className="font-mono text-[10px] text-muted">{idea.display_id}</p>
                  <p className="font-semibold">{idea.title}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
