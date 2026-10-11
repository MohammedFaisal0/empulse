import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useMeSettings, usePatchMeSettings } from '../../api/me'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { Button, Card } from '../../components/ui'
import { AppShell } from '../../layout/AppShell'
import { employeeNav } from '../../layout/navConfigs'

const PREFS_KEY = 'empulse.employee.notificationPrefs'

type NotifyPrefs = {
  weeklyDigest: boolean
  recognitionAlerts: boolean
  growthReminders: boolean
}

const DEFAULT_PREFS: NotifyPrefs = {
  weeklyDigest: true,
  recognitionAlerts: true,
  growthReminders: true,
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

export function E11Settings() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useMeSettings()
  const patch = usePatchMeSettings()
  const [prefs, setPrefs] = useState<NotifyPrefs>(DEFAULT_PREFS)
  const [privacy, setPrivacy] = useState({
    share_checkin_trend: true,
    show_on_recognition_wall: true,
    manager_may_see_wellbeing: true,
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setPrefs(loadPrefs())
  }, [])

  useEffect(() => {
    if (data?.privacy_stub) setPrivacy(data.privacy_stub)
  }, [data])

  function save() {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    void patch.mutateAsync(privacy).then(() => setSaved(true))
  }

  const vis = data?.visibility

  return (
    <AppShell
      config={employeeNav}
      activePath="/employee/settings"
      chrome={{ breadcrumbPage: t('e11.title') }}
    >
      <div className="mb-5">
        <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">
          {t('e11.title')}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t('e11.subtitle')}</p>
      </div>

      {isLoading ? <p className="text-muted">{t('e11.loading')}</p> : null}
      {isError ? <p className="text-coral-dark">{t('common.error')}</p> : null}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card className="!rounded-2xl">
          <h2 className="text-base font-semibold">{t('e11.language')}</h2>
          <p className="mt-1 text-[13px] text-muted">{t('e11.languageSub')}</p>
          <div className="mt-4">
            <LanguageSwitcher />
          </div>
        </Card>

        <Card className="!rounded-2xl">
          <h2 className="text-base font-semibold">{t('e11.notifications')}</h2>
          <p className="mt-1 text-[13px] text-muted">{t('e11.notificationsSub')}</p>
          <ul className="mt-3 space-y-2 text-[13px]">
            {(
              [
                ['weeklyDigest', 'e11.weeklyDigest'],
                ['recognitionAlerts', 'e11.recognitionAlerts'],
                ['growthReminders', 'e11.growthReminders'],
              ] as const
            ).map(([key, label]) => (
              <li key={key} className="flex items-center justify-between gap-2">
                <span>{t(label)}</span>
                <input
                  type="checkbox"
                  checked={prefs[key]}
                  onChange={(e) => {
                    setPrefs((p) => ({ ...p, [key]: e.target.checked }))
                    setSaved(false)
                  }}
                />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mb-4 !rounded-2xl">
        <h2 className="text-base font-semibold">{t('e11.privacy')}</h2>
        <p className="mt-1 text-[13px] text-muted">{t('e11.privacySub')}</p>
        <ul className="mt-3 space-y-2 text-[13px]">
          {(
            [
              ['share_checkin_trend', 'e11.shareCheckin'],
              ['show_on_recognition_wall', 'e11.showOnWall'],
              ['manager_may_see_wellbeing', 'e11.managerWellbeing'],
            ] as const
          ).map(([key, label]) => (
            <li key={key} className="flex items-center justify-between gap-2">
              <span>{t(label)}</span>
              <input
                type="checkbox"
                checked={privacy[key]}
                onChange={(e) => {
                  setPrivacy((p) => ({ ...p, [key]: e.target.checked }))
                  setSaved(false)
                }}
              />
            </li>
          ))}
        </ul>
        <Button variant="primary" className="mt-4" onClick={save}>
          {t('e11.save')}
        </Button>
        {saved ? <p className="mt-2 text-xs text-teal-dark">{t('e11.saved')}</p> : null}
      </Card>

      {vis ? (
        <Card className="!rounded-2xl">
          <h2 className="text-base font-semibold">{t('e11.visibility')}</h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <VisList title={t('e11.managerCan')} keys={vis.manager_can_see} />
            <VisList title={t('e11.managerCannot')} keys={vis.manager_cannot_see} />
            <VisList title={t('e11.hrCan')} keys={vis.hr_can_see} />
            <VisList title={t('e11.hrCannot')} keys={vis.hr_cannot_see} />
            <VisList title={t('e11.execSees')} keys={vis.executive_sees} />
          </div>
        </Card>
      ) : null}
    </AppShell>
  )
}

function VisList({ title, keys }: { title: string; keys: string[] }) {
  const { t } = useTranslation()
  return (
    <div>
      <p className="font-mono text-[11px] tracking-wide text-teal-dark">{title}</p>
      <ul className="mt-2 space-y-2 text-[13px]">
        {keys.map((k) => (
          <li key={k}>{t(`e11.vis.${k}`, { defaultValue: k })}</li>
        ))}
      </ul>
    </div>
  )
}
