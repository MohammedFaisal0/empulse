import { useMutation, useQuery } from '@tanstack/react-query'

import { apiFetch, getAccessToken } from './client'
import type { MemberProfile } from './manager'

export type HrDirectoryPerson = {
  id: number
  full_name: string
  employee_code: string
  job_title: string
  department: string
  team: string | null
  performance_score: number | null
  performance_tier: string | null
  wellbeing_alert: boolean
  development: string
}

export type HrEmployeesFilters = {
  q?: string
  department?: string
  tier?: string
  alert?: string
  development?: string
  page?: number
  limit?: number
}

export type HrEmployeesResponse = {
  total: number
  offset: number
  limit: number
  page: number
  page_size: number
  pages: number
  sorted_by: string
  no_score_sort: boolean
  people: HrDirectoryPerson[]
  summary: {
    people: number
    departments: number
    teams: number
    wellbeing_alerts: number
    development_plans_active: number
    growth_tier_count: number
    tier_mix: Record<string, number>
  }
  filters: {
    departments: string[]
    tiers: string[]
    alerts: string[]
    development: string[]
  }
  audit_note: string
}

export type HrExecutivePulse = {
  organization: {
    suppressed?: boolean
    n?: number
    headcount?: number
    empulse_score?: number
    empulse_tier?: string
    engagement?: number | null
    wellbeing?: number | null
    innovation_participation_pct?: number
    recognition_rate_pct?: number
    elevated_burnout_count?: number
    elevated_burnout_pct?: number
    pulse_vs_q2?: number | null
    engagement_vs_q2?: number | null
    innovation_vs_q2?: number | null
    recognition_vs_q2?: number | null
    elevated_vs_jul?: number | null
    elevated_top_dept?: string | null
    intervention_success_vs_q2?: number | null
    highest_note?: string | null
  }
  interventions: {
    suppressed?: boolean
    n?: number
    active?: number
    completed?: number
    in_progress?: number
    success_pct?: number | null
    on_track_pct?: number | null
    followup_due?: number
    started_this_month?: number
  }
  impact: {
    net_impact_sar: number
    net_impact_sar_m: number
    interventions_completed: number
    ideas_implemented: number
  }
  heartbeat: Array<{
    month: string
    label: string
    performance_score: number
    engagement_score: number
    burnout_risk_pct: number
    wellbeing_score: number
    elevated_count: number
    n: number
  }>
  annotations: Array<{ month: string; label: string; kind: string }>
  department_rings: Array<{
    id: number
    name: string
    headcount: number
    suppressed?: boolean
    pulse?: number
    performance?: number | null
    engagement?: number | null
    wellbeing?: number | null
    innovation?: number | null
    burnout_risk_pct?: number | null
    at_risk?: number
    status?: string
    note?: string
  }>
  needing_support: Array<{
    id: number
    name: string
    burnout_risk_pct: number | null
    at_risk?: number
    n?: number
    status?: string
  }>
  burnout_heatmap: {
    months: string[]
    cells: Array<{
      suppressed?: boolean
      department_id?: number
      department?: string
      month?: string
      label?: string
      burnout_risk_pct?: number
      n?: number
    }>
    footnote: string
  }
  capability: {
    q3: Record<string, { count: number; pct: number; delta_pp: number }>
    q2: Record<string, { count: number; pct: number }>
    moved_up: number
    gold_elevated_burnout: number
    headcount: number
  }
  signals: Array<{
    id: string
    title: string
    detail: string
    href: string
    cta: string
    tone: string
  }>
  no_people_ranking: boolean
  suppression_min: number
}

