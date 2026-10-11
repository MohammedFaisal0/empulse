import { useTranslation } from 'react-i18next'

import { useMeReports } from '../../api/me'
import { Button, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { employeeNav } from '../../layout/navConfigs'

function toCsv(rows: Array<{ section: string; key: string; value: string | number }>) {
  const escape = (v: string | number) => {
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const lines = ['section,key,value']
  for (const r of rows) {
    lines.push(`${escape(r.section)},${escape(r.key)},${escape(r.value)}`)
  }
  return lines.join('\n')
}

export function E10MyReports() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useMeReports()

  function downloadCsv() {
    if (!data) return
    const blob = new Blob([toCsv(data.rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `empulse-me-report-${data.generated_at}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppShell
      config={employeeNav}
      activePath="/employee/reports"
      chrome={{ breadcrumbPage: t('e10.title') }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
            {t('e10.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('e10.subtitle')}</p>
          <p className="mt-1 text-xs font-semibold text-teal-dark">{t('e10.ownOnly')}</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="secondary" onClick={() => window.print()}>
            {t('e10.print')}
          </Button>
          <Button variant="primary" onClick={downloadCsv} disabled={!data}>
            {t('e10.downloadCsv')}
          </Button>
        </div>
      </div>

      {isLoading ? <p className="text-muted">{t('e10.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      {data ? (
        <Card className="!rounded-2xl">
          <p className="text-[13px] text-muted">
            {t('e10.generated', { date: data.generated_at })} · {data.full_name}
          </p>
          {data.rows.length === 0 ? (
            <p className="mt-4 text-muted">{t('e10.empty')}</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-start text-[13px]">
                <thead>
                  <tr className="border-b border-border font-mono text-[10px] tracking-wide text-faint">
                    <th className="py-2 pe-3 font-medium">{t('e10.section')}</th>
                    <th className="py-2 pe-3 font-medium">{t('e10.key')}</th>
                    <th className="py-2 font-medium">{t('e10.value')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr key={`${r.section}-${r.key}-${i}`} className="border-b border-surface-2">
                      <td className="py-2 pe-3 text-muted">{r.section}</td>
                      <td className="py-2 pe-3">{r.key}</td>
                      <td className="py-2 ltr-nums font-mono">{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}
    </AppShell>
  )
}
