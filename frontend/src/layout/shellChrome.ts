import { en } from '../i18n/en'
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

export function topBarForRole(role: AppRole): TopBarChrome {
  if (role === 'employee') {
    const t = en.shell.employee.topBar
    return {
      breadcrumbPrimary: t.breadcrumbPrimary,
      breadcrumbPage: t.breadcrumbPage,
      searchPlaceholder: t.searchPlaceholder,
      dateRange: t.dateRange,
      showShortcut: false,
    }
  }
  if (role === 'manager') {
    const t = en.shell.manager.topBar
    return {
      breadcrumbPrimary: t.breadcrumbPrimary,
      breadcrumbPage: t.breadcrumbPage,
      searchPlaceholder: t.searchPlaceholder,
      dateRange: t.dateRange,
      attentionChip: t.attentionChip,
      showShortcut: false,
    }
  }
  const t = en.shell.hr.topBar
  return {
    breadcrumbPrimary: t.breadcrumbPrimary,
    breadcrumbPage: t.breadcrumbPage,
    searchPlaceholder: t.searchPlaceholder,
    dateRange: t.dateRange,
    dataFreshness: t.dataFreshness,
    showShortcut: true,
  }
}

export function contextCardForRole(role: AppRole): ContextCard {
  if (role === 'employee') {
    return { kind: 'prompt', text: en.shell.employee.context }
  }
  if (role === 'manager') {
    const m = en.shell.manager
    return {
      kind: 'team',
      avatars: m.contextAvatars,
      title: m.contextTeam,
      meta: m.contextMeta,
    }
  }
  const h = en.shell.hr
  return {
    kind: 'org',
    title: h.contextOrg,
    meta: h.contextMeta,
  }
}
