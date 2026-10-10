"""Generates docs/DATA_SCHEMA.md from the real CSV frames so docs and data never drift apart."""
from __future__ import annotations

from pathlib import Path

import pandas as pd

D = {
    "departments": ("The 6 departments of Horizon Group.", {
        "id": "Primary key.", "name": "Department name.", "head_id": "FK -> employees.id, the department head.",
        "headcount": "People in the department (derived; recompute in the app)."}),
    "teams": ("The 31 teams. A team has several line managers (each with 5-12 direct reports).", {
        "id": "Primary key.", "name": "Team name (e.g. Platform Reliability).", "department_id": "FK -> departments.id.",
        "head_id": "FK -> employees.id, the team head.", "headcount": "People in the team (derived)."}),
    "employees": ("Static profile of each person (1,240). One row per person.", {
        "id": "Primary key.", "employee_code": "Display code, HZ0001...", "first_name": "First name.", "last_name": "Last name.",
        "full_name": "First + last name. Unique.", "email": "Work email. Unique. The 3 demo accounts use layla@, yasmin@, rana@horizon.demo.",
        "gender": "M or F (used only for fairness analytics).", "age": "Years.", "job_title": "Job title.",
        "job_level": "1-5 (5 = department head).", "department_id": "FK -> departments.id.",
        "team_id": "FK -> teams.id. Null for department heads.", "manager_id": "FK -> employees.id, the direct (line) manager. Null for department heads.",
        "hire_date": "ISO date.", "tenure_years": "Years at the company.", "monthly_income_sar": "Synthetic monthly salary in SAR. Sensitive: HR only.",
        "income_ratio": "Salary divided by the median for the job level (model input).", "years_since_promotion": "Years since last promotion (model input).",
        "work_location": "City.", "work_mode": "Hybrid / On-site / Remote.",
        "app_role": "Suggested app role: employee, manager, hr. Users are created only for the demo accounts.",
        "is_manager": "1 if the person manages others.", "is_demo_person": "1 for the named people from the Figma design."}),
    "employee_current": ("Latest weekly snapshot per person: raw signals, scores and model outputs. One row per person, "
                         "re-written by the scoring job (in the app: a table refreshed by a management command).", {
        "employee_id": "PK and FK -> employees.id.", "as_of": "Week start (Monday) of the snapshot.",
        "workload_index": "0-100 workload pressure.", "overtime_hours_monthly": "Overtime hours per month.",
        "work_life_balance": "1-4 rolling survey average.", "job_satisfaction": "1-4 rolling survey average.",
        "mood_score": "1-5 weekly pulse mood (not a clinical measure).", "engagement_score": "0-100.",
        "absence_days_annual": "Absence days in the last 12 months.", "recognition_90d": "Recognitions received in the last 90 days (equals count in recognitions).",
        "training_times_last_year": "Training events in the last year.", "ideas_submitted_12m": "Ideas submitted in 12 months (equals count in ideas).",
        "ideas_approved_12m": "Ideas approved or implemented.", "ideas_implemented_12m": "Ideas implemented.",
        "innovation_score": "0-100 from idea volume, quality, approval and implementation.",
        "task_completion_rate": "0-100 on-time completion.", "task_quality_score": "0-100.", "collaboration_score": "0-100.",
        "performance_score": "0-100 = 0.30 completion + 0.30 quality + 0.20 collaboration + 0.20 innovation. NEVER includes wellbeing.",
        "performance_tier": "Gold >= 90, Silver 80-89, Bronze 70-79, Growth < 70.",
        "wellbeing_score": "0-100 composite of mood, work-life balance, workload, engagement, overtime. Shown separately from performance.",
        "burnout_risk_pct": "Model output 0-100 (probability of a burnout event in 90 days). Decision support, NOT a diagnosis.",
        "burnout_level": "Low < 40, Moderate 40-59, High >= 60.", "attrition_risk_pct": "Model output 0-100 (leaving within 12 months).",
        "attrition_level": "Same bands as burnout_level.",
        "burnout_drivers": "JSON text: {increasing:[{feature,label,value,baseline_value,impact_pts}], protective:[...]} (exact Shapley values vs. the average employee).",
        "attrition_drivers": "Same JSON structure for the attrition model.",
        "burnout_change_6w_pts": "Burnout risk now minus 6 weeks ago, in percentage points."}),
    "weekly_metrics": ("52 weekly points per person (1,240 x 52 rows). The last week equals employee_current.", {
        "employee_id": "FK -> employees.id.", "week_start": "Monday ISO date. (employee_id, week_start) is unique.",
        "workload_index": "0-100.", "overtime_hours_monthly": "Overtime rate.", "mood_score": "1-5.", "engagement_score": "0-100.",
        "wellbeing_score": "0-100.", "performance_score": "0-100.", "burnout_risk_pct": "Model output for that week.",
        "pulse_submitted": "1 if the person answered the weekly pulse (for participation rate)."}),
    "interventions": ("Proposed / approved / running / finished support actions. Human in the loop: AI proposes, a person approves.", {
        "id": "Primary key.", "employee_id": "FK -> employees.id (the person supported).", "type": "Intervention type.",
        "rationale": "Why it is proposed.", "driver": "Model feature that triggered it.",
        "status": "proposed, approved, in_progress, completed, declined, cancelled.", "proposed_by": "PulseAI or Manager.",
        "owner_id": "FK -> employees.id, the manager who owns it.", "approved_by_id": "FK -> employees.id, who approved (null until approved).",
        "created_at": "ISO date.", "approved_at": "ISO date or empty.", "started_at": "ISO date or empty.", "completed_at": "ISO date or empty.",
        "followup_at": "Date the result was measured (4 weeks after completion) or empty.",
        "expected_risk_reduction_pts": "Planned effect.", "cost_sar": "Estimated cost in SAR.",
        "human_approved": "1 once a person approved it. Nothing starts without this.",
        "baseline_risk_pct": "Burnout risk when it was created.", "followup_risk_pct": "Burnout risk at follow-up, empty if not yet measured.",
        "outcome": "worked (<= -8 pts), partial (-3 to -8), no_change, pending."}),
    "ideas": ("Innovation Lab ideas (12 months).", {
        "id": "Primary key.", "employee_id": "FK -> employees.id.", "title": "Idea title.", "category": "Category.",
        "status": "under_review, approved, rejected, implemented.", "novelty_score": "0-100.", "feasibility_score": "0-100.",
        "business_value_score": "0-100.", "submitted_at": "ISO date.", "decided_at": "ISO date or empty.", "implemented_at": "ISO date or empty.",
        "estimated_value_sar": "Expected yearly value if approved.", "realized_value_sar": "Realised value if implemented."}),
    "recognitions": ("Recognition events (Wall of Impact). Shown as a feed, never ranked.", {
        "id": "Primary key.", "giver_id": "FK -> employees.id.", "receiver_id": "FK -> employees.id.", "type": "Impact, Collaboration, Innovation, Mentorship, Above & Beyond, Customer Focus.",
        "message": "Short message.", "created_at": "ISO date.", "is_public": "1 if visible on the wall."}),
    "skills": ("Skills per person for the Digital Twin / Growth Path (6 per person).", {
        "id": "Primary key.", "employee_id": "FK -> employees.id.", "skill": "Skill name.", "category": "Technical or Soft.", "level": "1-5."}),
    "economic_impact_monthly": ("Economic impact by department and month, derived from risk, performance, interventions and ideas.", {
        "month": "First day of the month. (month, department_id) is unique.", "department_id": "FK -> departments.id.", "headcount": "People in the department.",
        "avg_burnout_risk_pct": "Mean weekly burnout risk in the month.", "avg_wellbeing_score": "Mean wellbeing.", "avg_performance_score": "Mean performance.",
        "interventions_completed": "Interventions created that month that are completed.", "ideas_implemented": "Ideas implemented that month.",
        "expected_exits_baseline": "headcount x 13% / 12 (assumed yearly attrition 13%).",
        "exits_avoided": "baseline exits x min(3 x relative risk drop vs first 3 months, 0.5).",
        "retention_savings_sar": "exits_avoided x average annual salary x 1.0 (replacement cost multiplier).",
        "productivity_gain_sar": "Less burnout = fewer lost productive days: headcount x avg monthly salary x 0.5 x (drop in average burnout risk, in points, vs first 3 months) / 100.",
        "innovation_value_sar": "Sum of realized_value_sar of ideas implemented in the month.",
        "program_cost_sar": "Intervention costs + platform running cost share.", "net_impact_sar": "retention + productivity + innovation - program cost.",
        "roi_pct": "net impact / program cost x 100."}),
}