export type HrOrganization = {
  departments: Array<{
    id: number
    name: string
    headcount: number
    suppressed?: boolean
    n?: number
    performance?: number | null
    engagement?: number | null
    wellbeing?: number | null
    burnout_risk_pct?: number | null
    innovation?: number | null
    teams: Array<{
      id: number
      name: string
      headcount: number
      suppressed?: boolean
      n?: number
      performance?: number | null
      engagement?: number | null
      wellbeing?: number | null
      burnout_risk_pct?: number | null
    }>
  }>
  needing_support: Array<{
    id: number
    name: string
    burnout_risk_pct: number | null
    n?: number
  }>
  counts: {
    departments: number
    teams: number
    employees: number
    public_ideas: number
    public_recognitions: number
  }
  no_people_ranking: boolean
  suppression_min: number
}

function employeesParams(filters: HrEmployeesFilters): URLSearchParams {
  const params = new URLSearchParams({
    limit: String(filters.limit ?? 50),
    page: String(filters.page ?? 1),
  })
  if (filters.q?.trim()) params.set('q', filters.q.trim())
  if (filters.department) params.set('department', filters.department)
  if (filters.tier) params.set('tier', filters.tier)
  if (filters.alert && filters.alert !== 'any') params.set('alert', filters.alert)
  if (filters.development && filters.development !== 'any') {
    params.set('development', filters.development)
  }
  return params
}

export function useHrEmployees(filters: HrEmployeesFilters = {}) {
  const params = employeesParams(filters)
  return useQuery({
    queryKey: ['hr', 'employees', filters],
    queryFn: () =>
      apiFetch<HrEmployeesResponse>(`/api/hr/employees/?${params.toString()}`),
  })
}

