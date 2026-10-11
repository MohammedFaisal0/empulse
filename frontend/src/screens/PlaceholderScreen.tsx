import { useTranslation } from 'react-i18next'

import { Card } from '../components/ui'
import { AppShell } from '../layout/AppShell'
import { navByRole, type AppRole } from '../layout/navConfigs'

export function PlaceholderScreen({
  role,
  path,
  titleKey,
}: {
  role: AppRole
  path: string
  titleKey: string
}) {
  const { t } = useTranslation()
  return (
    <AppShell config={navByRole[role]} activePath={path}>
      <h1 className="mb-3 text-[28px] font-semibold text-ink">{t(titleKey)}</h1>
      <Card>
        <p className="text-muted">{t('placeholders.comingSoon')}</p>
      </Card>
    </AppShell>
  )
}