RULES = """## Rules the API must enforce (from the design)

1. **No leaderboards.** Never order people by `performance_score`, `innovation_score` or recognition counts. Lists are alphabetical (`full_name`).
2. **Wellbeing is never part of performance.** `performance_score` has no wellbeing input. Show `wellbeing_score` and risk separately.
3. **Privacy by role.** Employee: own rows only. Manager: rows of people whose `manager_id` is the manager (direct reports). HR: any individual, but each profile read must write an `AuditLog` row. Executive: aggregates only.
4. **Small groups are suppressed.** Any aggregate over fewer than 5 people returns "suppressed", never numbers.
5. **Sensitive fields:** `monthly_income_sar`, `income_ratio`, `attrition_*`, `burnout_drivers` are HR/manager-only (manager: direct reports only). Employees see their own wellbeing and their own risk explanation, never someone else's.
6. **Human in the loop.** An intervention only starts when `human_approved = 1`.
7. Burnout and attrition risk are **decision support, not a medical or psychological diagnosis**.
"""


def _type(s: pd.Series) -> str:
    if pd.api.types.is_integer_dtype(s):
        return "int"
    if pd.api.types.is_float_dtype(s):
        return "float"
    return "text"


def write_schema_doc(tables: dict, path: Path, as_of: str) -> None:
    missing = []
    out = ["# EMPULSE data schema", "",
           "Generated by `ml/02_build_dataset.py` from the real CSV files in `data/generated/` (do not edit by hand; re-run the script).", "",
           f"All data is **synthetic**. As-of week: **{as_of}**. 1,240 people, 6 departments, 31 teams, 52 weekly points per person.",
           "Booleans are 0/1. Dates are ISO `YYYY-MM-DD`. Empty cell = null. Primary keys are called `id` (except `employee_current.employee_id`).", "",
           "## Relationships", "",
           "```", "departments 1-n teams 1-n employees", "employees.manager_id -> employees.id      (line manager; ~5-12 direct reports)",
           "employee_current / weekly_metrics / skills / ideas / interventions -> employees", "recognitions.giver_id / receiver_id -> employees",
           "economic_impact_monthly -> departments", "```", "",
           "Demo logins (created by `seed_demo`, password `empulse123`): `layla@horizon.demo` (employee), `yasmin@horizon.demo` (manager of Platform Reliability, 9 direct reports), "
           "`rana@horizon.demo` (hr). Match them to `employees.email`.", "",
           "## Model files (`ml/models/`)", "",
           "`burnout_model.pkl` and `attrition_model.pkl` are joblib bundles. Load with `ml/empulse_ml.py` (`load_bundle`, `predict_proba`, `drivers`, `simulate`). "
           "Do not retrain in web requests. `simulate()` powers the What-if Simulator (H13). Scores in `employee_current` were produced by these models.", "",
           RULES, "## Tables", ""]
    for name, df in tables.items():
        desc, cols = D[name]
        out += [f"### `{name}` ({len(df):,} rows)", "", desc, "", "| Column | Type | Description |", "|---|---|---|"]
        for c in df.columns:
            if c not in cols:
                missing.append(f"{name}.{c}")
            out.append(f"| `{c}` | {_type(df[c])} | {cols.get(c, '')} |")
        out.append("")
    if missing:
        raise RuntimeError(f"Undocumented columns: {missing}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(out), encoding="utf-8")
