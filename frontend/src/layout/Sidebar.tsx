import { Leaf } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { Avatar } from '../components/ui'
import { en } from '../i18n/en'
import type { AppRole, NavConfig, NavItem } from './navConfigs'
import { contextCardForRole, type ContextCard } from './shellChrome'

type SidebarProps = {
  config: NavConfig
  /** Force an active path (used by design-preview demos). */
  activePath?: string
  /** When true, nav rows do not navigate (preview / gallery mode). */
  preview?: boolean
}

function isHr(role: AppRole): boolean {
  return role === 'hr'
}

function navLabelClass(role: AppRole): string {
  return role === 'hr' ? 'text-nav-hr' : 'text-nav-em'
}

function navRowClass(active: boolean, role: AppRole): string {
  if (role === 'hr') {
    return [
      'mx-auto flex h-nav w-sidebar-nav-hr max-w-sidebar-nav-hr items-center gap-2.5 rounded-lg px-2.5 text-left font-medium transition-colors',
      navLabelClass(role),
      active
        ? 'bg-teal text-navy'
        : 'text-white-78 hover:bg-white-6 hover:text-white',
    ].join(' ')
  }

  if (role === 'manager') {
    return [
      'flex h-nav w-full items-center gap-2.5 rounded-md px-2.5 text-left font-medium transition-colors',
      navLabelClass(role),
      active
        ? 'bg-navy text-white hover:bg-navy hover:text-white'
        : 'bg-transparent text-ink/80 hover:bg-surface-4 hover:text-ink',
    ].join(' ')
  }

  return [
    'flex h-nav w-full items-center gap-2.5 rounded-md px-2.5 text-left font-medium transition-colors',
    navLabelClass(role),
    active
      ? 'bg-teal-light text-teal-dark'
      : 'bg-transparent text-ink/80 hover:bg-surface-4 hover:text-ink',
  ].join(' ')
}


function NavRowContent({
  item,
  active,
  role,
}: {
  item: NavItem
  active: boolean
  role: AppRole
}) {
  const Icon = item.icon
  const inactiveIcon = role === 'hr' ? 'text-white-78' : 'text-muted'
  const activeDot =
    role === 'manager' ? 'bg-white' : role === 'hr' ? 'bg-navy' : 'bg-teal'

  return (
    <>
      {active ? (
        <span
          className={['h-2 w-2 shrink-0 rounded-full', activeDot].join(' ')}
          aria-hidden
        />
      ) : (
        <Icon
          className={['h-4 w-4 shrink-0', inactiveIcon].join(' ')}
          strokeWidth={1.75}
        />
      )}
      <span
        className={[
          'sidebar-nav-label min-w-0 flex-1 truncate',
          navLabelClass(role),
        ].join(' ')}
      >
        {item.label}
      </span>
      {item.badge != null ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1.5 font-mono text-[10px] font-medium text-white">
          {item.badge}
        </span>
      ) : null}
    </>
  )
}

function NavRow({
  item,
  activePath,
  preview,
  role,
}: {
  item: NavItem
  activePath?: string
  preview?: boolean
  role: AppRole
}) {
  if (preview) {
    const active = activePath === item.to
    return (
      <div
        className={navRowClass(active, role)}
        aria-current={active ? 'page' : undefined}
      >
        <NavRowContent item={item} active={active} role={role} />
      </div>
    )
  }

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) => {
        const active = activePath ? activePath === item.to : isActive
        return navRowClass(active, role)
      }}
    >
      {({ isActive }) => {
        const active = activePath ? activePath === item.to : isActive
        return <NavRowContent item={item} active={active} role={role} />
      }}
    </NavLink>
  )
}

function ContextCardView({ card }: { card: ContextCard }) {
  if (card.kind === 'prompt') {
    return (
      <div className="mx-3 mb-3 flex items-start gap-2 rounded-lg bg-teal-light px-3 py-2.5">
        <Leaf
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-dark"
          strokeWidth={2}
        />
        <p className="text-[12px] font-medium leading-snug text-teal-dark">
          {card.text}
        </p>
      </div>
    )
  }

  if (card.kind === 'team') {
    return (
      <div className="mx-3 mb-3 rounded-lg border border-border bg-white px-3 py-2.5 shadow-card">
        <div className="mb-1.5 flex -space-x-1.5">
          {card.avatars.map((initials) => (
            <span
              key={initials}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-navy2 font-mono text-[9px] font-medium text-white"
            >
              {initials}
            </span>
          ))}
        </div>
        <p className="text-[12px] font-semibold text-ink">{card.title}</p>
        <p className="font-mono text-[10px] text-muted">{card.meta}</p>
      </div>
    )
  }

  // HR org card
  return (
    <div className="mx-3 mb-3 rounded-2xl bg-white-6 px-3 py-2.5">
      <p className="text-[12px] font-semibold leading-snug text-white">
        {card.title}
        <span className="font-normal text-white-78"> / {card.meta}</span>
      </p>
    </div>
  )
}

