import { useMutation, useQuery } from '@tanstack/react-query'

import { apiFetch } from './client'

export type DriverItem = {
  feature: string
  label: string
  value: number
  baseline_value: number
  impact_pts: number
}

export type BurnoutDrivers = {
  increasing: DriverItem[]
  protective: DriverItem[]
}

export type WeeklyTrajectoryPoint = {
  week_start: string
  burnout_risk_pct: number
  engagement_score: number
  workload_index: number
  overtime_hours_monthly?: number
  wellbeing_score?: number
  performance_score?: number
}

export type BurnoutPerson = {
  id: number
  full_name: string
  first_name: string
  last_name: string
  job_title: string
  team: string | null
  manager_name: string | null
  burnout_risk_pct: number
  burnout_level: string
  burnout_change_6w_pts: number
  burnout_6w_ago_pct: number
  performance_score: number
  performance_tier: string
  wellbeing_score: number
  detected_on: string | null
  as_of: string
  drivers: BurnoutDrivers
  trajectory: WeeklyTrajectoryPoint[]
}

export type ManagerBurnoutResponse = {
  attention_count: number
  watch_count: number
  healthy_count: number
  direct_reports: number
  people: BurnoutPerson[]
}

export type MemberProfile = {
  id: number
  full_name: string
  first_name: string
  last_name: string
  email: string
  job_title: string
  job_level: number
  department: string
  team: string | null
  manager_name: string | null
  hire_date: string
  tenure_years: number
  work_location: string
  work_mode: string
  current: {
    as_of: string
    performance_score: number
    performance_tier: string
    wellbeing_score: number
    burnout_risk_pct: number
    burnout_level: string
    burnout_change_6w_pts: number
    attrition_risk_pct: number
    innovation_score: number
    engagement_score: number
    workload_index: number
    overtime_hours_monthly: number
    task_completion_rate: number
    task_quality_score: number
    collaboration_score: number
    drivers: BurnoutDrivers
  } | null
  skills: Array<{ skill: string; category: string; level: number }>
  ideas: Array<{
    id: number
    title: string
    status: string
    category: string
    submitted_at: string | null
  }>
  interventions: Array<{
    id: number
    type: string
    status: string
    rationale: string
    expected_risk_reduction_pts: number
    baseline_risk_pct: number
    followup_risk_pct: number | null
    outcome: string
    human_approved: boolean
    created_at: string | null
  }>
  trajectory: Array<{
    week_start: string
    burnout_risk_pct: number
    performance_score: number
    wellbeing_score: number
    engagement_score: number
    workload_index: number
  }>
}

export type TeamMemberRow = {
  id: number
  full_name: string
  first_name: string
  last_name: string
  job_title: string
  performance_score: number
  performance_tier: string
  engagement_score: number
  wellbeing_score: number
  burnout_risk_pct: number
  burnout_change_6w_pts: number
  burnout_level: string
  innovation_score: number
  collaboration_score: number
  task_completion_rate: number
  task_quality_score: number
  workload_index: number
  overtime_hours_monthly: number
  status_band: 'at_risk' | 'watch' | 'improving' | 'healthy'
  prior_quarter: {
    performance_score: number | null
    wellbeing_score: number | null
  }
}

export type TeamDriver = {
  feature: string
  label: string
  impact_pts: number
  value: number | null
  n: number
}

export type TeamChange = {
  id: string
  metric: string
  delta: number
  unit: string
  people_count?: number
  tone: string
}

