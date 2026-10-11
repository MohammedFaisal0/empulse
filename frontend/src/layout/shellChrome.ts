import type { TFunction } from 'i18next'

import { demoPersona } from './demoPersona'
import type { AppRole } from './navConfigs'

export type TopBarChrome = {
  breadcrumbPrimary: string
  breadcrumbPage: string
  searchPlaceholder: string
  dateRange: string
  showShortcut?: boolean
  attentionChip?: string
  dataFreshness?: string
}

export type ContextCard =
  | { kind: 'prompt'; text: string }
  | {
      kind: 'team'
      avatars: readonly string[]
      title: string
      meta: string
    }
  | {
      kind: 'org'
      title: string
      meta: string
    }

type TopBarOptions = {
  attentionCount?: number
}

export function topBarForRole(
  role: AppRole,
  t: TFunction,
  options: TopBarOptions = {},
): TopBarChrome {
  if (role === 'employee') {
    const p = demoPersona.employee
    return {
      breadcrumbPrimary: `${p.name} · ${p.team}`,
      breadcrumbPage: t('shell.employee.topBar.breadcrumbPage'),
      searchPlaceholder: t('shell.employee.topBar.searchPlaceholder'),
      dateRange: t('shell.employee.topBar.dateRange'),
      showShortcut: false,
    }
  }
  if (role === 'manager') {
    const p = demoPersona.manager
    const count = options.attentionCount ?? 3
    return {
      breadcrumbPrimary: `${p.team} · ${t('shell.manager.topBar.breadcrumbPrimaryMeta')}`,
      breadcrumbPage: t('shell.manager.topBar.breadcrumbPage'),
      searchPlaceholder: t('shell.manager.topBar.searchPlaceholder'),
      dateRange: t('shell.manager.topBar.dateRange'),
      attentionChip: t('shell.manager.topBar.attentionChip', { count }),
      showShortcut: false,
    }
  }
  return {
    breadcrumbPrimary: demoPersona.hr.org,
    breadcrumbPage: t('shell.hr.topBar.breadcrumbPage'),
    searchPlaceholder: t('shell.hr.topBar.searchPlaceholder'),
    dateRange: t('shell.hr.topBar.dateRange'),
    dataFreshness: t('shell.hr.topBar.dataFreshness'),
    showShortcut: true,
  }
}

export function contextCardForRole(role: AppRole, t: TFunction): ContextCard {
  if (role === 'employee') {
    return { kind: 'prompt', text: t('shell.employee.context') }
  }
  if (role === 'manager') {
    const p = demoPersona.manager
    return {
      kind: 'team',
      avatars: p.contextAvatars,
      title: p.team,
      meta: t('shell.manager.contextMeta'),
    }
  }
  return {
    kind: 'org',
    title: demoPersona.hr.org,
    meta: t('shell.hr.contextMeta'),
  }
}
