import { ArrowRight, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useHrPulseAIStub, type HrPulseAIStub } from '../../api/hr'
import { RtlFlip } from '../../components/RtlFlip'
import { Badge, Button, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { hrNav } from '../../layout/navConfigs'

const PRESETS = ['h16.q1', 'h16.q2', 'h16.q3', 'h16.q4'] as const

type Turn = { question: string; answer: HrPulseAIStub }

export function H16PulseAIOrganization() {
  const { t } = useTranslation()
  const ask = useHrPulseAIStub()
  const [question, setQuestion] = useState('')
  const [history, setHistory] = useState<Turn[]>([])
  const [error, setError] = useState<string | null>(null)
  const answer = history[0]?.answer ?? null

  async function run(q: string) {
    const text = q.trim()
    if (!text) return
    setQuestion(text)
    setError(null)
    try {
      const res = await ask.mutateAsync({ question: text })
      setHistory((h) => [{ question: text, answer: res }, ...h].slice(0, 8))
    } catch {
      setError(t('common.error'))
    }
  }

  async function confirmIntervention() {
    const draft = answer?.recommendation?.propose_intervention
    if (!draft) return
    try {
      const res = await ask.mutateAsync({
        question: question || answer?.question || '',
        confirm_intervention: true,
        intervention: draft as unknown as Record<string, unknown>,
      })
      setHistory((h) => [
        { question: t('h16.confirmQuestion'), answer: res },
        ...h,
      ].slice(0, 8))
    } catch {
      setError(t('common.error'))
    }
  }

  return (
    <AppShell
      config={hrNav}
      activePath="/hr/pulseai"
      chrome={{
        breadcrumbPrimary: t('h16.breadcrumbOrg'),
        breadcrumbPage: t('h16.title'),
      }}
    >
      <div className="mb-5">
        <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
          {t('h16.title')}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t('h16.subtitle')}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[250px_1fr]">
        <div>
          <Button
            variant="primary"
            className="mb-4 w-full"
            onClick={() => {
              setQuestion('')
              setError(null)
            }}
          >
            {t('h16.newQuestion')}
          </Button>
          <p className="mb-2 font-mono text-[11px] tracking-wide text-muted">
            {t('h16.recent')}
          </p>
          <ul className="space-y-1">
            {history.map((turn) => (
              <li key={turn.question}>
                <button
                  type="button"
                  onClick={() => setQuestion(turn.question)}
                  className="w-full rounded-[10px] px-3 py-2.5 text-start text-[13px] font-medium text-ink hover:bg-white"
                >
                  {turn.question}
                </button>
              </li>
            ))}
            {PRESETS.map((key) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => void run(t(key))}
                  className="w-full rounded-[10px] px-3 py-2.5 text-start text-[13px] font-medium text-ink hover:bg-white"
                >
                  {t(key)}
                </button>
              </li>
            ))}
          </ul>
          <Card className="mt-4 !rounded-[14px] !p-3">
            <p className="font-mono text-[10px] uppercase text-muted">
              {t('h16.scope')}
            </p>
            <ul className="mt-2 space-y-1 text-[12px] text-muted">
              <li>· {t('h16.scopeOrg')}</li>
              <li>· {t('h16.scopeAgg')}</li>
              <li>· {t('h16.scopeNoPrivate')}</li>
              <li>· {t('h16.scopeUnder5')}</li>
            </ul>
          </Card>
        </div>

        <div className="space-y-3">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void run(question)
            }}
          >
            <input
              className="min-w-0 flex-1 rounded-2xl border border-border bg-navy px-4 py-3 text-[14px] text-white placeholder:text-white/50"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t('h16.inputPh')}
            />
            <Button variant="accent" type="submit" disabled={ask.isPending}>
              <Sparkles className="h-4 w-4" />
              {t('h16.ask')}
            </Button>
          </form>

          {ask.isPending ? (
            <p className="text-muted">{t('h16.loading')}</p>
          ) : null}
          {error ? <p className="text-[13px] text-coral">{error}</p> : null}

          {answer ? (
            <Card className="!rounded-[14px]">
              <div className="flex flex-wrap gap-2">
                <Badge tone="teal" uppercase={false}>
                  PulseAI · {answer.engine ?? 'rules'}
                </Badge>
                {answer.refused ? (
                  <Badge tone="coral" uppercase={false}>
                    {t('h16.refused')}
                  </Badge>
                ) : null}
                {answer.executive_aggregates_only ? (
                  <Badge tone="slate" uppercase={false}>
                    {t('h16.aggregated')}
                  </Badge>
                ) : null}
              </div>

              <p className="mt-3 text-[15px] font-semibold">
                {answer.headline || answer.recommendation.summary}
              </p>

              <h3 className="mt-5 font-mono text-[11px] tracking-wide text-muted">
                {t('h16.dataUsed')}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {answer.data_used.map((d) => (
                  <span
                    key={`${d.label}-${d.value}`}
                    className="rounded-full bg-teal-light/50 px-2.5 py-1 text-[11px] text-teal-dark"
                  >
                    {d.label}
                    {d.value != null ? ` ${d.value}` : ''}
                  </span>
                ))}
              </div>

              <h3 className="mt-5 font-mono text-[11px] tracking-wide text-muted">
                {t('h16.findings')}
              </h3>
              <ul className="mt-2 space-y-2">
                {answer.findings.map((f, i) => (
                  <li
                    key={f}
                    className="flex gap-3 rounded-[10px] border border-border/60 px-3 py-2.5 text-[13px]"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy font-mono text-[10px] text-white">
                      {i + 1}
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 rounded-[10px] border border-teal bg-teal-light/30 px-3.5 py-3">
                <p className="font-mono text-[10px] uppercase text-teal-dark">
                  {t('h16.recommendation')}
                </p>
                <p className="mt-1 text-[13px] font-semibold">
                  {answer.recommendation.summary}
                </p>
                <ul className="mt-2 space-y-1 text-[13px] text-muted">
                  {answer.recommendation.actions.map((a) => (
                    <li key={a}>· {a}</li>
                  ))}
                </ul>
              </div>

              {answer.awaiting_confirmation &&
              answer.recommendation.propose_intervention ? (
                <Button
                  className="mt-4"
                  variant="primary"
                  onClick={() => void confirmIntervention()}
                  disabled={ask.isPending}
                >
                  {t('h16.confirmPropose')}
                </Button>
              ) : null}

              <p className="mt-3 text-[12px] text-muted">
                {answer.disclaimer ?? t('h16.disclaimer')}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/hr/simulator?scope=organization"
                  className="inline-flex items-center gap-2 rounded-[11px] border border-border bg-white px-3.5 py-2 text-[13px] font-semibold"
                >
                  {t('h16.simulate')}
                </Link>
                <Link
                  to="/hr/reports"
                  className="inline-flex items-center gap-2 rounded-[11px] bg-navy px-3.5 py-2 text-[13px] font-semibold text-white"
                >
                  {t('h16.addReport')}
                  <RtlFlip>
                    <ArrowRight className="h-4 w-4 text-teal-lighter" />
                  </RtlFlip>
                </Link>
              </div>
            </Card>
          ) : (
            <Card className="!rounded-[14px]">
              <p className="text-[14px] text-muted">{t('h16.idle')}</p>
              <p className="mt-2 text-[12px] text-faint">{t('h16.tryAsking')}</p>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  )
}
