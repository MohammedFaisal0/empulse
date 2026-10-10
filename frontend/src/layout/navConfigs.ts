import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  Building2,
  CircleDollarSign,
  Dna,
  FileText,
  FlaskConical,
  Gauge,
  GitBranch,
  HandHeart,
  HelpCircle,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Scale,
  Settings,
  Sparkles,
  Store,
  Target,
  TrendingUp,
  Users,
  UsersRound,
} from 'lucide-react'

import { en } from '../i18n/en'

export type AppRole = 'employee' | 'manager' | 'hr'

export type NavItem = {
  id: string
  label: string
  to: string
  icon: LucideIcon
  badge?: number
}

export type NavConfig = {
  role: AppRole
  section: string
  items: NavItem[]
  footerItems: NavItem[]
  profile: {
    name: string
    roleLabel: string
    settingsTo?: string
  }
  privacyNote?: string
}

const e = en.shell.employee
const m = en.shell.manager
const h = en.shell.hr

export const employeeNav: NavConfig = {
  role: 'employee',
  section: e.section,
  items: [
    { id: 'overview', label: e.items.overview, to: '/employee/overview', icon: LayoutDashboard },
    { id: 'performance', label: e.items.performance, to: '/employee/performance', icon: Gauge },
    { id: 'twin', label: e.items.twin, to: '/employee/twin', icon: Brain },
    { id: 'innovationDna', label: e.items.innovationDna, to: '/employee/innovation-dna', icon: Dna },
    { id: 'innovationLab', label: e.items.innovationLab, to: '/employee/innovation-lab', icon: FlaskConical },
    { id: 'marketplace', label: e.items.marketplace, to: '/employee/marketplace', icon: Store },
    { id: 'growth', label: e.items.growth, to: '/employee/growth', icon: TrendingUp },
    { id: 'recognition', label: e.items.recognition, to: '/employee/recognition', icon: HandHeart },
    { id: 'pulseai', label: e.items.pulseai, to: '/employee/pulseai', icon: Sparkles },
    { id: 'reports', label: e.items.reports, to: '/employee/reports', icon: FileText },
  ],
  footerItems: [],
  privacyNote: e.privacy,
  profile: {
    name: e.profileName,
    roleLabel: e.profileRole,
    settingsTo: '/employee/settings',
  },
}

export const managerNav: NavConfig = {
  role: 'manager',
  section: m.section,
  items: [
    { id: 'overview', label: m.items.overview, to: '/manager/overview', icon: LayoutDashboard },
    { id: 'performance', label: m.items.performance, to: '/manager/performance', icon: BarChart3 },
    { id: 'pulse', label: m.items.pulse, to: '/manager/pulse', icon: Activity },
    { id: 'members', label: m.items.members, to: '/manager/members', icon: Users },
    { id: 'matrix', label: m.items.matrix, to: '/manager/matrix', icon: Target },
    {
      id: 'burnout',
      label: m.items.burnout,
      to: '/manager/burnout',
      icon: AlertTriangle,
      badge: 3,
    },
    { id: 'morale', label: m.items.morale, to: '/manager/morale', icon: HandHeart },
    { id: 'recognition', label: m.items.recognition, to: '/manager/recognition', icon: Sparkles },
    { id: 'innovation', label: m.items.innovation, to: '/manager/innovation', icon: FlaskConical },
    {
      id: 'interventions',
      label: m.items.interventions,
      to: '/manager/interventions',
      icon: GitBranch,
      badge: 2,
    },
    { id: 'reports', label: m.items.reports, to: '/manager/reports', icon: FileText },
    { id: 'pulseai', label: m.items.pulseai, to: '/manager/pulseai', icon: MessageSquare },
  ],
  footerItems: [
    { id: 'help', label: m.help, to: '/manager/help', icon: HelpCircle },
    { id: 'settings', label: m.settings, to: '/manager/settings', icon: Settings },
  ],
  profile: {
    name: m.profileName,
    roleLabel: m.profileRole,
    settingsTo: '/manager/settings',
  },
}

export const hrNav: NavConfig = {
  role: 'hr',
  section: h.section,
  items: [
    { id: 'executive', label: h.items.executive, to: '/hr/executive', icon: LayoutDashboard },
    { id: 'organization', label: h.items.organization, to: '/hr/organization', icon: Building2 },
    { id: 'employees', label: h.items.employees, to: '/hr/employees', icon: Users },
    { id: 'teams', label: h.items.teams, to: '/hr/teams', icon: UsersRound },
    { id: 'performance', label: h.items.performance, to: '/hr/performance', icon: LineChart },
    { id: 'burnout', label: h.items.burnout, to: '/hr/burnout', icon: AlertTriangle },
    { id: 'morale', label: h.items.morale, to: '/hr/morale', icon: HandHeart },
    { id: 'innovation', label: h.items.innovation, to: '/hr/innovation', icon: FlaskConical },
    { id: 'recognition', label: h.items.recognition, to: '/hr/recognition', icon: Sparkles },
    { id: 'interventions', label: h.items.interventions, to: '/hr/interventions', icon: GitBranch },
    { id: 'matrix', label: h.items.matrix, to: '/hr/matrix', icon: Target },
    { id: 'economic', label: h.items.economic, to: '/hr/economic', icon: CircleDollarSign },
    { id: 'simulator', label: h.items.simulator, to: '/hr/simulator', icon: Gauge },
    { id: 'reports', label: h.items.reports, to: '/hr/reports', icon: FileText },
    { id: 'governance', label: h.items.governance, to: '/hr/governance', icon: Scale },
  ],
  footerItems: [
    { id: 'pulseai', label: h.pulseai, to: '/hr/pulseai', icon: MessageSquare },
    { id: 'settings', label: h.settings, to: '/hr/settings', icon: Settings },
  ],
  profile: {
    name: h.profileName,
    roleLabel: h.profileRole,
    settingsTo: '/hr/settings',
  },
}

export const navByRole: Record<AppRole, NavConfig> = {
  employee: employeeNav,
  manager: managerNav,
  hr: hrNav,
}

/** Placeholder routes so NavLink active states work inside design-preview. */
export const shellDemoPaths: Record<AppRole, string> = {
  employee: '/employee/overview',
  manager: '/manager/overview',
  hr: '/hr/executive',
}
