import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { AppRole, NavConfig } from './navConfigs'
import { topBarForRole, type TopBarChrome } from './shellChrome'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

type AppShellProps = {
  config: NavConfig
  children: ReactNode
  activePath?: string
  preview?: boolean
  /** Override breadcrumb page / attention chip for a specific screen. */
  chrome?: Partial<TopBarChrome>
  attentionCount?: number
}

export function AppShell({
  config,
  children,
  activePath,
  preview,
  chrome: chromeOverride,
  attentionCount,
}: AppShellProps) {
  const { t } = useTranslation()
  const base = topBarForRole(config.role, t, { attentionCount })
  const chrome = { ...base, ...chromeOverride }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar config={config} activePath={activePath} preview={preview} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar chrome={chrome} />
        <main className="flex-1 overflow-auto px-content py-6">
          <div className="mx-auto w-full max-w-content">{children}</div>
        </main>
      </div>
    </div>
  )
}

export function roleHomeShell(role: AppRole): AppRole {
  return role
}
