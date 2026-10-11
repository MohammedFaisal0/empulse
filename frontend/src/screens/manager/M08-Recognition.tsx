import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  useCreateRecognition,
  useManagerRecognition,
  useManagerTeam,
} from '../../api/manager'
import { useAuth } from '../../auth/AuthContext'
import { Avatar, Button, Card, Tabs } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { managerNav } from '../../layout/navConfigs'

const BADGE_TYPES = [
  'Performance Star',
  'Innovation Champion',
  'Collaboration Hero',
  'Digital Pioneer',
  'Team Supporter',
  'Growth Champion',
] as const

export function M08Recognition() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const qc = useQueryClient()
  const { data, isLoading, isError } = useManagerRecognition()
  const team = useManagerTeam()
  const create = useCreateRecognition()

  const coverage = data?.coverage ?? []
  const [receiverId, setReceiverId] = useState<number | null>(null)
  const [badge, setBadge] = useState<string>(BADGE_TYPES[0])
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState('given')
  const [msg, setMsg] = useState<string | null>(null)

  const selected = useMemo(() => {
    const id = receiverId ?? coverage[0]?.id
    return coverage.find((c) => c.id === id) ?? null
  }, [coverage, receiverId])

  const maxGap = Math.max(90, ...coverage.map((c) => c.days_since || 0))

  async function submit() {
    if (!selected) return
    setMsg(null)
    try {
      await create.mutateAsync({
        receiver_id: selected.id,
        type: badge,
        message: message.trim() || t('m08.defaultMessage', { name: selected.full_name }),
        is_public: true,
      })
      setMessage('')
      setMsg(t('m08.sent'))
      void qc.invalidateQueries({ queryKey: ['manager', 'recognition'] })
    } catch {
      setMsg(t('common.error'))
    }
  }

  const feed = tab === 'given' ? (data?.given ?? []) : (data?.received ?? [])

  return (
    <AppShell
      config={managerNav}
      activePath="/manager/recognition"
      attentionCount={team.data?.attention_count}
      chrome={{ breadcrumbPage: t('m08.title') }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('m08.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('m08.subtitle')}</p>
        </div>
        <p className="rounded-xl border border-border bg-white px-3.5 py-2 text-[14px] font-semibold text-navy">
          {t('m08.whoNeeds')}
        </p>
      </div>

      {isLoading ? <p className="text-muted">{t('m08.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data ? (
        <>
          <div className="mb-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('m08.formTitle')}</h2>
              <div className="mt-4 space-y-3">
                <label className="block text-[13px]">
                  <span className="mb-1 block text-muted">{t('m08.pickMember')}</span>
                  <select
                    className="w-full rounded-[10px] border border-border px-3 py-2.5 text-[13px]"
                    value={selected?.id ?? ''}
                    onChange={(e) => setReceiverId(Number(e.target.value))}
                  >
                    {coverage.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                        {c.days_since >= 9999
                          ? ` · ${t('m08.never')}`
                          : ` · ${t('m08.daysAgo', { n: c.days_since })}`}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-wrap gap-2">
                  {BADGE_TYPES.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBadge(b)}
                      className={[
                        'rounded-[10px] border px-3 py-2 text-[13px] font-semibold',
                        badge === b
                          ? 'border-teal-dark bg-teal-light text-ink'
                          : 'border-border bg-white text-ink',
                      ].join(' ')}
                    >
                      {t(`m08.badges.${b}` as const)}
                    </button>
                  ))}
                </div>

                <textarea
                  className="min-h-[110px] w-full rounded-[10px] border border-border px-3 py-2.5 text-[13.5px]"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('m08.messagePlaceholder')}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    disabled={!selected || create.isPending}
                    onClick={() => void submit()}
                  >
                    {t('m08.submit', {
                      name: selected?.full_name.split(' ')[0] ?? '',
                      badge: t(`m08.badges.${badge}` as const),
                    })}
                  </Button>
                </div>
                {msg ? <p className="text-[13px] text-teal-dark">{msg}</p> : null}
              </div>
            </Card>

            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">
                {t('m08.previewTitle', {
                  name: selected?.full_name.split(' ')[0] ?? '—',
                })}
              </h2>
              <p className="mt-1 text-[13px] text-muted">{t('m08.previewSub')}</p>
              <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
                <p className="font-mono text-[10.5px] tracking-wide text-teal-dark">
                  {t(`m08.badges.${badge}` as const).toUpperCase()}
                </p>
                <p className="mt-1 text-base font-semibold">
                  {selected?.full_name ?? '—'}
                </p>
                <p className="mt-3 text-[13.5px] text-ink">
                  “{message.trim() || t('m08.previewQuote')}”
                </p>
                <p className="mt-3 text-xs text-muted">
                  — {user?.name ?? t('m08.manager')}
                </p>
              </div>
              <p className="mt-3 text-xs text-muted">{t('m08.scoreNote')}</p>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <Card className="!rounded-2xl">
              <h2 className="text-base font-semibold">{t('m08.coverageTitle')}</h2>
              <p className="mt-1 text-[13px] text-muted">{t('m08.coverageSub')}</p>
              <ul className="mt-4 divide-y divide-border">
                {coverage.map((c) => {
                  const days = c.days_since >= 9999 ? null : c.days_since
                  const pct = days == null ? 100 : Math.min(100, (days / maxGap) * 100)
                  return (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center gap-3 py-3 text-[13px]"
                    >
                      <Avatar name={c.full_name} size="sm" />
                      <span className="min-w-[120px] font-medium">{c.full_name}</span>
                      <div className="h-1.5 min-w-[80px] flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={`h-full rounded-full ${
                            (days ?? 999) >= 60 ? 'bg-amber' : 'bg-border'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="ltr-nums font-mono text-[13px] text-muted">
                        {days == null ? t('m08.never') : t('m08.days', { n: days })}
                      </span>
                      <button
                        type="button"
                        className="font-semibold text-teal-dark"
                        onClick={() => setReceiverId(c.id)}
                      >
                        {t('m08.recognize')}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </Card>

            <Card className="!rounded-2xl">
              <h2 className="mb-3 text-base font-semibold">{t('m08.feedTitle')}</h2>
              <Tabs
                items={[
                  { id: 'given', label: t('m08.tabGiven') },
                  { id: 'received', label: t('m08.tabReceived') },
                ]}
                value={tab}
                onChange={setTab}
              />
              <ul className="mt-3 max-h-[420px] space-y-2 overflow-auto">
                {feed.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-border px-3 py-2.5 text-[13px]"
                  >
                    <p className="font-semibold">
                      {tab === 'given' ? r.receiver_name : r.giver_name}
                      <span className="ms-2 font-mono text-[11px] font-normal text-muted">
                        {r.type}
                      </span>
                    </p>
                    <p className="mt-1 text-muted">{r.message || '—'}</p>
                    <p className="mt-1 font-mono text-[11px] text-faint">
                      {r.created_at}
                    </p>
                  </li>
                ))}
                {feed.length === 0 ? (
                  <li className="text-muted">{t('m08.feedEmpty')}</li>
                ) : null}
              </ul>
            </Card>
          </div>
        </>
      ) : null}
    </AppShell>
  )
}
