import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useMeInnovationDna } from '../../api/me'
import { Badge, Button, Card, ProgressBar } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { employeeNav } from '../../layout/navConfigs'

const STATUS_STEPS = [
  'submitted',
  'under_review',
  'approved',
  'implemented',
] as const

export function E04MyInnovationDna() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useMeInnovationDna()

  return (
    <AppShell
      config={employeeNav}
      activePath="/employee/innovation-dna"
      chrome={{
        breadcrumbPrimary: data?.full_name,
        breadcrumbPage: t('e04.title'),
      }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('e04.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('e04.subtitle')}</p>
          <p className="mt-1 text-xs font-semibold text-teal-dark">{t('e04.noRank')}</p>
        </div>
        <Link to="/employee/innovation-lab">
          <Button variant="primary">{t('e04.submitIdea')}</Button>
        </Link>
      </div>

      {isLoading ? <p className="text-muted">{t('e04.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data ? (
        <>
          <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_340px]">
            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('e04.traitsTitle')}</h2>
              <p className="mt-1 text-[13px] text-muted">{t('e04.traitsSub')}</p>
              <ul className="mt-4 space-y-3">
                {data.traits.map((trait) => (
                  <li key={trait.id}>
                    <div className="mb-1 flex justify-between text-[13px]">
                      <span>{t(`e04.trait.${trait.id}`)}</span>
                      <span className="ltr-nums font-semibold">
                        {trait.score == null ? '—' : Math.round(trait.score)}
                        {trait.projected ? (
                          <span className="ms-1 text-[10px] font-normal text-amber-dark">
                            {t('common.projected')}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    {trait.score == null ? (
                      <p className="text-[11px] text-faint">{t('common.notCollected')}</p>
                    ) : (
                      <ProgressBar value={trait.score} tone="violet" />
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-faint">{t('e04.noMedian')}</p>
            </Card>

            <Card className="!rounded-2xl !bg-navy !text-white">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="violet" uppercase>
                  {t('e04.signature')}
                </Badge>
                {data.signature?.is_example ? (
                  <Badge tone="amber" uppercase={false}>
                    {t('e04.signatureExample')}
                  </Badge>
                ) : null}
              </div>
              <h2 className="mt-4 text-[22px] font-semibold leading-snug">
                {data.signature && !data.signature.is_example && data.signature.trait_id
                  ? t('e04.signatureTitle', {
                      trait: t(`e04.trait.${data.signature.trait_id}`),
                    })
                  : t('e04.signatureFallback')}
              </h2>
              <p className="mt-3 text-[13px] text-white/70">
                {data.signature?.is_example
                  ? t('e04.signatureExampleNote')
                  : t('e04.signatureBody', {
                      trait: data.signature?.trait_id
                        ? t(`e04.trait.${data.signature.trait_id}`)
                        : '—',
                      scorePart:
                        data.signature?.score != null
                          ? t('e04.signatureScorePart', {
                              score: Math.round(data.signature.score),
                            })
                          : '',
                      skills:
                        data.signature?.skills?.length
                          ? data.signature.skills.join(', ')
                          : t('common.notCollected'),
                      ideas: data.signature?.ideas_count ?? data.ideas.length,
                    })}
              </p>
              {data.innovation_score != null ? (
                <p className="mt-6 text-teal">
                  <span className="font-mono text-[10px] text-white/50">
                    {t('e04.innovScore')}
                  </span>
                  <br />
                  <span className="text-2xl font-semibold ltr-nums">
                    {Math.round(data.innovation_score)}
                  </span>
                </p>
              ) : null}
            </Card>
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('e04.strengthTitle')}</h2>
              <p className="mt-2 text-[13px] text-muted">
                {data.strongest && data.strongest.score != null
                  ? t('e04.strengthBody', {
                      trait: t(`e04.trait.${data.strongest.id}`),
                      score: Math.round(data.strongest.score),
                      n: data.ideas_submitted_12m,
                    })
                  : t('common.notCollected')}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="teal" uppercase={false}>
                  {t('e04.ideasCount', { n: data.ideas.length })}
                </Badge>
              </div>
            </Card>
            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('e04.devTitle')}</h2>
              <p className="mt-2 text-[13px] text-muted">
                {data.development && data.development.score != null
                  ? t('e04.devBody', {
                      trait: t(`e04.trait.${data.development.id}`),
                      score: Math.round(data.development.score),
                    })
                  : t('common.notCollected')}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/employee/innovation-lab">
                  <Button variant="primary" className="!bg-violet">
                    {t('e04.joinBuild')}
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          <Card className="!rounded-2xl">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">{t('e04.journeyTitle')}</h2>
                <p className="mt-1 text-[13px] text-muted">{t('e04.journeySub')}</p>
              </div>
              <Link
                to="/employee/innovation-lab"
                className="text-[13px] font-semibold text-teal-dark"
              >
                {t('e04.submitIdea')}
              </Link>
            </div>
            <div className="mb-4 flex flex-wrap gap-1">
              {STATUS_STEPS.map((s) => (
                <span
                  key={s}
                  className="rounded-lg bg-violet-light px-3 py-1.5 font-mono text-[9.5px] text-violet"
                >
                  {t(`e04.stage.${s}`)}
                </span>
              ))}
            </div>
            <ul className="space-y-2">
              {data.ideas.map((idea) => (
                <li
                  key={idea.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2.5 text-[13px]"
                >
                  <div>
                    <p className="font-mono text-[10px] text-muted">
                      {idea.display_id}
                    </p>
                    <p className="font-semibold">{idea.title}</p>
                    <p className="text-xs text-muted">
                      {idea.realized_value_sar
                        ? t('e04.realized', {
                            sar: Math.round(idea.realized_value_sar / 1000),
                          })
                        : idea.estimated_value_sar
                          ? t('e04.estimated', {
                              sar: Math.round(idea.estimated_value_sar / 1000),
                            })
                          : idea.category}
                    </p>
                  </div>
                  <Badge tone="teal" uppercase={false}>
                    {idea.status}
                  </Badge>
                </li>
              ))}
              {data.ideas.length === 0 ? (
                <li className="text-muted">{t('e04.noIdeas')}</li>
              ) : null}
            </ul>
          </Card>
        </>
      ) : null}
    </AppShell>
  )
}
