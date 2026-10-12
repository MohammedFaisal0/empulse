import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useHrGovernance } from '../../api/hr'
import { Badge, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { hrNav } from '../../layout/navConfigs'

function inBand(ratio: number | null, band: [number, number]): boolean {
  if (ratio == null) return true
  return ratio >= band[0] && ratio <= band[1]
}

export function H15Governance() {
  const { t } = useTranslation()
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { data, isLoading, isError } = useHrGovernance({
    action: action || undefined,
    from: from || undefined,
    to: to || undefined,
  })

  return (
    <AppShell
      config={hrNav}
      activePath="/hr/governance"
      chrome={{
        breadcrumbPrimary: t('h15.breadcrumbOrg'),
        breadcrumbPage: t('h15.title'),
      }}
    >
      <div className="mb-5">
        <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
          {t('h15.title')}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t('h15.subtitle')}</p>
        <Badge tone="violet" className="mt-2" uppercase={false}>
          {t('h15.hrAdminOnly')}
        </Badge>
      </div>

      {isLoading ? <p className="text-muted">{t('h15.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="!rounded-[14px]">
              <p className="text-[13px] font-semibold">{t('h15.hitl')}</p>
              <p className="mt-1 text-[22px] font-semibold ltr-nums">
                {data.principles.hitl_approval_pct != null
                  ? `${data.principles.hitl_approval_pct}%`
                  : '—'}
              </p>
              <p className="text-[12px] text-muted">{t('h15.hitlSub')}</p>
            </Card>
            <Card className="!rounded-[14px]">
              <p className="text-[13px] font-semibold">{t('h15.explainable')}</p>
              <p className="mt-1 text-[13px] text-muted">{t('h15.explainableSub')}</p>
            </Card>
            <Card className="!rounded-[14px]">
              <p className="text-[13px] font-semibold">{t('h15.minimal')}</p>
              <p className="mt-1 text-[13px] text-muted">{t('h15.minimalSub')}</p>
            </Card>
            <Card className="!rounded-[14px]">
              <p className="text-[13px] font-semibold">{t('h15.auditTotal')}</p>
              <p className="mt-1 text-[22px] font-semibold ltr-nums">
                {data.audit_log.total}
              </p>
            </Card>
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Card className="!rounded-[14px]">
              <h2 className="text-base font-semibold">{t('h15.privacyRules')}</h2>
              <ul className="mt-3 space-y-3">
                {data.privacy_rules.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-border/60 bg-surface px-3 py-2.5"
                  >
                    <p className="text-[13px] font-semibold">
                      {t(`h15.rules.${r.title_key}`)}
                    </p>
                    <p className="text-[12px] text-muted">
                      {t(`h15.rules.${r.body_key}`)}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="!rounded-[14px]">
              <h2 className="text-base font-semibold">{t('h15.dataTransparency')}</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase text-teal">
                    {t('h15.uses')}
                  </p>
                  <ul className="space-y-1.5 text-[13px]">
                    {data.data_uses.uses.map((k) => (
                      <li key={k}>· {t(`h15.data.${k}`)}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase text-coral">
                    {t('h15.never')}
                  </p>
                  <ul className="space-y-1.5 text-[13px]">
                    {data.data_uses.never_uses.map((k) => (
                      <li key={k}>· {t(`h15.data.${k}`)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          <Card className="mb-4 !rounded-[14px]">
            <h2 className="text-base font-semibold">{t('h15.fairness')}</h2>
            <p className="mb-3 text-[13px] text-muted">
              {t('h15.fairnessSub', {
                lo: data.fairness.band[0],
                hi: data.fairness.band[1],
              })}
            </p>
            {data.fairness.last_audit_projected ? (
              <p className="mb-3 text-[11px] text-amber-dark">
                {t('h15.lastAuditProjected')}
              </p>
            ) : null}
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.fairness.ratios.map((row) => {
                const ok = inBand(row.ratio, data.fairness.band)
                return (
                  <li
                    key={row.id}
                    className="rounded-xl border border-border/60 px-3 py-2.5"
                  >
                    <p className="text-[12px] text-muted">
                      {t(`h15.fairnessLabels.${row.id}`)}
                    </p>
                    <p
                      className={[
                        'mt-1 font-mono text-[20px] font-semibold ltr-nums',
                        row.not_collected || row.ratio == null
                          ? 'text-faint'
                          : ok
                            ? 'text-teal'
                            : 'text-coral',
                      ].join(' ')}
                    >
                      {row.not_collected || row.ratio == null ? '—' : row.ratio}
                    </p>
                    {row.not_collected ? (
                      <p className="text-[10px] text-faint">
                        {t('common.notCollected')}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </Card>

          <Card className="!rounded-[14px]">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{t('h15.auditLog')}</h2>
                <p className="text-[13px] text-muted">{t('h15.auditSub')}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-[13px]">
                <select
                  className="rounded-lg border border-border bg-white px-2 py-1.5"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                >
                  <option value="">{t('h15.allActions')}</option>
                  {data.audit_log.actions.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  className="rounded-lg border border-border bg-white px-2 py-1.5"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
                <input
                  type="date"
                  className="rounded-lg border border-border bg-white px-2 py-1.5"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-start text-[13px]">
                <thead>
                  <tr className="border-b border-border font-mono text-[10px] uppercase text-muted">
                    <th className="py-2 pe-2 font-medium">{t('h15.colWhen')}</th>
                    <th className="py-2 pe-2 font-medium">{t('h15.colActor')}</th>
                    <th className="py-2 pe-2 font-medium">{t('h15.colAction')}</th>
                    <th className="py-2 pe-2 font-medium">{t('h15.colEmployee')}</th>
                    <th className="py-2 font-medium">{t('h15.colPath')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.audit_log.rows.map((row) => (
                    <tr key={row.id} className="border-b border-surface-2">
                      <td className="py-2 pe-2 font-mono text-[11px] ltr-nums">
                        {row.created_at.slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="py-2 pe-2">{row.actor_email ?? '—'}</td>
                      <td className="py-2 pe-2">
                        <Badge tone="slate" uppercase={false}>
                          {row.action}
                        </Badge>
                      </td>
                      <td className="py-2 pe-2">
                        {row.employee_name ?? '—'}
                      </td>
                      <td className="py-2 font-mono text-[11px] text-muted">
                        {row.path || '—'}
                      </td>
                    </tr>
                  ))}
                  {data.audit_log.rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-muted">
                        {t('h15.emptyLog')}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </AppShell>
  )
}
