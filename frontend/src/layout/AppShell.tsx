import type { ReactNode } from 'react'

import type { NavConfig } from './navConfigs'
import { topBarForRole } from './shellChrome'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

type AppShellProps = {
  config: NavConfig
  children: ReactNode
  activePath?: string
  preview?: boolean
}

export function AppShell({
  config,
  children,
  activePath,
  preview,
}: AppShellProps) {
  const chrome = topBarForRole(config.role)

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
