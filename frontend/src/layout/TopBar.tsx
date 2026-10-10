import { Bell, CalendarRange, ChevronDown, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { Badge } from '../components/ui'
import type { TopBarChrome } from './shellChrome'

type TopBarProps = {
  chrome: TopBarChrome
}

export function TopBar({ chrome }: TopBarProps) {
  const { t } = useTranslation()

  return (
    <header className="flex h-topbar min-h-topbar items-center gap-3 border-b border-border bg-white px-content">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <nav
          aria-label={t('a11y.breadcrumb')}
          className="min-w-0 truncate font-mono text-[11px] tracking-[0.02em] text-muted"
        >
          <span className="text-muted">{chrome.breadcrumbPrimary}</span>
          <span className="mx-1.5 text-faint">/</span>
          <span className="text-ink">{chrome.breadcrumbPage}</span>
        </nav>

        {chrome.attentionChip ? (
          <Badge tone="coral" uppercase={false} className="shrink-0">
            {chrome.attentionChip}
          </Badge>
        ) : null}

        {chrome.dataFreshness ? (
          <span className="ltr-nums shrink-0 rounded-sm bg-surface-4 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
            {chrome.dataFreshness}
          </span>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <LanguageSwitcher className="hidden sm:inline-flex" />

        <label className="relative hidden w-[min(280px,28vw)] sm:block">
          <Search
            className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint"
            strokeWidth={1.75}
          />
          <input
            type="search"
            readOnly
            placeholder={chrome.searchPlaceholder}
            className={[
              'h-9 w-full rounded-lg border border-border bg-surface-4 py-1.5 ps-8 text-[13px] text-ink placeholder:text-faint',
              'focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal',
              chrome.showShortcut ? 'pe-12' : 'pe-3',
            ].join(' ')}
          />
          {chrome.showShortcut ? (
            <kbd className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 rounded-sm border border-border bg-white px-1.5 py-0.5 font-mono text-[10px] text-muted">
              {t('topBar.shortcut')}
            </kbd>
          ) : null}
        </label>

        <button
          type="button"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-white px-2.5 text-[12px] text-mutedText2 hover:bg-surface-4"
        >
          <CalendarRange className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span>{chrome.dateRange}</span>
          <ChevronDown className="h-3.5 w-3.5 text-faint" strokeWidth={1.75} />
        </button>

        <button
          type="button"
          aria-label={t('topBar.notifications')}
          className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-muted hover:bg-surface-4"
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
          <span className="absolute end-2 top-2 h-1.5 w-1.5 rounded-full bg-coral" />
        </button>
      </div>
    </header>
  )
}
