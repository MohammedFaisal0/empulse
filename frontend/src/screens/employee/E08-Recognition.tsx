import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useMeRecognitionWall, useSendRecognition } from '../../api/me'
import { Avatar, Badge, Button, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { employeeNav } from '../../layout/navConfigs'

const TYPES = [
  'Impact',
  'Collaboration',
  'Innovation',
  'Mentorship',
  'Above & Beyond',
  'Customer Focus',
] as const

export function E08Recognition() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useMeRecognitionWall()
  const send = useSendRecognition()
  const [receiverId, setReceiverId] = useState<number | ''>('')
  const [type, setType] = useState<string>(TYPES[0])
  const [message, setMessage] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const colleagues = data?.colleagues ?? []
  const defaultReceiver = useMemo(
    () => receiverId || colleagues[0]?.id || '',
    [receiverId, colleagues],
  )

  async function submit() {
    const id = typeof defaultReceiver === 'number' ? defaultReceiver : Number(defaultReceiver)
    if (!id || !message.trim()) return
    setMsg(null)
    try {
      await send.mutateAsync({
        receiver_id: id,
        type,
        message: message.trim(),
        is_public: true,
      })
      setMessage('')
      setMsg(t('e08.sent'))
    } catch {
      setMsg(t('common.error'))
    }
  }

  return (
    <AppShell
      config={employeeNav}
      activePath="/employee/recognition"
      chrome={{ breadcrumbPage: t('e08.title') }}
    >
      <div className="mb-5">
        <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
          {t('e08.title')}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t('e08.subtitle')}</p>
        <p className="mt-1 text-xs font-semibold text-teal-dark">{t('e08.noRank')}</p>
      </div>

      {isLoading ? <p className="text-muted">{t('e08.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div>
            <h2 className="text-base font-semibold">{t('e08.wall')}</h2>
            <p className="mb-3 text-[13px] text-muted">
              {t('e08.wallSub', { count: data.public_count })}
            </p>
            {data.wall.length === 0 ? (
              <p className="text-muted">{t('e08.empty')}</p>
            ) : (
              <ul className="space-y-3">
                {data.wall.map((r) => (
                  <li key={r.id}>
                    <Card className="!rounded-2xl">
                      <div className="flex items-start gap-3">
                        <Avatar name={r.giver.first_name} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="violet" uppercase={false}>
                              {r.type}
                            </Badge>
                            <span className="font-mono text-[10px] text-faint ltr-nums">
                              {r.created_at}
                            </span>
                          </div>
                          <p className="mt-2 text-[13px] text-ink">{r.message}</p>
                          <p className="mt-1 text-xs text-muted">
                            {r.giver.first_name}
                            {r.giver.team ? ` · ${r.giver.team}` : ''}
                            {' → '}
                            {r.receiver.first_name}
                            {r.receiver.team ? ` · ${r.receiver.team}` : ''}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-4">
            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('e08.send')}</h2>
              <p className="mt-1 text-[13px] text-muted">{t('e08.sendSub')}</p>
              <label className="mt-4 block text-[13px]">
                <span className="font-semibold">{t('e08.colleague')}</span>
                <select
                  className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
                  value={defaultReceiver}
                  onChange={(e) =>
                    setReceiverId(e.target.value ? Number(e.target.value) : '')
                  }
                >
                  {colleagues.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                      {c.team ? ` · ${c.team}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-3 block text-[13px]">
                <span className="font-semibold">{t('e08.type')}</span>
                <select
                  className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {TYPES.map((ty) => (
                    <option key={ty} value={ty}>
                      {ty}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-3 block text-[13px]">
                <span className="font-semibold">{t('e08.message')}</span>
                <textarea
                  className="mt-1 w-full rounded-xl border border-border px-3 py-2"
                  rows={3}
                  placeholder={t('e08.messagePh')}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>
              <Button
                variant="primary"
                className="mt-3 w-full"
                onClick={() => void submit()}
                disabled={send.isPending}
              >
                {t('e08.submit')}
              </Button>
              {msg ? <p className="mt-2 text-xs text-teal-dark">{msg}</p> : null}
            </Card>

            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('e08.received')}</h2>
              <ul className="mt-3 space-y-2">
                {data.received.slice(0, 5).map((r) => (
                  <li key={r.id} className="rounded-lg bg-surface px-3 py-2 text-[13px]">
                    <Badge tone="teal" uppercase={false}>
                      {r.type}
                    </Badge>
                    <p className="mt-1">{r.message}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}
