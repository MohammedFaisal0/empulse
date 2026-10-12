import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useMePulseAIStub, type MePulseAIStub } from '../../api/me'
import { Badge, Button, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { employeeNav } from '../../layout/navConfigs'

const PRESETS = ['e09.q1', 'e09.q2', 'e09.q3', 'e09.q4', 'e09.q5'] as const

type Turn = { question: string; answer: MePulseAIStub }

export function E09PulseAI() {
  const { t } = useTranslation()
  const ask = useMePulseAIStub()
  const [question, setQuestion] = useState('')
  const [history, setHistory] = useState<Turn[]>([])
  const [error, setError] = useState<string | null>(null)
  const latest = history[0]?.answer ?? null

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

  return (
    <AppShell
      config={employeeNav}
      activePath="/employee/pulseai"
      chrome={{ breadcrumbPage: t('e09.title') }}
    >
      <div className="mb-5">
        <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
          {t('e09.title')}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t('e09.subtitle')}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[250px_1fr_220px]">
        <div>
          <Button
            variant="primary"
            className="mb-4 w-full"
            onClick={() => {
              setQuestion('')
              setError(null)
            }}
          >
            {t('e09.newQuestion')}
          </Button>
          <p className="mb-2 font-mono text-[11px] tracking-wide text-muted">
            {t('e09.recent')}
          </p>
          <ul className="space-y-1">
            {history.map((turn) => (
              <li key={turn.question}>
                <button
                  type="button"
                  onClick={() => setQuestion(turn.question)}
                  className="w-full rounded-[10px] px-3 py-2.5 text-start text-[13px] font-medium text-ink hover:bg-teal-light/40"
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
              placeholder={t('e09.inputPh')}
            />
            <Button variant="accent" type="submit" disabled={ask.isPending}>
              <Sparkles className="h-4 w-4" />
              {t('e09.ask')}
            </Button>
          </form>

          {ask.isPending ? (
            <p className="text-muted">{t('e09.loading')}</p>
          ) : null}
          {error ? <p className="text-[13px] text-coral">{error}</p> : null}

          {latest ? (
            <Card className="!rounded-2xl">
              {latest.refused ? (
                <Badge tone="coral" uppercase={false}>
                  {t('e09.refused')}
                </Badge>
              ) : (
                <Badge tone="teal" uppercase={false}>
                  PulseAI · {latest.engine ?? 'rules'}
                </Badge>
              )}
              <p className="mt-3 text-[15px] font-semibold">
                {latest.headline || latest.question}
              </p>

              <h3 className="mt-5 font-mono text-[11px] tracking-wide text-muted">
                {t('e09.dataUsed')}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {latest.data_used.map((d) => (
                  <span
                    key={`${d.label}-${d.value}`}
                    className="rounded-full bg-teal-light/50 px-2.5 py-1 text-[11px] text-teal-dark"
                  >
                    {d.label}
                    {d.value != null ? ` ${d.value}` : ''}
                  </span>
                ))}
                {latest.data_used.length === 0 ? (
                  <span className="text-[12px] text-faint">—</span>
                ) : null}
              </div>

              <h3 className="mt-5 font-mono text-[11px] tracking-wide text-muted">
                {t('e09.findings')}
              </h3>
              <ul className="mt-2 space-y-2">
                {latest.findings.map((f, i) => (
                  <li
                    key={f}
                    className="flex gap-3 rounded-[10px] border border-border/60 bg-surface-2/40 px-3 py-2.5 text-[13px]"
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
                  {t('e09.recommendation')}
                </p>
                <p className="mt-1 text-[13px] font-semibold">
                  {latest.recommendation.summary}
                </p>
                <ul className="mt-2 list-disc space-y-1 ps-5 text-[13px] text-muted">
                  {latest.recommendation.actions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>

              <p className="mt-3 text-[12px] text-muted">
                {latest.disclaimer ?? t('e09.disclaimer')}
              </p>

              <h3 className="mt-4 font-mono text-[11px] tracking-wide text-coral-dark">
                {t('e09.neverSees')}
              </h3>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-[13px] text-muted">
                {latest.never_sees.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </Card>
          ) : (
            <Card className="!rounded-2xl">
              <p className="text-[14px] text-muted">{t('e09.idle')}</p>
            </Card>
          )}
        </div>

        <Card className="!rounded-[14px] h-fit !p-3">
          <p className="font-mono text-[10px] uppercase text-muted">
            {t('e09.tryAsking')}
          </p>
          <ul className="mt-2 space-y-1 text-[12px] text-muted">
            {PRESETS.map((key) => (
              <li key={key}>
                <button
                  type="button"
                  className="text-start hover:text-navy"
                  onClick={() => void run(t(key))}
                >
                  · {t(key)}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  )
}
