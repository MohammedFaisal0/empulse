import { ChevronUp } from 'lucide-react'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../auth/AuthContext'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { Avatar } from '../components/ui'
import type { AppRole, NavConfig } from './navConfigs'

type ProfileMenuProps = {
  config: NavConfig
  preview?: boolean
}

function isHr(role: AppRole): boolean {
  return role === 'hr'
}

export function ProfileMenu({ config, preview }: ProfileMenuProps) {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const hr = isHr(config.role)

  const shell = [
    'flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-start transition-colors',
    hr ? 'hover:bg-white-6' : 'hover:bg-surface-4',
    open ? (hr ? 'bg-white-6' : 'bg-surface-4') : '',
  ].join(' ')

  const nameClass = [
    'truncate text-[13px] font-medium',
    hr ? 'text-white' : 'text-ink',
  ].join(' ')
  const roleClass = [
    'truncate font-mono text-[10px]',
    hr ? 'text-white-78' : 'text-muted',
  ].join(' ')
  const chevronClass = [
    'ms-auto h-3.5 w-3.5 shrink-0 transition-transform',
    hr ? 'text-white-78' : 'text-faint',
    open ? '' : 'rotate-180',
  ].join(' ')

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const body = (
    <>
      <Avatar name={config.profile.name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className={nameClass}>{config.profile.name}</p>
        <p className={roleClass}>{t(config.profile.roleKey)}</p>
      </div>
    </>
  )

  if (preview) {
    return <div className={shell}>{body}</div>
  }

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={shell}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-label={t('shell.account.menu')}
        onClick={() => setOpen((v) => !v)}
      >
        {body}
        <ChevronUp className={chevronClass} strokeWidth={1.75} aria-hidden />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={t('shell.account.menu')}
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
          className="absolute bottom-full start-0 end-0 z-50 mb-1 overflow-hidden rounded-lg border border-border bg-white py-1 shadow-card"
        >
          <div className="border-b border-border px-2.5 py-2">
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              {t('shell.account.language')}
            </p>
            <LanguageSwitcher className="w-full justify-stretch [&>button]:flex-1" />
          </div>
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2 text-start text-[13px] text-ink hover:bg-surface-4"
            onClick={() => {
              setOpen(false)
              logout({ redirectTo: '/role' })
            }}
          >
            {t('shell.account.switchAccount')}
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2 text-start text-[13px] text-coral-dark hover:bg-coral-light/40"
            onClick={() => {
              setOpen(false)
              logout({ redirectTo: '/login' })
            }}
          >
            {t('shell.account.signOut')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