export type ManagerTeamResponse = {
  team: string | null
  department: string | null
  direct_reports: number
  attention_count: number
  band_counts: {
    at_risk: number
    watch: number
    improving: number
    healthy: number
  }
  aggregates:
    | { suppressed: true }
    | {
        suppressed: false
        n: number
        performance_score: number | null
        performance_delta: number | null
        engagement_score: number | null
        engagement_delta: number | null
        wellbeing_score: number | null
        wellbeing_delta: number | null
        morale_score: number | null
        morale_delta: number | null
        innovation_score: number | null
        innovation_delta: number | null
        burnout_risk_pct: number | null
        burnout_delta: number | null
        collaboration_score: number | null
        task_completion_rate: number | null
        task_quality_score: number | null
        empulse_score: number | null
        empulse_tier: string
        points_to_gold: number
        tier_mix: Record<string, number>
        attention_count: number
        dimensions: {
          task_completion: number | null
          collaboration: number | null
          innovation: number | null
          engagement: number | null
          wellbeing: number | null
          attendance: number | null
          professionalism: number | null
          digital: number | null
        }
      }
  people: TeamMemberRow[]
  trend: Array<{
    week_start: string
    performance_score: number | null
    engagement_score: number | null
    wellbeing_score: number | null
    burnout_risk_pct: number | null
    workload_index?: number | null
    overtime_hours_monthly?: number | null
    collaboration_score: number | null
    innovation_score: number | null
  }>
  changes: TeamChange[]
  team_drivers: TeamDriver[]
  department_benchmark:
    | { suppressed: true }
    | {
        suppressed: false
        n: number
        department: string | null
        performance_score: number | null
        engagement_score: number | null
        wellbeing_score: number | null
        innovation_score: number | null
        collaboration_score: number | null
      }
  quadrants: {
    thriving: number
    burnout_risk: number
    development: number
    critical_support: number
    member_ids: {
      thriving: number[]
      burnout_risk: number[]
      development: number[]
      critical_support: number[]
    }
  }
}

export function useManagerBurnout() {
  return useQuery({
    queryKey: ['manager', 'burnout'],
    queryFn: () => apiFetch<ManagerBurnoutResponse>('/api/manager/burnout/'),
  })
}

export function useManagerTeam() {
  return useQuery({
    queryKey: ['manager', 'team'],
    queryFn: () => apiFetch<ManagerTeamResponse>('/api/manager/team/'),
  })
}

export function useManagerMember(id: string | undefined) {
  return useQuery({
    queryKey: ['manager', 'member', id],
    enabled: Boolean(id),
    queryFn: () => apiFetch<MemberProfile>(`/api/manager/members/${id}/`),
  })
}

export function useInterventionStub(id: number | undefined) {
  return useMutation({
    mutationFn: (action: 'start' | 'simulate') =>
      apiFetch<{ ok: boolean; code: string }>(
        `/api/manager/members/${id}/intervention-stub/`,
        {
          method: 'POST',
          body: JSON.stringify({ action }),
        },
      ),
  })
}

export type MoraleSeriesPoint = {
  week_start: string
  morale: number | null
  engagement: number | null
  workload: number | null
  burnout_risk_pct: number | null
}

export type ManagerMoraleResponse = {
  direct_reports: number
  series: MoraleSeriesPoint[]
  signals:
    | { suppressed: true }
    | {
        suppressed: false
        n: number
        morale: number | null
        morale_delta: number | null
        engagement: number | null
        engagement_delta: number | null
        workload: number | null
        workload_delta: number | null
        burnout_risk_pct: number | null
        burnout_delta: number | null
        recognition_90d_avg: number | null
        recognition_delta: number | null
        collaboration: number | null
        collaboration_delta: number | null
        innovation_participation: number | null
        innovation_delta: number | null
      }
  themes: { suppressed: true } | { items: Array<{ text: string; mentions: number }> }
  themes_note: string
}

export type RecognitionItem = {
  id: number
  type: string
  message: string
  created_at: string
  is_public: boolean
  giver_id: number
  receiver_id: number
  giver_name: string
  receiver_name: string
}

export type ManagerRecognitionResponse = {
  direct_reports: number
  received: RecognitionItem[]
  given: RecognitionItem[]
  coverage: Array<{
    id: number
    full_name: string
    job_title: string
    last_recognized: string | null
    days_since: number
  }>
  members: Array<{ id: number; full_name: string; job_title: string }>
}

export type ManagerInnovationResponse = {
  direct_reports: number
  kpis:
    | { suppressed: true }
    | {
        suppressed: false
        n: number
        ideas_count: number
        status_counts: Record<string, number>
        estimated_value_sar: number
        realized_value_sar: number
      }
  ideas: Array<{
    id: number
    title: string
    category: string
    status: string
    submitter: string
    employee_id: number
    novelty_score: number
    feasibility_score: number
    business_value_score: number
    submitted_at: string | null
    estimated_value_sar: number | null
    realized_value_sar: number | null
  }>
}

