import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from './client'
import type { BurnoutDrivers, WeeklyTrajectoryPoint } from './manager'

export type MeDimensions = {
  task_completion: number | null
  attendance: number | null
  professionalism: number | null
  innovation: number | null
  collaboration: number | null
  digital: number | null
  engagement: number | null
  wellbeing: number | null
}

export type MeCurrent = {
  as_of: string
  performance_score: number
  performance_tier: string
  performance_delta: number | null
  points_to_next_tier: number
  next_tier: string | null
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
  mood_score: number
  work_life_balance: number
  job_satisfaction: number
  recognition_90d: number
  ideas_submitted_12m: number
  ideas_approved_12m: number
  ideas_implemented_12m: number
  drivers: BurnoutDrivers
  dimensions: MeDimensions
  weights: Record<string, number>
}

export type MeChange = {
  metric: string
  from: number
  to: number
  delta: number
  unit: string
}

export type MeOverview = {
  id: number
  full_name: string
  first_name: string
  job_title: string
  department: string
  team: string | null
  current: MeCurrent | null
  trajectory: WeeklyTrajectoryPoint[]
  changes: MeChange[]
  recognitions: Array<{
    id: number
    type: string
    message: string
    created_at: string
    giver_name: string
  }>
  ideas: Array<{
    id: number
    display_id: string
    title: string
    status: string
    category: string
    submitted_at: string | null
    estimated_value_sar: number | null
    realized_value_sar: number | null
  }>
  balance: {
    planned_hours: number
    work_hours: number | null
    work_hours_projected: boolean
    recovery: string | null
    focus_hours: number | null
    meeting_hours: number | null
    after_hours: number | null
    after_hours_note: string
  }
  privacy: { own_data_only: boolean; checkins_private: boolean }
}

export type FormulaRow = {
  id: string
  value: number | null
  weight: number
  weight_effective: number | null
  contribution: number | null
  measured: boolean
  label_status: string
}

export type MeRecognitionItem = {
  id: number
  type: string
  message: string
  created_at: string
  is_public?: boolean
  giver_first_name?: string
  giver_name?: string
}

export type MePerformance = {
  id: number
  full_name: string
  first_name: string
  job_title: string
  team: string | null
  current: MeCurrent | null
  journey: Array<{ month: string; score: number }>
  own_trend: {
    from_month: string
    to_month: string
    delta: number
    personal_best: boolean
  } | null
  trajectory: WeeklyTrajectoryPoint[]
  formula_rows: FormulaRow[]
  formula_exact: number | null
  recognitions: MeRecognitionItem[]
  recognition_types: string[]
  no_ranking: boolean
  tier_bands: Record<string, number>
}

export type MeTwin = {
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
  current: MeCurrent | null
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
  trajectory: WeeklyTrajectoryPoint[]
  formula_rows: FormulaRow[]
  formula_exact: number | null
  recognition_types: string[]
  changes: MeChange[]
  own: boolean
}

export type MeDna = {
  id: number
  full_name: string
  traits: Array<{
    id: string
    score: number | null
    source: string | null
    projected: boolean
  }>
  strongest: { id: string; score: number | null } | null
  development: { id: string; score: number | null } | null
  signature: {
    is_example: boolean
    trait_id: string | null
    score: number | null
    skills: string[]
    ideas_count: number
  }
  ideas: Array<{
    id: number
    display_id: string
    title: string
    status: string
    category: string
    submitted_at: string | null
    novelty_score: number
    feasibility_score: number
    business_value_score: number
    estimated_value_sar: number | null
    realized_value_sar: number | null
  }>
  innovation_score: number | null
  ideas_submitted_12m: number
  no_ranking: boolean
  org_median_note: string
}

export type MeMarketplace = {
  metrics: {
    ideas_submitted: number
    approved: number
    in_build: number
    implemented: number
    realized_savings_sar: number
  }
  ideas: Array<{
    id: number
    display_id: string
    title: string
    category: string
    status: string
    submitted_at: string
    estimated_value_sar: number | null
    realized_value_sar: number | null
    author: { first_name: string; team: string | null }
    novelty_score: number
    feasibility_score: number
    business_value_score: number
  }>
  sorted_by: string
  public_only: boolean
}

export type MeGrowth = {
  id: number
  full_name: string
  first_name: string
  job_title: string
  manager_name: string | null
  hire_date: string
  skills: Array<{ skill: string; category: string; level: number }>
  readiness: Array<{
    skill: string
    category: string
    level: number
    score: number
    target: number
    met: boolean
  }>
  recommendations: Array<{
    title: string
    reason: string
    labelled: boolean
    skill: string
    gap: number | null
  }>
  recommendations_labelled: boolean
  training: {
    times_last_year: number
    hours_proxy: number | null
    hours_projected: boolean
  }
  ideas_implemented_12m: number
}

