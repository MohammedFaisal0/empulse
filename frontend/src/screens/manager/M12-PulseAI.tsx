import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  useManagerTeam,
  usePulseAIStub,
  type PulseAIStubResponse,
} from '../../api/manager'
import { Button, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { managerNav } from '../../layout/navConfigs'

const PRESETS = [
  'm12.q1',
  'm12.q2',
  'm12.q3',
  'm12.q4',
  'm12.q5',
] as const

type Turn = { question: string; answer: PulseAIStubResponse }

export function M12PulseAI() {
  const { t } = useTranslation()
  const team = useManagerTeam()
  const ask = usePulseAIStub()
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
        { question: t('m12.confirmQuestion'), answer: res },
        ...h,
      ].slice(0, 8))
    } catch {
      setError(t('common.error'))
    }
  }

  return (
    <AppShell
      config={managerNav}
      activePath="/manager/pulseai"
      attentionCount={team.data?.attention_count}
      chrome={{ breadcrumbPage: t('m12.title') }}
    >
      <div className="mb-5">
        <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
          {t('m12.title')}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          {t('m12.subtitle', { team: team.data?.team ?? '—' })}
        </p>
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
            {t('m12.newQuestion')}
          </Button>
          <p className="mb-2 font-mono text-[11px] tracking-wide text-muted">
            {t('m12.recent')}
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
              placeholder={t('m12.inputPh')}
            />
            <Button variant="accent" type="submit" disabled={ask.isPending}>
              <Sparkles className="h-4 w-4" />
            </Button>
          </form>

          {ask.isPending ? (
            <p className="text-sm text-muted">{t('m12.thinking')}</p>
          ) : null}
          {error ? (
            <p className="text-sm text-coral-dark">{error}</p>
          ) : null}

          {answer ? (
            <Card className="!rounded-2xl border-teal/30 bg-gradient-to-b from-surface to-white">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-teal-dark">
                  {t('m12.brand')}
                </span>
                <span className="rounded-full bg-navy px-3 py-1 text-[12px] font-semibold text-white">
                  {t('m12.stepQuestion')}
                </span>
                <span className="rounded-full bg-navy px-3 py-1 text-[12px] font-semibold text-white">
                  {t('m12.stepData')}
                </span>
                <span className="rounded-full bg-navy px-3 py-1 text-[12px] font-semibold text-white">
                  {t('m12.stepFindings')}
                </span>
                <span className="rounded-full bg-navy px-3 py-1 text-[12px] font-semibold text-white">
                  {t('m12.stepRec')}
                </span>
              </div>

              {answer.refused ? (
                <p className="mb-3 text-[11px] font-mono text-coral-dark">
                  {t('m12.refused')}
                </p>
              ) : null}

              <p className="text-base font-semibold leading-snug">
                {answer.headline || answer.recommendation.summary}
              </p>

              <p className="mt-6 font-mono text-[11px] tracking-wide text-muted">
                {t('m12.dataUsed')}
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {answer.data_used.map((d) => (
                  <li
                    key={`${d.label}-${d.value}`}
                    className="rounded-lg border border-border bg-white px-3 py-1.5 text-[12px]"
                  >
                    {d.label}
                    <span className="ms-2 font-mono text-muted ltr-nums">
                      {d.value == null ? '—' : d.value}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-6 font-mono text-[11px] tracking-wide text-muted">
                {t('m12.findings')}
              </p>
              <ul className="mt-2 space-y-2">
                {answer.findings.map((f, i) => (
                  <li
                    key={f}
                    className="flex gap-3 rounded-xl border border-border bg-white px-3 py-3 text-[13px]"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-3 font-mono text-xs">
                      {i + 1}
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-6 font-mono text-[11px] tracking-wide text-muted">
                {t('m12.actions')}
              </p>
              <ol className="mt-2 list-decimal space-y-1 ps-5 text-[13px]">
                {answer.recommendation.actions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ol>

              {answer.awaiting_confirmation &&
              answer.recommendation.propose_intervention ? (
                <Button
                  className="mt-4"
                  variant="primary"
                  onClick={() => void confirmIntervention()}
                  disabled={ask.isPending}
                >
                  {t('m12.confirmPropose')}
                </Button>
              ) : null}

              {answer.proposed_intervention ? (
                <p className="mt-3 text-[12px] text-teal-dark ltr-nums">
                  {t('m12.proposedCreated', {
                    id: answer.proposed_intervention.id,
                  })}
                </p>
              ) : null}

              <p className="mt-4 text-[12px] text-muted">
                {answer.disclaimer ?? t('m12.disclaimer')}
              </p>

              <p className="mt-6 font-mono text-[11px] tracking-wide text-coral-dark">
                {t('m12.neverSees')}
              </p>
              <ul className="mt-1 text-[12px] text-muted">
                {answer.never_sees.map((n) => (
                  <li key={n}>· {n}</li>
                ))}
              </ul>
            </Card>
          ) : (
            <Card className="!rounded-2xl">
              <p className="text-sm text-muted">{t('m12.empty')}</p>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  )
}
