import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useManagerTeam } from '../../api/manager'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { Button, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { managerNav } from '../../layout/navConfigs'

const PREFS_KEY = 'empulse.manager.notificationPrefs'

type NotifyPrefs = {
  burnoutThreshold: number
  engagementDrop: number
  recognitionGapDays: number
  weeklyDigest: boolean
  burnoutAlerts: boolean
  recognitionReminders: boolean
}

const DEFAULT_PREFS: NotifyPrefs = {
  burnoutThreshold: 60,
  engagementDrop: 10,
  recognitionGapDays: 45,
  weeklyDigest: true,
  burnoutAlerts: true,
  recognitionReminders: true,
}

function loadPrefs(): NotifyPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return DEFAULT_PREFS
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<NotifyPrefs>) }
  } catch {
    return DEFAULT_PREFS
  }
}

export function M13Settings() {
  const { t } = useTranslation()
  const team = useManagerTeam()
  const [prefs, setPrefs] = useState<NotifyPrefs>(DEFAULT_PREFS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setPrefs(loadPrefs())
  }, [])

  function update<K extends keyof NotifyPrefs>(key: K, value: NotifyPrefs[K]) {
    setPrefs((p) => ({ ...p, [key]: value }))
    setSaved(false)
  }

  function save() {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    setSaved(true)
  }

  const n = team.data?.direct_reports ?? '—'

  return (
    <AppShell
      config={managerNav}
      activePath="/manager/settings"
      attentionCount={team.data?.attention_count}
      chrome={{ breadcrumbPage: t('m13.title') }}
    >
      <div className="mb-5">
        <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
          {t('m13.title')}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t('m13.subtitle')}</p>
      </div>

      <Card className="mb-4 !rounded-2xl">
        <h2 className="text-base font-semibold">{t('m13.accessTitle')}</h2>
        <p className="mt-1 text-[13px] text-muted">{t('m13.accessSub')}</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="font-mono text-[11px] tracking-wide text-teal-dark">
              {t('m13.canSee')}
            </p>
            <ul className="mt-2 space-y-2 text-[13px]">
              <li>{t('m13.can.scores', { n })}</li>
              <li>{t('m13.can.wellbeing')}</li>
              <li>{t('m13.can.themes')}</li>
              <li>{t('m13.can.innovation')}</li>
              <li>{t('m13.can.impact')}</li>
            </ul>
          </div>
          <div>
            <p className="font-mono text-[11px] tracking-wide text-coral-dark">
              {t('m13.cannotSee')}
            </p>
            <ul className="mt-2 space-y-2 text-[13px]">
              <li>{t('m13.cannot.otherTeams')}</li>
              <li>{t('m13.cannot.private')}</li>
              <li>{t('m13.cannot.orgHr')}</li>
              <li>{t('m13.cannot.gov')}</li>
              <li>{t('m13.cannot.finance')}</li>
            </ul>
          </div>
        </div>
      </Card>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card className="!rounded-2xl">
          <h2 className="text-base font-semibold">{t('m13.alertsTitle')}</h2>
          <ul className="mt-3 divide-y divide-border text-[13px]">
            <li className="flex items-center justify-between gap-2 py-2.5">
              <span>{t('m13.burnoutThreshold')}</span>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={prefs.burnoutAlerts}
                  onChange={(e) => update('burnoutAlerts', e.target.checked)}
                />
                <input
                  type="number"
                  min={40}
                  max={90}
                  className="w-16 rounded-md border border-border px-2 py-1 font-mono text-[13px]"
                  value={prefs.burnoutThreshold}
                  onChange={(e) =>
                    update('burnoutThreshold', Number(e.target.value) || 60)
                  }
                />
                %
              </label>
            </li>
            <li className="flex items-center justify-between gap-2 py-2.5">
              <span>{t('m13.engagementDrop')}</span>
              <label className="flex items-center gap-2 font-mono">
                −
                <input
                  type="number"
                  min={5}
                  max={30}
                  className="w-14 rounded-md border border-border px-2 py-1 text-[13px]"
                  value={prefs.engagementDrop}
                  onChange={(e) =>
                    update('engagementDrop', Number(e.target.value) || 10)
                  }
                />
                {t('m13.in4w')}
              </label>
            </li>
            <li className="flex items-center justify-between gap-2 py-2.5">
              <span>{t('m13.recognitionGap')}</span>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={prefs.recognitionReminders}
                  onChange={(e) =>
                    update('recognitionReminders', e.target.checked)
                  }
                />
                <input
                  type="number"
                  min={14}
                  max={120}
                  className="w-16 rounded-md border border-border px-2 py-1 font-mono text-[13px]"
                  value={prefs.recognitionGapDays}
                  onChange={(e) =>
                    update('recognitionGapDays', Number(e.target.value) || 45)
                  }
                />
                {t('m13.days')}
              </label>
            </li>
            <li className="flex items-center justify-between gap-2 py-2.5">
              <span>{t('m13.weeklyDigest')}</span>
              <input
                type="checkbox"
                checked={prefs.weeklyDigest}
                onChange={(e) => update('weeklyDigest', e.target.checked)}
              />
            </li>
          </ul>
          <p className="mt-3 text-[11px] text-faint">{t('m13.localNote')}</p>
          <div className="mt-3">
            <Button variant="primary" onClick={save}>
              {t('m13.savePrefs')}
            </Button>
            {saved ? (
              <span className="ms-3 text-[13px] text-teal-dark">
                {t('m13.saved')}
              </span>
            ) : null}
          </div>
        </Card>

        <Card className="!rounded-2xl">
          <h2 className="text-base font-semibold">{t('m13.languageTitle')}</h2>
          <p className="mt-1 text-[13px] text-muted">{t('m13.languageSub')}</p>
          <div className="mt-4">
            <LanguageSwitcher />
          </div>

          <h2 className="mt-8 text-base font-semibold">{t('m13.delegationTitle')}</h2>
          <p className="mt-2 text-[13px] text-muted">{t('m13.delegationBody')}</p>
          <p className="mt-2 text-[12px] text-faint">{t('common.notCollected')}</p>
        </Card>
      </div>
    </AppShell>
  )
}