export async function exportHrEmployeesCsv(
  filters: HrEmployeesFilters = {},
): Promise<void> {
  const params = employeesParams(filters)
  params.delete('page')
  params.delete('limit')
  const headers = new Headers()
  const token = getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(`/api/hr/employees/export/?${params.toString()}`, {
    headers,
  })
  if (!res.ok) throw new Error('export_failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'empulse-employees-directory.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function useHrEmployeeProfile(id: string | undefined) {
  return useQuery({
    queryKey: ['hr', 'employees', id],
    queryFn: () => apiFetch<MemberProfile>(`/api/hr/employees/${id}/`),
    enabled: Boolean(id),
  })
}

export function useHrExecutivePulse() {
  return useQuery({
    queryKey: ['hr', 'executive-pulse'],
    queryFn: () => apiFetch<HrExecutivePulse>('/api/hr/executive-pulse/'),
  })
}

export function useHrOrganization() {
  return useQuery({
    queryKey: ['hr', 'organization'],
    queryFn: () => apiFetch<HrOrganization>('/api/hr/organization/'),
  })
}

type AggCell = {
  suppressed?: boolean
  n?: number
  performance?: number | null
  engagement?: number | null
  wellbeing?: number | null
  burnout_risk_pct?: number | null
  innovation?: number | null
  workload?: number | null
  overtime?: number | null
  mood?: number | null
  elevated?: number
  empulse_score?: number
  empulse_tier?: string
  headcount?: number
}

export type HrTeamsResponse = {
  organization: AggCell & { name: string; headcount: number }
  departments: Array<AggCell & { id: number; name: string; headcount: number }>
  teams: Array<
    AggCell & { id: number; name: string; department_id: number; headcount: number }
  >
  selected: (AggCell & {
    id: number | null
    name: string
    department: string
    department_id: number | null
    note: string | null
  }) | null
  path: { department_id: number | null; team_id: number | null }
  no_people_ranking: boolean
  suppression_min: number
}

export type HrTeamMembersResponse = {
  team: { id: number; name: string; department: string; headcount: number }
  sorted_by: string
  no_score_sort: boolean
  people: Array<{
    id: number
    full_name: string
    job_title: string
    performance_score: number | null
    performance_tier: string | null
    wellbeing_alert: boolean
  }>
  n: number
}

export type HrPerformanceResponse = {
  scope: {
    label: string
    department_id: number | null
    team_id: number | null
    n: number
    weeks: number
  }
  filters: {
    departments: Array<{ id: number; name: string }>
    teams: Array<{ id: number; name: string }>
  }
  chain: {
    workload: { from: number; to: number; delta_pct: number }
    overtime: { from: number; to: number; delta_h: number }
    engagement: { from: number; to: number; delta: number }
    burnout_risk_pct: { from: number; to: number }
    performance: { from: number; to: number }
    annotation: string
    annotation_note: string
  } | null
  series: Array<{
    week_start: string
    performance: number
    engagement: number
    workload: number
    overtime: number
    burnout_risk_pct: number
    n: number
  }>
  correlations: Array<{
    title: string
    r: number | null
    lag_weeks: number
    lag_note: string
    todo?: boolean
  }>
  people: Array<{
    id: number
    full_name: string
    job_title: string
    performance_score: number
    performance_tier: string
    burnout_risk_pct: number
    quadrant: string
    trend_12w: number[]
  }> | null
  people_sorted_by: string | null
  executive_individuals_hidden: boolean
  suppression_min: number
  no_people_ranking: boolean
}

export type HrBurnoutIntelResponse = {
  kpis: {
    elevated_count: number
    elevated_was_july: number
    share_pct: number
    target_pct: number
    forecast_q4: { low: number | null; high: number | null; projected: boolean }
    intervention_success_pct: number | null
    avg_risk_drop_pts: number | null
  }
  heatmap: {
    weeks: string[]
    cells: Array<{
      suppressed?: boolean
      department?: string
      week?: string
      burnout_risk_pct?: number
    }>
  }
  drivers: Array<{ id: string; label: string; pct: number; count: number }>
  tier_elevated: Record<string, { at_risk: number; total: number }>
  hotspots: Array<{
    team_id: number
    team: string
    department: string
    burnout_risk_pct: number | null
    n?: number
    driver: string
    action: string
  }>
  headcount: number
  suppression_min: number
  no_people_ranking: boolean
}

export type HrMoraleResponse = {
  spectrum: Array<{
    team_id: number
    team: string
    department: string
    n: number
    morale_median: number | null
    morale_delta_vs_aug: number | null
    status: string
    dots: number[]
    engagement?: number | null
    burnout_risk_pct?: number | null
    recognition_pct?: number
    innovation_pct?: number
    performance?: number | null
  }>
  grid: Array<{
    team_id: number
    team: string
    morale: number | null
    engagement?: number | null
    burnout_risk_pct?: number | null
    recognition: number
    innovation: number
    performance?: number | null
  }>
  needing_support: Array<{
    team_id: number
    team: string
    morale: number | null
    status: string
    detail_key: string
    elevated?: number
    burnout_risk_pct?: number | null
    recognition_pct?: number
  }>
  privacy_note: string
  suppression_min: number
  no_people_ranking: boolean
}

export function useHrTeams(departmentId?: number, teamId?: number) {
  const params = new URLSearchParams()
  if (departmentId) params.set('department_id', String(departmentId))
  if (teamId) params.set('team_id', String(teamId))
  const qs = params.toString()
  return useQuery({
    queryKey: ['hr', 'teams', departmentId ?? null, teamId ?? null],
    queryFn: () =>
      apiFetch<HrTeamsResponse>(`/api/hr/teams/${qs ? `?${qs}` : ''}`),
  })
}

export function useHrTeamMembers(teamId: number | undefined) {
  return useQuery({
    queryKey: ['hr', 'teams', teamId, 'members'],
    queryFn: () =>
      apiFetch<HrTeamMembersResponse>(`/api/hr/teams/${teamId}/members/`),
    enabled: Boolean(teamId),
    retry: false,
  })
}

export function useHrPerformance(opts: {
  departmentId?: number
  teamId?: number
  weeks?: number
}) {
  const params = new URLSearchParams({ weeks: String(opts.weeks ?? 26) })
  if (opts.departmentId) params.set('department_id', String(opts.departmentId))
  if (opts.teamId) params.set('team_id', String(opts.teamId))
  return useQuery({
    queryKey: ['hr', 'performance', opts],
    queryFn: () =>
      apiFetch<HrPerformanceResponse>(
        `/api/hr/performance/?${params.toString()}`,
      ),
  })
}

export function useHrBurnoutIntelligence() {
  return useQuery({
    queryKey: ['hr', 'burnout-intelligence'],
    queryFn: () =>
      apiFetch<HrBurnoutIntelResponse>('/api/hr/burnout-intelligence/'),
  })
}

export function useHrMorale() {
  return useQuery({
    queryKey: ['hr', 'morale'],
    queryFn: () => apiFetch<HrMoraleResponse>('/api/hr/morale/'),
  })
}

export type HrInnovationResponse = {
  as_of: string
  kpis: {
    ideas_this_year: number
    ideas_delta_pct_vs_q2_volume: number | null
    approval_rate_pct: number | null
    approval_period: string
    time_to_impact_wks_median: number | null
    innovation_roi: number | null
    innovation_roi_note: string
    estimated_value_sar: number
    realized_value_sar: number
  }
  funnel: {
    period: string
    stages: { stage: string; count: number; note?: string }[]
    verified_savings_sar: number
  }
  participation: {
    org_pct: number | null
    by_department: {
      department_id: number
      department: string
      participation_pct: number | null
      participants: number
      n: number
      suppressed?: boolean
    }[]
  }
  value_by_department: {
    department_id: number
    department: string
    ideas: number
    estimated_value_sar: number
    realized_value_sar: number
    n: number
  }[]
  dna: {
    n: number
    traits: {
      id: string
      score: number | null
      source?: string | null
      not_collected?: boolean
    }[]
  }
  barriers: {
    id: string
    title_key: string
    weeks?: number | null
    implementation_median?: number | null
    idea_generation_median?: number | null
    count?: number | null
    not_collected?: boolean
    period?: string
    detail?: string
  }[]
  public_ideas:
    | {
        id: number
        title: string
        status: string
        author: string
        employee_id: number
        estimated_value_sar: number | null
        realized_value_sar: number | null
        submitted_at: string | null
      }[]
    | null
  executive_individuals_hidden: boolean
  suppression_min: number
  no_people_ranking: boolean
}

export type HrRecognitionResponse = {
  as_of: string
  kpis: {
    recognition_rate_pct: number | null
    rate_delta_vs_q2: number | null
    recognitions_q3: number
    givers_q3: number
    linked_to_outcomes_pct: number | null
    linked_to_outcomes_not_collected: boolean
    never_recognized_12mo: number
    never_recognized_pct: number | null
  }
  rate_by_department: {
    department_id: number
    department: string
    rate_pct: number | null
    giver_pct: number | null
    reciprocity_pct: number | null
    recognized: number
    n: number
  }[]
  rate_by_team: {
    team_id: number
    team: string
    department: string
    rate_pct: number | null
    reciprocity_pct: number | null
    n: number
  }[]
  category_mix: {
    period: string
    total: number
    items: { type: string; label: string; count: number; pct: number | null }[]
  }
  equity: {
    band: [number, number]
    ratios: {
      id: string
      label_key: string
      ratio: number | null
      band: [number, number]
      lower_rate?: number | null
      higher_rate?: number | null
    }[]
    tier_gap_pct: number | null
  }
  insight: {
    r: number | null
    engagement_gap_pts: number | null
    threshold_pct: number
    lowest_coverage: {
      team: string
      department: string
      rate_pct: number
      engagement: number
    } | null
  }
  suppression_min: number
  no_people_ranking: boolean
  no_most_recognized_list: boolean
}

export type HrInterventionRow = {
  id: number
  display_id: string
  employee_id: number
  employee_name: string
  department: string
  team: string | null
  type: string
  rationale: string
  driver: string
  status: string
  human_approved: boolean
  baseline_risk_pct: number
  expected_to_pct: number
  followup_risk_pct: number | null
  outcome: string
  owner_name: string | null
  created_at: string | null
  followup_at: string | null
}

export type HrInterventionsResponse = {
  as_of: string
  kpis: {
    detected_30d: number
    proposed: number
    active: number
    on_track_pct: number | null
    followup_due: number
    measured: number
    improved_pct: number | null
  }
  outcome_mix: {
    worked: number
    partial: number
    no_change: number
  }
  playbook: {
    workload_rebalance: {
      strong_n: number
      total_n: number
      threshold_pts: number
    }
    recognition_only: { worked_n: number; total_n: number }
  }
  featured: {
    id: number
    display_id: string
    employee_id: number
    employee_name: string
    job_title: string
    department: string
    type: string
    rationale: string
    driver: string
    status: string
    outcome: string
    owner_name: string | null
    approved_by_name: string | null
    created_at: string | null
    approved_at: string | null
    started_at: string | null
    completed_at: string | null
    followup_at: string | null
    baseline_risk_pct: number
    followup_risk_pct: number | null
    risk_delta_pts: number | null
    expected_risk_reduction_pts: number
    engagement_before: number | null
    engagement_after: number | null
    engagement_not_collected: boolean
    performance_before: number | null
    performance_after: number | null
    performance_not_collected: boolean
  } | null
  interventions: HrInterventionRow[] | null
  signal_proposals:
    | {
        employee_id: number
        employee_name: string
        department: string
        team: string | null
        burnout_risk_pct: number
        performance_score: number
        driver: string
        suggested_type: string
        suggested_rationale: string
      }[]
    | null
  executive_individuals_hidden: boolean
  human_in_the_loop: boolean
  no_auto_start: boolean
  suppression_min: number
  no_people_ranking: boolean
}

export type HrMatrixPerson = {
  id: number
  full_name: string
  initials: string
  department: string
  team: string | null
  performance_score: number
  wellbeing_score: number
  quadrant: string
}

export type HrMatrixResponse = {
  as_of: string
  thresholds: { performance: number; wellbeing: number }
  scope: {
    department_id: number | null
    team_id: number | null
    n: number
    teams: number
  }
  counts: {
    thriving: number
    burnout_risk: number
    development: number
    critical_support: number
  }
  by_department: {
    department_id: number
    department: string
    n: number
    counts: {
      thriving: number
      burnout_risk: number
      development: number
      critical_support: number
    }
  }[]
  moved: {
    up: number | null
    down: number | null
    not_collected: boolean
  }
  people: Record<string, HrMatrixPerson[]> | null
  playbooks: Record<string, { title_key: string; detail_key: string }>
  filters: {
    departments: { id: number; name: string }[]
    teams: { id: number; name: string }[]
  }
  executive_individuals_hidden: boolean
  suppression_min: number
  no_people_ranking: boolean
}

export function useHrInnovation() {
  return useQuery({
    queryKey: ['hr', 'innovation'],
    queryFn: () => apiFetch<HrInnovationResponse>('/api/hr/innovation/'),
  })
}

export function useHrRecognition() {
  return useQuery({
    queryKey: ['hr', 'recognition'],
    queryFn: () => apiFetch<HrRecognitionResponse>('/api/hr/recognition/'),
  })
}

export function useHrInterventions() {
  return useQuery({
    queryKey: ['hr', 'interventions'],
    queryFn: () =>
      apiFetch<HrInterventionsResponse>('/api/hr/interventions/'),
  })
}

export function useCreateHrIntervention() {
  return useMutation({
    mutationFn: (body: {
      employee_id: number
      type: string
      rationale: string
      driver?: string
      expected_risk_reduction_pts?: number
    }) =>
      apiFetch<{
        id: number
        display_id: string
        status: string
        human_approved: boolean
        no_auto_start: boolean
      }>('/api/hr/interventions/', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  })
}

export function usePatchHrIntervention() {
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
      apiFetch<{
        id: number
        status: string
        human_approved: boolean
        outcome: string
      }>(`/api/hr/interventions/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ action, outcome, followup_risk_pct }),
      }),
  })
}

export function useHrMatrix(opts?: {
  department_id?: number
  team_id?: number
}) {
  const params = new URLSearchParams()
  if (opts?.department_id)
    params.set('department_id', String(opts.department_id))
  if (opts?.team_id) params.set('team_id', String(opts.team_id))
  const qs = params.toString()
  return useQuery({
    queryKey: ['hr', 'matrix', opts],
    queryFn: () =>
      apiFetch<HrMatrixResponse>(`/api/hr/matrix/${qs ? `?${qs}` : ''}`),
  })
}

export type HrCapabilityResponse = {
  as_of: string
  scope: { department_id: number | null; n: number; departments: number }
  tiers: Record<
    string,
    { count: number; pct: number; delta_pp_vs_q2: number; score_anchor: number }
  >
  alerts: {
    total: number
    by_tier: Record<string, number>
    gold_elevated: number
  }
  by_department: {
    department_id: number
    department: string
    n: number
    tiers: Record<string, number>
  }[]
  by_job_level: {
    job_level: number
    n: number
    tiers: Record<string, number>
  }[]
  movement: { up: number; down: number; same: number }
  spectrum:
    | { performance_score: number; tier: string; wellbeing_alert: boolean }[]
    | null
  filters: { departments: { id: number; name: string }[] }
  executive_individuals_hidden: boolean
  no_people_ranking: boolean
  not_a_leaderboard: boolean
  suppression_min: number
}

export type HrEconomicResponse = {
  as_of: string
  period: { start: string; label: string }
  kpis: {
    expected_annual_impact_sar: number
    net_impact_sar: number
    program_cost_sar: number
    roi_multiple: number | null
    realized_so_far_sar: number
    realized_pct_of_gross: number | null
    people_helped: number
    improved_pct: number | null
    exits_avoided: number
    estimated: boolean
  }
  breakdown: {
    retention_savings_sar: number
    productivity_gain_sar: number
    innovation_value_sar: number
    program_cost_sar: number
    gross_sar: number
    net_sar: number
    estimated: boolean
  }
  sources: { id: string; label_key: string; value_sar: number; estimated: boolean }[]
  monthly: {
    month: string
    retention_savings_sar: number
    productivity_gain_sar: number
    innovation_value_sar: number
    program_cost_sar: number
    net_impact_sar: number
    estimated: boolean
  }[]
  by_department: {
    department_id: number
    department: string
    n: number
    retention_savings_sar: number
    productivity_gain_sar: number
    innovation_value_sar: number
    program_cost_sar: number
    net_impact_sar: number
    estimated: boolean
  }[]
  assumptions: {
    id: string
    formula: string
    note: string
    estimated: boolean
  }[]
  impact_story: {
    display_id: string
    type: string
    driver: string
    department: string
    team: string | null
    baseline_risk_pct: number
    followup_risk_pct: number | null
    risk_delta_pts: number | null
    outcome: string
    financial_impact_sar: number | null
    financial_impact_projected: boolean
    employee_name: string | null
  } | null
  values_estimated: boolean
  suppression_min: number
  no_people_ranking: boolean
}

export type HrReportsResponse = {
  catalog: {
    id: string
    title_key: string
    cadence: string
    audience: string
  }[]
  selected: string
  report: {
    as_of: string
    confidential: boolean
    individuals_included: boolean
    suppression_min: number
    headcount: number
    elevated_burnout: number
    org_pulse: {
      engagement: number | null
      performance: number | null
      wellbeing: number | null
      burnout_risk_pct: number | null
    }
    capability_tiers: Record<string, { count: number; pct: number | null }>
    burnout_trend_months: { month: string; elevated: number }[]
    economic: {
      gross_impact_sar: number
      net_impact_sar: number
      program_cost_sar: number
      roi_multiple: number | null
      estimated: boolean
    }
    interventions: Record<string, number>
    innovation: Record<string, number>
    departments: {
      department: string
      n: number
      performance: number | null
      engagement: number | null
      burnout_risk_pct: number | null
    }[]
  }
  no_people_ranking: boolean
  executive_safe: boolean
}

export type HrGovernanceResponse = {
  as_of: string
  principles: {
    human_in_the_loop: boolean
    hitl_approval_pct: number | null
    explainable: boolean
    minimal_data: boolean
  }
  privacy_rules: { id: string; title_key: string; body_key: string }[]
  data_uses: { uses: string[]; never_uses: string[] }
  fairness: {
    band: [number, number]
    metric: string
    ratios: {
      id: string
      ratio: number | null
      band: [number, number]
      not_collected?: boolean
    }[]
    last_audit_date: string | null
    last_audit_projected: boolean
  }
  audit_log: {
    total: number
    action_counts: Record<string, number>
    actions: string[]
    rows: {
      id: number
      action: string
      actor_email: string | null
      actor_id: number | null
      employee_id: number | null
      employee_name: string | null
      path: string
      metadata: Record<string, unknown>
      created_at: string
    }[]
    limit: number
    filters: { action: string | null; from: string | null; to: string | null }
  }
  hr_admin_only: boolean
  suppression_min: number
  no_people_ranking: boolean
}

export type HrPulseAIStub = {
  stub?: boolean
  step8_llm?: boolean
  question: string
  language?: string
  refused?: boolean
  refusal_reason?: string
  headline?: string
  data_used: {
    label: string
    value: number | string | null
    detail?: string
    tool?: string
  }[]
  findings: string[]
  recommendation: {
    summary: string
    actions: string[]
    propose_intervention?: {
      type: string
      driver: string
      rationale: string
      requires_confirmation?: boolean
    } | null
  }
  disclaimer?: string
  scope?: {
    organization_wide: boolean
    aggregated: boolean
    suppression_min: number
    no_private_checkin_text: boolean
    query_logged: boolean
    query_logged_note?: string
  }
  never_sees: string[]
  no_people_ranking?: boolean
  tools_called?: string[]
  engine?: string
  executive_aggregates_only?: boolean
  individuals_included?: boolean
  awaiting_confirmation?: boolean
  proposed_intervention?: { id: number; status: string } | null
}

export function useHrCapability(opts?: { department_id?: number }) {
  const params = new URLSearchParams()
  if (opts?.department_id)
    params.set('department_id', String(opts.department_id))
  const qs = params.toString()
  return useQuery({
    queryKey: ['hr', 'capability', opts],
    queryFn: () =>
      apiFetch<HrCapabilityResponse>(
        `/api/hr/capability/${qs ? `?${qs}` : ''}`,
      ),
  })
}

export function useHrEconomic() {
  return useQuery({
    queryKey: ['hr', 'economic'],
    queryFn: () => apiFetch<HrEconomicResponse>('/api/hr/economic/'),
  })
}

export function useHrReports(report?: string) {
  const params = new URLSearchParams()
  if (report) params.set('report', report)
  const qs = params.toString()
  return useQuery({
    queryKey: ['hr', 'reports', report],
    queryFn: () =>
      apiFetch<HrReportsResponse>(`/api/hr/reports/${qs ? `?${qs}` : ''}`),
  })
}

export async function downloadHrReportExport(opts: {
  report: string
  format: 'csv' | 'html'
}) {
  const params = new URLSearchParams({
    report: opts.report,
    export_format: opts.format,
  })
  const res = await fetch(`/api/hr/reports/export/?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${getAccessToken() ?? ''}`,
    },
  })
  if (!res.ok) throw new Error('export_failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  if (opts.format === 'html') {
    window.open(url, '_blank', 'noopener,noreferrer')
  } else {
    const a = document.createElement('a')
    a.href = url
    a.download = `empulse_${opts.report}.csv`
    a.click()
  }
  URL.revokeObjectURL(url)
}

export function useHrGovernance(opts?: {
  action?: string
  from?: string
  to?: string
}) {
  const params = new URLSearchParams()
  if (opts?.action) params.set('action', opts.action)
  if (opts?.from) params.set('from', opts.from)
  if (opts?.to) params.set('to', opts.to)
  const qs = params.toString()
  return useQuery({
    queryKey: ['hr', 'governance', opts],
    queryFn: () =>
      apiFetch<HrGovernanceResponse>(
        `/api/hr/governance/${qs ? `?${qs}` : ''}`,
      ),
  })
}

export function useHrPulseAIStub() {
  return useMutation({
    mutationFn: (body: {
      question: string
      confirm_intervention?: boolean
      intervention?: Record<string, unknown>
    }) =>
      apiFetch<HrPulseAIStub>('/api/hr/pulseai/', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  })
}

export type SimulateControls = {
  workload_pct?: number
  task_streams?: number
  recognition_pct?: number
  training_hours_month?: number
  shared_on_call?: boolean
  engagement_plus?: number
  work_life_balance_plus?: number
}

export type SimulateResult = {
  scope: {
    scope: string
    scope_id: number | null
    label?: string
    department?: string
    team?: string
  }
  people: number
  levers: Record<string, number>
  controls: SimulateControls
  burnout_risk_avg_pct: [number, number]
  high_risk_count: [number, number]
  attrition_risk_avg_pct: [number, number]
  expected_exits_12m: [number, number]
  expected_exit_cost_sar: [number, number]
  estimated_saving_sar: number
  signals: {
    engagement_avg: [number, number]
    workload_avg: [number, number]
    performance_avg: [number, number]
    performance_note: string
    estimated: boolean
  }
  assumptions: {
    lever_mapping: {
      control: string
      ui: string
      lever: string
      delta: unknown
      mapping: string
    }[]
    default_levers: Record<string, number>
    applied_levers: Record<string, number>
    replacement_cost_multiplier: number
    high_risk_pct: number
    model: string
    data: string
    estimated: boolean
  }
  disclaimer: string
  estimated: boolean
  no_people_ranking: boolean
  individuals_included: boolean
  executive_aggregates_only?: boolean
  suppression_min: number
  manager_simulate_allowed: boolean
  scenario_label?: string
}

export type SimulateMeta = {
  allowed: boolean
  ask_hr: boolean
  manager_simulate_allowed: boolean
  role?: string
  default_levers: Record<string, number>
  control_schema?: {
    workload_pct: { min: number; max: number; step: number; default: number }
    task_streams: { min: number; max: number; step: number; default: number }
    recognition_pct: { options: number[]; default: number }
    training_hours_month: { options: number[]; default: number }
    shared_on_call: { default: boolean }
  }
  departments: { id: number; name: string }[]
  teams: {
    id: number
    name: string
    department_id: number
    department: string | null
  }[]
  disclaimer: string
  suppression_min: number
  estimated: boolean
}

export function useSimulateMeta() {
  return useQuery({
    queryKey: ['hr', 'simulate', 'meta'],
    queryFn: () => apiFetch<SimulateMeta>('/api/hr/simulate/meta/'),
  })
}

export function useSimulate() {
  return useMutation({
    mutationFn: (body: {
      scope: 'organization' | 'department' | 'team'
      scope_id?: number | null
      levers?: Record<string, number>
      controls?: SimulateControls
    }) =>
      apiFetch<SimulateResult>('/api/hr/simulate/', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  })
}

export function useSimulateCompare() {
  return useMutation({
    mutationFn: (body: {
      scope: 'organization' | 'department' | 'team'
      scope_id?: number | null
      scenarios: {
        label?: string
        levers?: Record<string, number>
        controls?: SimulateControls
      }[]
    }) =>
      apiFetch<{
        scenarios: SimulateResult[]
        disclaimer: string
        estimated: boolean
      }>('/api/hr/simulate/compare/', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  })
}
