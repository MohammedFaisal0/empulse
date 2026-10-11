import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useMePulseAIStub, type MePulseAIStub } from '../../api/me'
import { Badge, Button, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { employeeNav } from '../../layout/navConfigs'

const PRESETS = ['e09.q1', 'e09.q2', 'e09.q3', 'e09.q4'] as const

export function E09PulseAI() {
  const { t } = useTranslation()
  const ask = useMePulseAIStub()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<MePulseAIStub | null>(null)

  async function run(q: string) {
    const text = q.trim()
    if (!text) return
    setQuestion(text)
    try {
      const res = await ask.mutateAsync(text)
      setAnswer(res)
    } catch {
      setAnswer(null)
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

      <div className="grid gap-4 lg:grid-cols-[250px_1fr]">
        <div>
          <Button
            variant="primary"
            className="mb-4 w-full"
            onClick={() => {
              setAnswer(null)
              setQuestion('')
            }}
          >
            {t('e09.newQuestion')}
          </Button>
          <p className="mb-2 font-mono text-[11px] tracking-wide text-muted">
            {t('e09.recent')}
          </p>
          <ul className="space-y-1">
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

          {answer ? (
            <Card className="!rounded-2xl">
              <Badge tone="amber" uppercase={false}>
                {t('e09.stubBadge')}
              </Badge>
              <p className="mt-3 text-[15px] font-semibold">{answer.question}</p>

              <h3 className="mt-5 font-mono text-[11px] tracking-wide text-muted">
                {t('e09.dataUsed')}
              </h3>
              <ul className="mt-2 space-y-1 text-[13px]">
                {answer.data_used.map((d) => (
                  <li key={d.label} className="flex justify-between gap-2">
                    <span>{d.label}</span>
                    <span className="ltr-nums font-mono">
                      {d.value == null ? '—' : d.value}
                    </span>
                  </li>
                ))}
              </ul>

              <h3 className="mt-5 font-mono text-[11px] tracking-wide text-muted">
                {t('e09.findings')}
              </h3>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-[13px]">
                {answer.findings.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>

              <h3 className="mt-5 font-mono text-[11px] tracking-wide text-muted">
                {t('e09.recommendation')}
              </h3>
              <p className="mt-2 text-[13px] font-semibold">
                {answer.recommendation.summary}
              </p>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-[13px] text-muted">
                {answer.recommendation.actions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>

              <h3 className="mt-5 font-mono text-[11px] tracking-wide text-coral-dark">
                {t('e09.neverSees')}
              </h3>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-[13px] text-muted">
                {answer.never_sees.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </AppShell>
  )
}