function SectionLabel({ role, label }: { role: AppRole; label: string }) {
  if (role === 'hr') {
    return (
      <p className="inline-flex rounded-sm bg-teal-soft px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-teal">
        {label}
      </p>
    )
  }

  return (
    <p className="inline-flex rounded-sm bg-surface-4 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
      {label}
    </p>
  )
}

function ProfileBlock({
  config,
  preview,
}: {
  config: NavConfig
  preview?: boolean
}) {
  const hr = isHr(config.role)
  const shell = [
    'flex items-center gap-2.5 rounded-md px-2 py-2',
    hr ? 'hover:bg-white-6' : 'hover:bg-surface-4',
  ].join(' ')

  const nameClass = [
    'truncate text-[13px] font-medium',
    hr ? 'text-white' : 'text-ink',
  ].join(' ')
  const roleClass = [
    'truncate font-mono text-[10px]',
    hr ? 'text-white-78' : 'text-muted',
  ].join(' ')

  const body = (
    <>
      <Avatar name={config.profile.name} size="sm" />
      <div className="min-w-0">
        <p className={nameClass}>{config.profile.name}</p>
        <p className={roleClass}>{config.profile.roleLabel}</p>
      </div>
    </>
  )

  if (preview || !config.profile.settingsTo) {
    return <div className={shell}>{body}</div>
  }

  return (
    <NavLink to={config.profile.settingsTo} className={shell}>
      {body}
    </NavLink>
  )
}

export function Sidebar({ config, activePath, preview }: SidebarProps) {
  const context = contextCardForRole(config.role)
  const hr = isHr(config.role)

  return (
    <aside
      data-sidebar-role={config.role}
      className={[
        'flex h-screen shrink-0 grow-0 flex-col overflow-x-hidden',
        hr
          ? 'w-sidebar-hr min-w-sidebar-hr max-w-sidebar-hr basis-sidebar-hr bg-navy text-white'
          : 'w-sidebar min-w-sidebar max-w-sidebar basis-sidebar border-r border-border bg-white text-ink',
      ].join(' ')}
    >
      <div className="flex h-topbar items-center px-4">
        <div className="flex items-center gap-2">
          <span
            className={[
              'flex h-7 w-7 items-center justify-center rounded-md',
              hr ? 'bg-teal' : 'bg-navy',
            ].join(' ')}
          >
            <span
              className={[
                'h-2 w-3 rounded-sm',
                hr ? 'bg-navy' : 'bg-teal',
              ].join(' ')}
              aria-hidden
            />
          </span>
          <span
            className={[
              'text-sm font-semibold tracking-wide',
              hr ? 'text-white' : 'text-ink',
            ].join(' ')}
          >
            {en.brand}
          </span>
        </div>
      </div>

      <div className="px-4 pb-2">
        <SectionLabel role={config.role} label={config.section} />
      </div>

      <ContextCardView card={context} />

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
        {config.items.map((item) => (
          <NavRow
            key={item.id}
            item={item}
            activePath={activePath}
            preview={preview}
            role={config.role}
          />
        ))}
      </nav>

      <div
        className={[
          'mt-auto px-3 py-3',
          hr ? 'border-t border-white-6' : 'border-t border-border',
        ].join(' ')}
      >
        {config.footerItems.length > 0 ? (
          <div className="mb-2 space-y-0.5">
            {config.footerItems.map((item) => (
              <NavRow
                key={item.id}
                item={item}
                activePath={activePath}
                preview={preview}
                role={config.role}
              />
            ))}
          </div>
        ) : null}

        {config.privacyNote ? (
          <div className="mb-2 rounded-lg bg-teal-lighter/80 px-2.5 py-2">
            <p className="whitespace-normal break-words text-[11px] leading-snug text-mutedText2">
              {config.privacyNote}
            </p>
          </div>
        ) : null}

        <ProfileBlock config={config} preview={preview} />
      </div>
    </aside>
  )
}
