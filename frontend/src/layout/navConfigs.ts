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

import { demoPersona } from './demoPersona'

export type AppRole = 'employee' | 'manager' | 'hr'

export type NavItem = {
  id: string
  /** i18n key under shell.<role>.items / help / settings / pulseai */
  labelKey: string
  to: string
  icon: LucideIcon
  badge?: number
}

export type NavConfig = {
  role: AppRole
  sectionKey: string
  items: NavItem[]
  footerItems: NavItem[]
  profile: {
    name: string
    roleKey: string
    settingsTo?: string
  }
  privacyKey?: string
}

export const employeeNav: NavConfig = {
  role: 'employee',
  sectionKey: 'shell.employee.section',
  items: [
    {
      id: 'overview',
      labelKey: 'shell.employee.items.overview',
      to: '/employee/overview',
      icon: LayoutDashboard,
    },
    {
      id: 'performance',
      labelKey: 'shell.employee.items.performance',
      to: '/employee/performance',
      icon: Gauge,
    },
    {
      id: 'twin',
      labelKey: 'shell.employee.items.twin',
      to: '/employee/twin',
      icon: Brain,
    },
    {
      id: 'innovationDna',
      labelKey: 'shell.employee.items.innovationDna',
      to: '/employee/innovation-dna',
      icon: Dna,
    },
    {
      id: 'innovationLab',
      labelKey: 'shell.employee.items.innovationLab',
      to: '/employee/innovation-lab',
      icon: FlaskConical,
    },
    {
      id: 'marketplace',
      labelKey: 'shell.employee.items.marketplace',
      to: '/employee/marketplace',
      icon: Store,
    },
    {
      id: 'growth',
      labelKey: 'shell.employee.items.growth',
      to: '/employee/growth',
      icon: TrendingUp,
    },
    {
      id: 'recognition',
      labelKey: 'shell.employee.items.recognition',
      to: '/employee/recognition',
      icon: HandHeart,
    },
    {
      id: 'pulseai',
      labelKey: 'shell.employee.items.pulseai',
      to: '/employee/pulseai',
      icon: Sparkles,
    },
    {
      id: 'reports',
      labelKey: 'shell.employee.items.reports',
      to: '/employee/reports',
      icon: FileText,
    },
  ],
  footerItems: [],
  privacyKey: 'shell.employee.privacy',
  profile: {
    name: demoPersona.employee.name,
    roleKey: 'shell.employee.profileRole',
    settingsTo: '/employee/settings',
  },
}

export const managerNav: NavConfig = {
  role: 'manager',
  sectionKey: 'shell.manager.section',
  items: [
    {
      id: 'overview',
      labelKey: 'shell.manager.items.overview',
      to: '/manager/overview',
      icon: LayoutDashboard,
    },
    {
      id: 'performance',
      labelKey: 'shell.manager.items.performance',
      to: '/manager/performance',
      icon: BarChart3,
    },
    {
      id: 'pulse',
      labelKey: 'shell.manager.items.pulse',
      to: '/manager/pulse',
      icon: Activity,
    },
    {
      id: 'members',
      labelKey: 'shell.manager.items.members',
      to: '/manager/members',
      icon: Users,
    },
    {
      id: 'matrix',
      labelKey: 'shell.manager.items.matrix',
      to: '/manager/matrix',
      icon: Target,
    },
    {
      id: 'burnout',
      labelKey: 'shell.manager.items.burnout',
      to: '/manager/burnout',
      icon: AlertTriangle,
      badge: 3,
    },
    {
      id: 'morale',
      labelKey: 'shell.manager.items.morale',
      to: '/manager/morale',
      icon: HandHeart,
    },
    {
      id: 'recognition',
      labelKey: 'shell.manager.items.recognition',
      to: '/manager/recognition',
      icon: Sparkles,
    },
    {
      id: 'innovation',
      labelKey: 'shell.manager.items.innovation',
      to: '/manager/innovation',
      icon: FlaskConical,
    },
    {
      id: 'interventions',
      labelKey: 'shell.manager.items.interventions',
      to: '/manager/interventions',
      icon: GitBranch,
      badge: 2,
    },
    {
      id: 'reports',
      labelKey: 'shell.manager.items.reports',
      to: '/manager/reports',
      icon: FileText,
    },
    {
      id: 'pulseai',
      labelKey: 'shell.manager.items.pulseai',
      to: '/manager/pulseai',
      icon: MessageSquare,
    },
  ],
  footerItems: [
    {
      id: 'help',
      labelKey: 'shell.manager.help',
      to: '/manager/help',
      icon: HelpCircle,
    },
    {
      id: 'settings',
      labelKey: 'shell.manager.settings',
      to: '/manager/settings',
      icon: Settings,
    },
  ],
  profile: {
    name: demoPersona.manager.name,
    roleKey: 'shell.manager.profileRole',
    settingsTo: '/manager/settings',
  },
}

export const hrNav: NavConfig = {
  role: 'hr',
  sectionKey: 'shell.hr.section',
  items: [
    {
      id: 'executive',
      labelKey: 'shell.hr.items.executive',
      to: '/hr/executive',
      icon: LayoutDashboard,
    },
    {
      id: 'organization',
      labelKey: 'shell.hr.items.organization',
      to: '/hr/organization',
      icon: Building2,
    },
    {
      id: 'employees',
      labelKey: 'shell.hr.items.employees',
      to: '/hr/employees',
      icon: Users,
    },
    {
      id: 'teams',
      labelKey: 'shell.hr.items.teams',
      to: '/hr/teams',
      icon: UsersRound,
    },
    {
      id: 'performance',
      labelKey: 'shell.hr.items.performance',
      to: '/hr/performance',
      icon: LineChart,
    },
    {
      id: 'burnout',
      labelKey: 'shell.hr.items.burnout',
      to: '/hr/burnout',
      icon: AlertTriangle,
    },
    {
      id: 'morale',
      labelKey: 'shell.hr.items.morale',
      to: '/hr/morale',
      icon: HandHeart,
    },
    {
      id: 'innovation',
      labelKey: 'shell.hr.items.innovation',
      to: '/hr/innovation',
      icon: FlaskConical,
    },
    {
      id: 'recognition',
      labelKey: 'shell.hr.items.recognition',
      to: '/hr/recognition',
      icon: Sparkles,
    },
    {
      id: 'interventions',
      labelKey: 'shell.hr.items.interventions',
      to: '/hr/interventions',
      icon: GitBranch,
    },
    {
      id: 'matrix',
      labelKey: 'shell.hr.items.matrix',
      to: '/hr/matrix',
      icon: Target,
    },
    {
      id: 'economic',
      labelKey: 'shell.hr.items.economic',
      to: '/hr/economic',
      icon: CircleDollarSign,
    },
    {
      id: 'simulator',
      labelKey: 'shell.hr.items.simulator',
      to: '/hr/simulator',
      icon: Gauge,
    },
    {
      id: 'reports',
      labelKey: 'shell.hr.items.reports',
      to: '/hr/reports',
      icon: FileText,
    },
    {
      id: 'governance',
      labelKey: 'shell.hr.items.governance',
      to: '/hr/governance',
      icon: Scale,
    },
  ],
  footerItems: [
    {
      id: 'pulseai',
      labelKey: 'shell.hr.pulseai',
      to: '/hr/pulseai',
      icon: MessageSquare,
    },
    {
      id: 'settings',
      labelKey: 'shell.hr.settings',
      to: '/hr/settings',
      icon: Settings,
    },
  ],
  profile: {
    name: demoPersona.hr.name,
    roleKey: 'shell.hr.profileRole',
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