export type MeRecognitionWall = {
  wall: Array<{
    id: number
    type: string
    message: string
    created_at: string
    is_public?: boolean
    giver: { first_name: string; team: string | null }
    receiver: { first_name: string; team: string | null }
  }>
  received: MeRecognitionItem[]
  colleagues: Array<{
    id: number
    first_name: string
    full_name: string
    team: string | null
  }>
  public_count: number
  public_only: boolean
  no_leaderboard: boolean
}

export type MePulseAIStub = {
  stub: boolean
  own_data_only: boolean
  question: string
  data_used: Array<{ label: string; value: number | null }>
  findings: string[]
  recommendation: { summary: string; actions: string[] }
  never_sees: string[]
}

export type MeReports = {
  id: number
  full_name: string
  generated_at: string
  own_data_only: boolean
  rows: Array<{ section: string; key: string; value: string | number }>
  csv_header: string[]
}

export type MeSettings = {
  id: number
  full_name: string
  stub: boolean
  privacy_stub: {
    share_checkin_trend: boolean
    show_on_recognition_wall: boolean
    manager_may_see_wellbeing: boolean
  }
  visibility: {
    manager_can_see: string[]
    manager_cannot_see: string[]
    hr_can_see: string[]
    hr_cannot_see: string[]
    executive_sees: string[]
  }
}

export function useMeOverview() {
  return useQuery({
    queryKey: ['me', 'overview'],
    queryFn: () => apiFetch<MeOverview>('/api/me/overview/'),
  })
}

export function useMePerformance() {
  return useQuery({
    queryKey: ['me', 'performance'],
    queryFn: () => apiFetch<MePerformance>('/api/me/performance/'),
  })
}

export function useMeTwin() {
  return useQuery({
    queryKey: ['me', 'twin'],
    queryFn: () => apiFetch<MeTwin>('/api/me/twin/'),
  })
}

export function useMeInnovationDna() {
  return useQuery({
    queryKey: ['me', 'innovation-dna'],
    queryFn: () => apiFetch<MeDna>('/api/me/innovation-dna/'),
  })
}

export function useMeInnovationLab() {
  return useQuery({
    queryKey: ['me', 'innovation-lab'],
    queryFn: () =>
      apiFetch<{ id: number; full_name: string; ideas: MeDna['ideas'] }>(
        '/api/me/innovation-lab/',
      ),
  })
}

export function useSubmitIdea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      title: string
      category?: string
      expected_cost_sar?: number
      expected_savings_sar?: number
    }) =>
      apiFetch<{
        id: number
        display_id: string
        status: string
        roi: number | null
        pulseai: {
          projected: boolean
          readiness: number
          novelty: number
          feasibility: number
          expected_value: number
          potential_impact: number
          roi_estimate: number | null
          note: string
        }
      }>('/api/me/innovation-lab/', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useMeMarketplace() {
  return useQuery({
    queryKey: ['me', 'marketplace'],
    queryFn: () => apiFetch<MeMarketplace>('/api/me/marketplace/'),
  })
}

export function useMeGrowth() {
  return useQuery({
    queryKey: ['me', 'growth'],
    queryFn: () => apiFetch<MeGrowth>('/api/me/growth/'),
  })
}

export function useMeRecognitionWall() {
  return useQuery({
    queryKey: ['me', 'recognition'],
    queryFn: () => apiFetch<MeRecognitionWall>('/api/me/recognition/'),
  })
}

export function useSendRecognition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      receiver_id: number
      type: string
      message: string
      is_public?: boolean
    }) =>
      apiFetch<{ id: number }>('/api/me/recognition/', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['me', 'recognition'] })
    },
  })
}

export function useMePulseAIStub() {
  return useMutation({
    mutationFn: (question: string) =>
      apiFetch<MePulseAIStub>('/api/me/pulseai/', {
        method: 'POST',
        body: JSON.stringify({ question }),
      }),
  })
}

export function useMeReports() {
  return useQuery({
    queryKey: ['me', 'reports'],
    queryFn: () => apiFetch<MeReports>('/api/me/reports/'),
  })
}

export function useMeSettings() {
  return useQuery({
    queryKey: ['me', 'settings'],
    queryFn: () => apiFetch<MeSettings>('/api/me/settings/'),
  })
}

export function usePatchMeSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<MeSettings['privacy_stub']>) =>
      apiFetch<{ stub: boolean; saved: boolean; privacy_stub: MeSettings['privacy_stub'] }>(
        '/api/me/settings/',
        { method: 'PATCH', body: JSON.stringify(body) },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['me', 'settings'] })
    },
  })
}