export type InterventionRow = {
  id: number
  display_id: string
  type: string
  rationale: string
  driver: string
  status: string
  human_approved: boolean
  expected_risk_reduction_pts: number
  baseline_risk_pct: number
  followup_risk_pct: number | null
  outcome: string
  created_at: string | null
  approved_at: string | null
  started_at: string | null
  completed_at: string | null
  followup_at: string | null
  employee_id: number
  employee_name: string
  owner_name: string | null
}

export type ManagerInterventionsResponse = {
  direct_reports: number
  interventions: InterventionRow[]
}

export type ManagerReportsResponse = {
  direct_reports: number
  scope: {
    direct_reports_only: boolean
    other_teams: boolean
    org_hr_analytics: boolean
  }
  report:
    | { suppressed: true }
    | {
        suppressed: false
        n: number
        performance_score: number | null
        engagement_score: number | null
        wellbeing_score: number | null
        burnout_risk_pct: number | null
        innovation_score: number | null
        ideas_count: number
        recognitions_count: number
        interventions_count: number
        interventions_completed: number
      }
  month_label: string
}

export type PulseAIStubResponse = {
  stub: boolean
  question: string
  data_used: Array<{ label: string; value: number | null; n: number }>
  findings: string[]
  recommendation: { summary: string; actions: string[] }
  never_sees: string[]
}

export function useManagerMorale() {
  return useQuery({
    queryKey: ['manager', 'morale'],
    queryFn: () => apiFetch<ManagerMoraleResponse>('/api/manager/morale/'),
  })
}

export function useManagerRecognition() {
  return useQuery({
    queryKey: ['manager', 'recognition'],
    queryFn: () =>
      apiFetch<ManagerRecognitionResponse>('/api/manager/recognition/'),
  })
}

export function useCreateRecognition() {
  return useMutation({
    mutationFn: (body: {
      receiver_id: number
      type: string
      message: string
      is_public?: boolean
    }) =>
      apiFetch<{ id: number }>('/api/manager/recognition/', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  })
}

export function useManagerInnovation() {
  return useQuery({
    queryKey: ['manager', 'innovation'],
    queryFn: () =>
      apiFetch<ManagerInnovationResponse>('/api/manager/innovation/'),
  })
}

export function useManagerInterventions() {
  return useQuery({
    queryKey: ['manager', 'interventions'],
    queryFn: () =>
      apiFetch<ManagerInterventionsResponse>('/api/manager/interventions/'),
  })
}

export function useCreateIntervention() {
  return useMutation({
    mutationFn: (body: {
      employee_id: number
      type: string
      rationale: string
      driver?: string
      expected_risk_reduction_pts?: number
    }) =>
      apiFetch<{ id: number; display_id: string; status: string }>(
        '/api/manager/interventions/',
        { method: 'POST', body: JSON.stringify(body) },
      ),
  })
}

export function usePatchIntervention() {
  return useMutation({
    mutationFn: ({
      id,
      action,
      outcome,
      followup_risk_pct,
    }: {
      id: number
      action: 'approve' | 'start' | 'complete' | 'decline'
      outcome?: string
      followup_risk_pct?: number
    }) =>
      apiFetch<{ id: number; status: string; human_approved: boolean }>(
        `/api/manager/interventions/${id}/`,
        {
          method: 'PATCH',
          body: JSON.stringify({ action, outcome, followup_risk_pct }),
        },
      ),
  })
}

export function useManagerReports() {
  return useQuery({
    queryKey: ['manager', 'reports'],
    queryFn: () => apiFetch<ManagerReportsResponse>('/api/manager/reports/'),
  })
}

export function usePulseAIStub() {
  return useMutation({
    mutationFn: (question: string) =>
      apiFetch<PulseAIStubResponse>('/api/manager/pulseai/', {
        method: 'POST',
        body: JSON.stringify({ question }),
      }),
  })
}
