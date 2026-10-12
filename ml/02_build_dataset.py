"""Build the EMPULSE demo dataset (1,240 people, 6 departments, 31 teams) and score it.

Run from the project root (after 01_train_models.py):   python ml/02_build_dataset.py

Writes:
  data/generated/*.csv                      tables for the Django `seed_demo` command
  docs/DATA_SCHEMA.md                       schema documentation (generated, always in sync)
  ml/reports/data_summary.md                sanity checks of the generated data

ALL DATA IS SYNTHETIC. Names are invented. Risk numbers come from the trained models.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
import empulse_ml as E  # noqa: E402
import gen_core as G  # noqa: E402
import names as N  # noqa: E402
from schema_docs import write_schema_doc  # noqa: E402

SEED = 20261011
AS_OF = pd.Timestamp("2026-10-05")           # Monday of the latest week
N_WEEKS = 52
WEEKS = [AS_OF - pd.Timedelta(weeks=N_WEEKS - 1 - i) for i in range(N_WEEKS)]
OUT = ROOT / "data" / "generated"
rng = np.random.default_rng(SEED)

burn_b = E.load_bundle("burnout")
att_b = E.load_bundle("attrition")

# ------------------------------------------------------------------ named people (from the Figma design)
PR = "Platform Reliability"
NAMED_PR = [  # the 9 direct reports of Yasmin Hadi, in the order shown in the design
    dict(first="Khalid", last="Mansour", g="M", title="Platform Engineer", level=3, risk=72, wellbeing=30, perf=91, trend=1.5),
    dict(first="Tariq", last="Zaki", g="M", title="Site Reliability Engineer", level=3, risk=66, trend=1.1),
    dict(first="Huda", last="Nasser", g="F", title="Site Reliability Engineer", level=3, risk=63, trend=0.9),
    dict(first="Sami", last="Youssef", g="M", title="Systems Engineer", level=2, risk=52, trend=0.5),
    dict(first="Rami", last="Khoury", g="M", title="DevOps Engineer", level=2, risk=47, trend=0.0),
    dict(first="Dana", last="Farouk", g="F", title="Platform Engineer", level=2, risk=44, trend=0.2),
    dict(first="Noura", last="Al-Saud", g="F", title="Cloud Engineer", level=2, risk=41, trend=0.1),
    dict(first="Faisal", last="Rahman", g="M", title="Network Engineer", level=2, risk=38, trend=-0.1),
    dict(first="Maha", last="Al-Otaibi", g="F", title="Staff Engineer", level=4, risk=35, trend=0.0),
]
FIXED = {
    ("dept_head", "People"): dict(first="Rana", last="Aziz", g="F", title="Chief People Officer", level=5,
                                            email="rana@horizon.demo", app_role="hr", risk=20),
    ("manager", PR, 0): dict(first="Yasmin", last="Hadi", g="F", title="Engineering Manager", level=4,
                             email="yasmin@horizon.demo", app_role="manager", risk=30),
    ("manager", "Customer Insights", 0): dict(first="Omar", last="Saeed", g="M", title="Insights Manager", level=4,
                                              email="omar.saeed@horizon.demo", app_role="manager", risk=28),
    ("ic", "Customer Insights", 0, 0): dict(first="Layla", last="Haddad", g="F", title="Senior Data Analyst", level=3,
                                            email="layla@horizon.demo", risk=22, perf=87, trend=0.1),
    ("ic", "Employee Experience", 0, 0): dict(first="Lina", last="Farhat", g="F", title="HR Business Partner", level=3,
                                              app_role="hr", risk=25),
}
for i, p in enumerate(NAMED_PR):
    FIXED[("ic", PR, 0, i)] = p


def split_even(total, k):
    base, rem = divmod(total, k)
    return [base + (1 if i < rem else 0) for i in range(k)]


# ------------------------------------------------------------------ 1. organisation structure
def build_roles():
    roles = []
    team_rows, dept_rows = [], []
    team_id = 0
    for d_idx, (dname, total, teams) in enumerate(N.DEPT_SPEC, start=1):
        dept_rows.append(dict(id=d_idx, name=dname))
        roles.append(dict(dept=dname, team=None, kind="dept_head", group=None, fixed=FIXED.get(("dept_head", dname))))
        forced = {PR: 46}
        free = [t for t in teams if t not in forced]
        rem = total - 1 - sum(v for t, v in forced.items() if t in teams)
        w = rng.uniform(0.8, 1.2, len(free))
        sz = np.floor(w / w.sum() * rem).astype(int)
        sz[: rem - sz.sum()] += 1
        sizes = {t: forced.get(t) or int(sz[free.index(t)]) for t in teams}
        for tname in teams:
            team_id += 1
            n = sizes[tname]
            team_rows.append(dict(id=team_id, name=tname, department=dname))
            roles.append(dict(dept=dname, team=tname, kind="team_head", group=None, fixed=None))
            k = max(2, round((n - 1) / 9.5))
            ics = n - 1 - k
            groups = [9] + split_even(ics - 9, k - 1) if tname == PR else split_even(ics, k)
            for gi, gsize in enumerate(groups):
                roles.append(dict(dept=dname, team=tname, kind="manager", group=(tname, gi),
                                  fixed=FIXED.get(("manager", tname, gi))))
                for j in range(gsize):
                    roles.append(dict(dept=dname, team=tname, kind="ic", group=(tname, gi),
                                      fixed=FIXED.get(("ic", tname, gi, j))))
    return roles, dept_rows, team_rows


roles, dept_rows, team_rows = build_roles()
NP = len(roles)
assert NP == 1240, NP

# ------------------------------------------------------------------ 2. base features
team_eff = {t["name"]: rng.normal(0, 0.40) for t in team_rows}
team_eff[PR] = 0.75
group_eff = {}
eff = np.zeros(NP)
for i, r in enumerate(roles):
    e = N.DEPT_EFFECT[r["dept"]]
    if r["team"]:
        e += team_eff[r["team"]]
    if r["group"]:
        group_eff.setdefault(r["group"], rng.normal(0, 0.25))
        e += group_eff[r["group"]]
    eff[i] = e
feat = G.sample_features(NP, rng, eff)

# roles: levels, titles, tenure
kind = np.array([r["kind"] for r in roles])
level = feat["job_level"].to_numpy().copy()
level = np.where(level >= 5, 3, level)
level = np.where(kind == "ic", np.clip(level, 1, 4), level)
level = np.where(kind == "manager", rng.choice([3, 4], NP, p=[0.7, 0.3]), level)
level = np.where(kind == "team_head", 4, level)
level = np.where(kind == "dept_head", 5, level)
for i, r in enumerate(roles):
    if r["fixed"]:
        level[i] = r["fixed"]["level"]
feat["job_level"] = level
feat["tenure_years"] = np.where(level >= 3, np.maximum(feat["tenure_years"], rng.uniform(2.5, 9, NP)), feat["tenure_years"]).round(1)
feat["years_since_promotion"] = np.minimum(feat["years_since_promotion"], feat["tenure_years"]).round(1)
feat["monthly_income_sar"] = ((np.array([G.LEVEL_INCOME[int(l)] for l in level]) * feat["income_ratio"]) / 50).round() * 50

# ------------------------------------------------------------------ 3. calibrate the named people to the design
LOW = dict(workload_index=48, overtime_hours_monthly=1.5, work_life_balance=3.8, job_satisfaction=3.6,
           mood_score=4.6, engagement_score=92, absence_days_annual=1, recognition_90d=4)
HIGH = dict(workload_index=97, overtime_hours_monthly=32, work_life_balance=1.1, job_satisfaction=1.7,
            mood_score=1.8, engagement_score=45, absence_days_annual=15, recognition_90d=0)
DYN = list(LOW)


def calibrate_person(i, target_pct, n_cand=8000):
    """Pick dynamic features so the burnout model outputs ~target_pct for person i.

    The model is a step function, so exact bisection can land on a cliff edge. Instead we sample
    many candidates around the bisection solution, round them exactly as they will be stored, score
    them in one batch and keep the closest one (within 0.5 points).
    """
    base = feat.iloc[i].copy()
    delta = {f: rng.uniform(-0.2, 0.2) for f in DYN}
    static = base.to_dict()

    def build(s, jit, adj):
        d = {k: np.full(len(s), v, dtype=float) for k, v in static.items()}
        for j, f in enumerate(DYN):
            sf = np.clip(s * (1 + delta[f]) + jit[:, j], 0, 1)
            d[f] = LOW[f] + sf * (HIGH[f] - LOW[f])
        d["workload_index"] = np.clip(d["workload_index"] + adj, 25, 100)
        for f in DYN:
            d[f] = np.round(d[f], 2)
        d["absence_days_annual"] = np.round(d["absence_days_annual"])
        d["recognition_90d"] = np.round(d["recognition_90d"])
        return pd.DataFrame(d)

    zero = np.zeros((1, len(DYN)))
    lo, hi = 0.0, 1.0
    for _ in range(30):
        mid = (lo + hi) / 2
        p = E.predict_proba(burn_b, build(np.array([mid]), zero, 0.0))[0] * 100
        lo, hi = (mid, hi) if p < target_pct else (lo, mid)
    s0 = (lo + hi) / 2
    s_k = np.clip(s0 + rng.normal(0, 0.06, n_cand), 0, 1)
    jit = rng.normal(0, 0.04, (n_cand, len(DYN)))
    adj = rng.normal(0, 4.0, n_cand)
    cand = build(s_k, jit, adj)
    p = E.predict_proba(burn_b, cand) * 100
    score = np.abs(p - target_pct) + 0.002 * np.abs(s_k - s0) * 100
    k = int(np.argmin(score))
    assert abs(p[k] - target_pct) <= 0.5, (roles[i]["fixed"]["first"], target_pct, p[k])
    for f in DYN:
        feat.loc[feat.index[i], f] = float(cand.iloc[k][f])


wellbeing_target, perf_target, trend_target = {}, {}, {}
for i, r in enumerate(roles):
    f = r["fixed"]
    if f and "risk" in f:
        if "wellbeing" in f:
            wellbeing_target[i] = f["wellbeing"]
        if "perf" in f:
            perf_target[i] = f["perf"]
        trend_target[i] = f.get("trend", 0.0)

# ------------------------------------------------------------------ 4. employees table
used_names, used_emails = set(), set()
for r in roles:
    if r["fixed"]:
        used_names.add((r["fixed"]["first"], r["fixed"]["last"]))
        if r["fixed"].get("email"):
            used_emails.add(r["fixed"]["email"])


def slug(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


order = rng.permutation(NP)                       # random ids so id order carries no meaning
emp_id = np.empty(NP, dtype=int)
emp_id[order] = np.arange(1, NP + 1)
dept_id = {d["name"]: d["id"] for d in dept_rows}
team_id_of = {t["name"]: t["id"] for t in team_rows}

people = []
for i, r in enumerate(roles):
    f = r["fixed"]
    if f:
        first, last, g = f["first"], f["last"], f["g"]
    else:
        g = "F" if rng.random() < 0.42 else "M"
        while True:
            first = rng.choice(N.FEMALE_FIRST if g == "F" else N.MALE_FIRST)
            last = rng.choice(N.LAST)
            if (first, last) not in used_names:
                used_names.add((first, last))
                break
    email = (f or {}).get("email")
    if not email:
        base = f"{slug(first)}.{slug(last)}"
        email, k = f"{base}@horizon.demo", 1
        while email in used_emails:
            k += 1
            email = f"{base}{k}@horizon.demo"
    used_emails.add(email)
    lv = int(level[i])
    if f:
        title = f["title"]
    elif r["kind"] == "dept_head":
        title = f"VP {r['dept']}"
    elif r["kind"] == "team_head":
        title = f"Head of {r['team']}"
    elif r["kind"] == "manager":
        title = N.MANAGER_TITLE[r["dept"]]
    else:
        title = rng.choice(N.IC_TITLES[r["dept"]][lv])
    tenure = float(feat["tenure_years"].iloc[i])
    exp = tenure + float(rng.gamma(2.0, 2.0)) + (lv - 1) * 1.2
    people.append(dict(
        id=int(emp_id[i]), employee_code=f"HZ{int(emp_id[i]):04d}", first_name=first, last_name=last,
        full_name=f"{first} {last}", email=email, gender=g,
        age=int(np.clip(round(22 + exp + rng.normal(0, 1.5)), 22, 63)), job_title=title, job_level=lv,
        department_id=dept_id[r["dept"]], team_id=team_id_of.get(r["team"]) if r["team"] else None,
        hire_date=(AS_OF - pd.Timedelta(days=int(tenure * 365))).date().isoformat(), tenure_years=tenure,
        monthly_income_sar=int(feat["monthly_income_sar"].iloc[i]), income_ratio=float(feat["income_ratio"].iloc[i]),
        years_since_promotion=float(feat["years_since_promotion"].iloc[i]),
        work_location=rng.choice(["Riyadh", "Jeddah", "Dammam", "Madinah"], p=[0.5, 0.25, 0.17, 0.08]),
        work_mode=rng.choice(["Hybrid", "On-site", "Remote"], p=[0.6, 0.3, 0.1]),
        app_role=(f or {}).get("app_role", "manager" if r["kind"] in ("dept_head", "team_head", "manager") else "employee"),
        is_manager=int(r["kind"] in ("dept_head", "team_head", "manager")),
        is_demo_person=int(bool(f)), kind=r["kind"], _group=r["group"], _team=r["team"], _dept=r["dept"],
    ))
emp = pd.DataFrame(people)

# reporting lines: IC -> line manager of their group; line manager -> team head; team head -> dept head; dept head -> none
mgr_of_group = {r["group"]: emp_id[i] for i, r in enumerate(roles) if r["kind"] == "manager"}
head_of_team = {r["team"]: emp_id[i] for i, r in enumerate(roles) if r["kind"] == "team_head"}
head_of_dept = {r["dept"]: emp_id[i] for i, r in enumerate(roles) if r["kind"] == "dept_head"}
mgr = []
for i, r in enumerate(roles):
    if r["kind"] == "ic":
        mgr.append(int(mgr_of_group[r["group"]]))
    elif r["kind"] == "manager":
        mgr.append(int(head_of_team[r["team"]]))
    elif r["kind"] == "team_head":
        mgr.append(int(head_of_dept[r["dept"]]))
    else:
        mgr.append(None)
emp["manager_id"] = pd.array(mgr, dtype="Int64")
emp["_row"] = np.arange(NP)

# ------------------------------------------------------------------ 5. ideas and recognitions (feed innovation score)
ideas = []
for i, r in enumerate(roles):
    sat = float(feat["job_satisfaction"].iloc[i])
    n_ideas = int(rng.poisson(3.2 * (1 + 0.15 * (sat - 3))))
    skill_n, skill_f, skill_v = rng.normal(72, 8), rng.normal(80, 7), rng.normal(77, 7)
    for _ in range(n_ideas):
        sub = AS_OF - pd.Timedelta(days=int(rng.integers(1, 365)))
        u = rng.random()
        status = "approved" if u < 0.42 else "rejected" if u < 0.62 else "under_review" if u < 0.70 else "implemented"
        if status in ("approved", "implemented"):
            decided = sub + pd.Timedelta(days=int(rng.integers(7, 40)))
        elif status == "rejected":
            decided = sub + pd.Timedelta(days=int(rng.integers(7, 30)))
        else:
            decided = pd.NaT
        impl = pd.NaT
        if status == "implemented":
            impl = decided + pd.Timedelta(days=int(rng.integers(30, 120)))
            if impl > AS_OF:
                status, impl = "approved", pd.NaT
        if pd.notna(decided) and decided > AS_OF:
            status, decided, impl = "under_review", pd.NaT, pd.NaT
        nov = float(np.clip(rng.normal(skill_n, 12), 20, 100))
        fea = float(np.clip(rng.normal(skill_f, 10), 30, 100))
        val = float(np.clip(rng.normal(skill_v, 10), 30, 100))
        est = float(rng.lognormal(8.4, 0.9) * val / 75) if status in ("approved", "implemented") else 0.0
        real = est * float(rng.uniform(0.6, 1.2)) if status == "implemented" else 0.0
        ideas.append(dict(
            employee_id=int(emp_id[i]), title=str(rng.choice(N.IDEA_TITLES[r["dept"]])),
            category=str(rng.choice(N.IDEA_CATEGORIES)), status=status, novelty_score=round(nov, 1),
            feasibility_score=round(fea, 1), business_value_score=round(val, 1),
            submitted_at=sub.date().isoformat(), decided_at=decided.date().isoformat() if pd.notna(decided) else None,
            implemented_at=impl.date().isoformat() if pd.notna(impl) else None,
            estimated_value_sar=round(est, -1), realized_value_sar=round(real, -1)))
ideas = pd.DataFrame(ideas).sort_values(["submitted_at", "employee_id"]).reset_index(drop=True)
ideas.insert(0, "id", np.arange(1, len(ideas) + 1))

recs = []
for i, r in enumerate(roles):
    me = int(emp_id[i])
    n90 = int(feat["recognition_90d"].iloc[i])
    n_old = int(rng.poisson(5.0))
    team_members = [int(emp_id[j]) for j, rr in enumerate(roles) if rr["team"] == r["team"] and j != i] if r["team"] else []
    for k in range(n90 + n_old):
        days = int(rng.integers(1, 90)) if k < n90 else int(rng.integers(91, 365))
        giver_pool = team_members or [int(x) for x in rng.choice(emp_id, 5)]
        giver = int(rng.choice(giver_pool))
        if giver == me:
            continue
        t = str(rng.choice(N.RECOGNITION_TYPES))
        recs.append(dict(giver_id=giver, receiver_id=me, type=t, message=str(rng.choice(N.RECOGNITION_MESSAGES[t])),
                         created_at=(AS_OF - pd.Timedelta(days=days)).date().isoformat(), is_public=int(rng.random() < 0.8)))
recs = pd.DataFrame(recs).sort_values(["created_at", "receiver_id"]).reset_index(drop=True)
recs.insert(0, "id", np.arange(1, len(recs) + 1))
# make the recognition_90d feature match the table exactly
cutoff = (AS_OF - pd.Timedelta(days=90)).date().isoformat()
cnt90 = recs[recs["created_at"] >= cutoff].groupby("receiver_id").size()
# for the calibrated named people the feature was set first; add/remove table rows to match
feat["recognition_90d"] = emp["id"].map(cnt90).fillna(0).astype(int).to_numpy()
for i, r in enumerate(roles):
    if r["fixed"] and "risk" in r["fixed"]:
        calibrate_person(i, r["fixed"]["risk"])
        want = int(feat["recognition_90d"].iloc[i])
        me = int(emp_id[i])
        have = int(cnt90.get(me, 0))
        # sync table rows in the last 90 days for this person with the calibrated feature
        mine = recs[(recs["receiver_id"] == me) & (recs["created_at"] >= cutoff)]
        if have > want:
            recs = recs.drop(mine.index[: have - want])
        elif have < want:
            extra = []
            for _ in range(want - have):
                t = str(rng.choice(N.RECOGNITION_TYPES))
                pool = [int(emp_id[j]) for j, rr in enumerate(roles) if rr["team"] == r["team"] and int(emp_id[j]) != me] if r["team"] else [int(emp_id[0])]
                extra.append(dict(giver_id=int(rng.choice(pool)), receiver_id=me, type=t,
                                  message=str(rng.choice(N.RECOGNITION_MESSAGES[t])),
                                  created_at=(AS_OF - pd.Timedelta(days=int(rng.integers(1, 90)))).date().isoformat(), is_public=1))
            recs = pd.concat([recs, pd.DataFrame(extra)], ignore_index=True)
recs = recs.drop(columns=["id"]).sort_values(["created_at", "receiver_id"]).reset_index(drop=True)
recs.insert(0, "id", np.arange(1, len(recs) + 1))
cnt90 = recs[recs["created_at"] >= cutoff].groupby("receiver_id").size()
assert (emp["id"].map(cnt90).fillna(0).astype(int).to_numpy() == feat["recognition_90d"].to_numpy()).all()

# ------------------------------------------------------------------ 6. current snapshot: scores and model outputs
cur = pd.DataFrame({"employee_id": emp["id"].to_numpy()})
for c in ["workload_index", "overtime_hours_monthly", "work_life_balance", "job_satisfaction", "mood_score",
          "engagement_score", "absence_days_annual", "recognition_90d", "training_times_last_year"]:
    cur[c] = feat[c].to_numpy()
ic = ideas.groupby("employee_id").agg(sub=("id", "size"),
                                      app=("status", lambda s: s.isin(["approved", "implemented"]).sum()),
                                      imp=("status", lambda s: (s == "implemented").sum()),
                                      q=("novelty_score", "mean"), f=("feasibility_score", "mean"), v=("business_value_score", "mean"))
cur["ideas_submitted_12m"] = cur["employee_id"].map(ic["sub"]).fillna(0).astype(int)
cur["ideas_approved_12m"] = cur["employee_id"].map(ic["app"]).fillna(0).astype(int)
cur["ideas_implemented_12m"] = cur["employee_id"].map(ic["imp"]).fillna(0).astype(int)
qual = ((cur["employee_id"].map(ic["q"]) + cur["employee_id"].map(ic["f"]) + cur["employee_id"].map(ic["v"])) / 3)
volume = np.minimum(100, cur["ideas_submitted_12m"] / 8 * 100)
conv = np.where(cur["ideas_submitted_12m"] > 0, cur["ideas_approved_12m"] / cur["ideas_submitted_12m"].clip(lower=1) * 100, 0)
impl = np.where(cur["ideas_approved_12m"] > 0, cur["ideas_implemented_12m"] / cur["ideas_approved_12m"].clip(lower=1) * 100, 0)
cur["innovation_score"] = np.where(cur["ideas_submitted_12m"] > 0,
                                   0.25 * volume + 0.30 * qual.fillna(60) + 0.20 * conv + 0.25 * impl, 35).round(1)
cur["task_completion_rate"] = np.clip(93 - 0.02 * (cur["workload_index"] - 66) + 0.08 * (cur["overtime_hours_monthly"] - 9)
                                      + rng.normal(0, 3.5, NP), 60, 100).round(1)
cur["task_quality_score"] = np.clip(90 - 0.02 * (cur["workload_index"] - 66) + rng.normal(0, 4.5, NP), 60, 100).round(1)
cur["collaboration_score"] = np.clip(85 + 0.2 * (cur["engagement_score"] - 78) + rng.normal(0, 6, NP), 40, 100).round(1)
# performance NEVER includes wellbeing (product rule)
raw_perf = (0.30 * cur["task_completion_rate"] + 0.30 * cur["task_quality_score"]
            + 0.20 * cur["collaboration_score"] + 0.20 * cur["innovation_score"])
perf_offset = np.clip(rng.normal(-1.5, 6.0, NP), -16, 12)
for i, t in perf_target.items():
    perf_offset[i] = t - raw_perf.iloc[i]
cur["performance_score"] = np.clip(raw_perf + perf_offset, 40, 100).round(0).astype(int)
cur["performance_tier"] = pd.cut(cur["performance_score"], [-1, 69, 79, 89, 101], labels=["Growth", "Bronze", "Silver", "Gold"]).astype(str)


def wellbeing(mood, wlb, workload, engagement, overtime):
    return (0.30 * (mood - 1) / 4 * 100 + 0.25 * (wlb - 1) / 3 * 100 + 0.20 * (100 - workload)
            + 0.15 * engagement + 0.10 * (100 - np.clip(overtime / 30 * 100, 0, 100)))


wb_raw = wellbeing(cur["mood_score"], cur["work_life_balance"], cur["workload_index"], cur["engagement_score"], cur["overtime_hours_monthly"])
wb_offset = rng.normal(0, 2.0, NP)
for i, t in wellbeing_target.items():
    wb_offset[i] = t - wb_raw.iloc[i]
cur["wellbeing_score"] = np.clip(wb_raw + wb_offset, 5, 98).round(0).astype(int)

score_df = pd.concat([cur.drop(columns=["employee_id"]),
                      feat[["tenure_years", "job_level", "income_ratio", "years_since_promotion", "monthly_income_sar"]].reset_index(drop=True)], axis=1)
p_b = E.predict_proba(burn_b, score_df)
p_a = E.predict_proba(att_b, score_df)
cur["burnout_risk_pct"] = (p_b * 100).round(0).astype(int)
cur["burnout_level"] = [E.risk_level(x) for x in cur["burnout_risk_pct"]]
cur["attrition_risk_pct"] = (p_a * 100).round(0).astype(int)
cur["attrition_level"] = [E.risk_level(x) for x in cur["attrition_risk_pct"]]


def compact(d):
    keep = lambda lst: [{k: it[k] for k in ("feature", "label", "value", "baseline_value", "impact_pts")} for it in lst]
    return json.dumps({"increasing": keep(d["increasing"]), "protective": keep(d["protective"])}, ensure_ascii=False, separators=(",", ":"))


bd, ad, top_driver = [], [], []
for i in range(NP):
    row = score_df.iloc[i]
    d1 = E.drivers(burn_b, row, top_k=4)
    d2 = E.drivers(att_b, row, top_k=4)
    bd.append(compact(d1))
    ad.append(compact(d2))
    top_driver.append(d1["increasing"][0]["feature"] if d1["increasing"] else "workload_index")
cur["burnout_drivers"] = bd
cur["attrition_drivers"] = ad

# ------------------------------------------------------------------ 7. intervention schedule
CUR_RISK = cur["burnout_risk_pct"].to_numpy(float)
named_idx = {(roles[i]["fixed"]["first"], roles[i]["fixed"]["last"]): i for i in range(NP) if roles[i]["fixed"]}
scripted = {  # person -> (start_week, status, effect)
    ("Rami", "Khoury"): (28, "completed", 0.5),
    ("Tariq", "Zaki"): (48, "in_progress", 0.0),
    ("Huda", "Nasser"): (50, "proposed", 0.0),
}
excluded = {i for i in (named_idx.get(k) for k in [("Khalid", "Mansour")]) if i is not None} | {named_idx[k] for k in scripted}
cand = np.array([i for i in range(NP) if i not in excluded])
wts = (CUR_RISK[cand] / 100) ** 1.5 + 0.02
picked = rng.choice(cand, size=230, replace=False, p=wts / wts.sum())
int_plan = [(int(i), None) for i in picked] + [(named_idx[k], v) for k, v in scripted.items()]
interventions, effect_ws, effect_e = [], np.full(NP, -1), np.zeros(NP)
for i, script in int_plan:
    if script:
        ws, status, e = script
    else:
        ws = int(rng.integers(0, 52))
        if ws <= 42:
            status = str(rng.choice(["completed", "declined", "cancelled"], p=[0.80, 0.10, 0.10]))
        else:
            status = str(rng.choice(["in_progress", "proposed", "approved"], p=[0.5, 0.3, 0.2]))
        e = float(rng.beta(3, 2)) if status == "completed" else 0.0
    if status == "completed":
        effect_ws[i], effect_e[i] = ws, e
    td = top_driver[i]
    itype, rationale, cost = N.INTERVENTION_TYPES.get(td, N.INTERVENTION_TYPES["workload_index"])
    created = WEEKS[ws] + pd.Timedelta(days=int(rng.integers(0, 4)))
    approved = created + pd.Timedelta(days=int(rng.integers(1, 5))) if status in ("approved", "in_progress", "completed") else None
    started = approved + pd.Timedelta(days=int(rng.integers(1, 4))) if status in ("in_progress", "completed") else None
    completed = started + pd.Timedelta(weeks=8) if status == "completed" else None
    follow = completed + pd.Timedelta(weeks=4) if (status == "completed" and ws + 12 <= 51) else None
    interventions.append(dict(
        employee_id=int(emp_id[i]), type=itype, rationale=rationale, driver=td, status=status, ws=ws,
        proposed_by="PulseAI" if rng.random() < 0.7 else "Manager", owner_id=int(mgr[i]) if mgr[i] else None,
        approved_by_id=int(mgr[i]) if (approved is not None and mgr[i]) else None,
        created_at=created.date().isoformat(),
        approved_at=approved.date().isoformat() if approved is not None else None,
        started_at=started.date().isoformat() if started is not None else None,
        completed_at=completed.date().isoformat() if completed is not None else None,
        followup_at=follow.date().isoformat() if follow is not None else None,
        expected_risk_reduction_pts=int(round(rng.normal(10, 3))), cost_sar=int(round(cost * rng.uniform(0.8, 1.3), -1)),
        human_approved=int(approved is not None)))

# ------------------------------------------------------------------ 8. weekly history (52 weeks, last week == current snapshot)
w = np.arange(N_WEEKS)
ramp12 = np.clip((51 - w) / 12, 0, 1)
season = 3 * np.sin(2 * np.pi * w / 13) - 3 * np.sin(2 * np.pi * 51 / 13)
program = (51 - w) / 51
tau = rng.normal(0, 0.35, NP)
for i, t in trend_target.items():
    tau[i] = t
elev = np.where(effect_ws[:, None] >= 0, effect_e[:, None] * (1 - np.clip((w[None, :] - effect_ws[:, None]) / 8, 0, 1)), 0.0)


def noisy(sd):
    z = rng.normal(0, sd, (NP, N_WEEKS))
    z[:, -1] = 0
    return z


wl = cur["workload_index"].to_numpy()[:, None]
ot = cur["overtime_hours_monthly"].to_numpy()[:, None]
md = cur["mood_score"].to_numpy()[:, None]
en = cur["engagement_score"].to_numpy()[:, None]
t2 = tau[:, None]
wl_w = np.clip(wl - 9 * t2 * ramp12 + season + 2.0 * program + 14 * elev + noisy(2.0), 5, 100)
ot_w = np.clip(ot - 4.5 * t2 * ramp12 + 0.4 * season + 1.0 * program + 7 * elev + noisy(1.2), 0, 60)
md_w = np.clip(md + 0.45 * t2 * ramp12 - 0.02 * season - 0.06 * program - 0.6 * elev + noisy(0.10), 1, 5)
en_w = np.clip(en + 4.5 * t2 * ramp12 - 1.0 * program - 6 * elev + noisy(1.5), 20, 100)
wlb_s = np.repeat(cur["work_life_balance"].to_numpy()[:, None], N_WEEKS, 1)
wb_w = np.clip(wellbeing(md_w, wlb_s, wl_w, en_w, ot_w) + wb_offset[:, None], 5, 98)
perf_w = np.clip(cur["performance_score"].to_numpy()[:, None] + noisy(1.3) + 0.8 * program * 0, 30, 100)

static = score_df[["absence_days_annual", "recognition_90d", "tenure_years", "job_level", "training_times_last_year", "work_life_balance", "job_satisfaction"]]
flat = pd.DataFrame({
    "workload_index": wl_w.ravel(), "overtime_hours_monthly": ot_w.ravel(), "mood_score": md_w.ravel(), "engagement_score": en_w.ravel(),
    **{c: np.repeat(static[c].to_numpy(), N_WEEKS) for c in static.columns}})
risk_w = E.predict_proba(burn_b, flat).reshape(NP, N_WEEKS) * 100
weekly = pd.DataFrame({
    "employee_id": np.repeat(emp["id"].to_numpy(), N_WEEKS),
    "week_start": np.tile([d.date().isoformat() for d in WEEKS], NP),
    "workload_index": wl_w.ravel().round(1), "overtime_hours_monthly": ot_w.ravel().round(1),
    "mood_score": md_w.ravel().round(2), "engagement_score": en_w.ravel().round(1),
    "wellbeing_score": wb_w.ravel().round(1), "performance_score": perf_w.ravel().round(1),
    "burnout_risk_pct": risk_w.ravel().round(1),
    "pulse_submitted": (rng.random(NP * N_WEEKS) < 0.88).astype(int)})

# current snapshot: burnout change over the last 6 weeks (from the weekly history, same model)
cur["burnout_change_6w_pts"] = (risk_w[:, 51] - risk_w[:, 45]).round(0).astype(int)
# make "current" risk and the final week consistent (rounding only)
assert np.abs(risk_w[:, 51] - cur["burnout_risk_pct"].to_numpy()).max() <= 0.51

# ------------------------------------------------------------------ 9. intervention outcomes from the weekly history
idx_of_emp = {int(emp_id[i]): i for i in range(NP)}
rows = []
for it in interventions:
    i, ws = idx_of_emp[it["employee_id"]], it.pop("ws")
    base = round(float(risk_w[i, ws]), 0)
    fu = round(float(risk_w[i, ws + 12]), 0) if it["followup_at"] else None
    it["baseline_risk_pct"] = int(base)
    it["followup_risk_pct"] = int(fu) if fu is not None else None
    if fu is None:
        it["outcome"] = "pending"
    else:
        d = fu - base
        it["outcome"] = "worked" if d <= -8 else "partial" if d <= -3 else "no_change"
    rows.append(it)
interv = pd.DataFrame(rows).sort_values(["created_at", "employee_id"]).reset_index(drop=True)
interv.insert(0, "id", np.arange(1, len(interv) + 1))

# ------------------------------------------------------------------ 10. skills
skills = []
for i, r in enumerate(roles):
    pool = list(N.SKILLS[r["dept"]])
    chosen = list(rng.choice(pool, 4, replace=False))
    for sname in chosen:
        lv = int(np.clip(round(1 + feat["tenure_years"].iloc[i] / 4 + level[i] * 0.4 + rng.normal(0, 0.8)), 1, 5))
        skills.append(dict(employee_id=int(emp_id[i]), skill=sname, category="Technical", level=lv))
    for sname in rng.choice(N.SOFT_SKILLS, 2, replace=False):
        skills.append(dict(employee_id=int(emp_id[i]), skill=str(sname), category="Soft", level=int(np.clip(round(rng.normal(3.4, 0.9)), 1, 5))))
skills = pd.DataFrame(skills)
skills.insert(0, "id", np.arange(1, len(skills) + 1))

# ------------------------------------------------------------------ 11. departments / teams
emp["team_name"] = emp["_team"]
emp_out = emp.drop(columns=["kind", "_group", "_team", "_dept", "_row", "team_name"])
dept_df = pd.DataFrame(dept_rows)
dept_df["head_id"] = dept_df["name"].map({k: int(v) for k, v in head_of_dept.items()})
dept_df["headcount"] = dept_df["id"].map(emp_out.groupby("department_id").size())
team_df = pd.DataFrame(team_rows)
team_df["department_id"] = team_df["department"].map(dept_id)
team_df["head_id"] = team_df["name"].map({k: int(v) for k, v in head_of_team.items()})
team_df["headcount"] = team_df["id"].map(emp_out.groupby("team_id").size())
team_df = team_df.drop(columns=["department"])

# ------------------------------------------------------------------ 12. economic impact by department and month
wk = weekly.merge(emp_out[["id", "department_id", "monthly_income_sar"]], left_on="employee_id", right_on="id")
wk["month"] = pd.to_datetime(wk["week_start"]).dt.to_period("M").dt.to_timestamp()
months = sorted(wk["month"].unique())
m_agg = wk.groupby(["month", "department_id"]).agg(avg_burnout_risk_pct=("burnout_risk_pct", "mean"),
                                                   avg_wellbeing_score=("wellbeing_score", "mean"),
                                                   avg_performance_score=("performance_score", "mean")).reset_index()
hc = emp_out.groupby("department_id").agg(headcount=("id", "size"), avg_monthly_salary=("monthly_income_sar", "mean"))
iv = interv.copy()
iv["month"] = pd.to_datetime(iv["created_at"]).dt.to_period("M").dt.to_timestamp()
iv = iv.merge(emp_out[["id", "department_id"]], left_on="employee_id", right_on="id", suffixes=("", "_e"))
iv_cost = iv[iv["status"].isin(["in_progress", "completed"])].groupby(["month", "department_id"])["cost_sar"].sum()
iv_done = iv[iv["status"] == "completed"].groupby(["month", "department_id"]).size()
im = ideas[ideas["implemented_at"].notna()].copy()
im["month"] = pd.to_datetime(im["implemented_at"]).dt.to_period("M").dt.to_timestamp()
im = im.merge(emp_out[["id", "department_id"]], left_on="employee_id", right_on="id", suffixes=("", "_e"))
im_val = im.groupby(["month", "department_id"])["realized_value_sar"].sum()
im_cnt = im.groupby(["month", "department_id"]).size()
ref = m_agg[m_agg["month"].isin(months[:3])].groupby("department_id")[["avg_burnout_risk_pct", "avg_performance_score"]].mean()
eco = []
for _, r in m_agg.iterrows():
    d, mth = int(r["department_id"]), r["month"]
    h = int(hc.loc[d, "headcount"])
    sal = float(hc.loc[d, "avg_monthly_salary"])
    base_exits = h * (0.13 / 12)
    risk_drop = max(0.0, (ref.loc[d, "avg_burnout_risk_pct"] - r["avg_burnout_risk_pct"]) / max(ref.loc[d, "avg_burnout_risk_pct"], 1))
    avoided = base_exits * min(risk_drop * 3.0, 0.5)
    retention = avoided * sal * 12 * E.REPLACEMENT_COST_MULTIPLIER
    prod = h * sal * 0.5 * max(0.0, ref.loc[d, "avg_burnout_risk_pct"] - r["avg_burnout_risk_pct"]) / 100
    inno = float(im_val.get((mth, d), 0.0))
    cost = float(iv_cost.get((mth, d), 0.0)) + 600.0 * h / 100  # interventions + platform running cost share
    net = retention + prod + inno - cost
    eco.append(dict(month=mth.date().isoformat(), department_id=d, headcount=h,
                    avg_burnout_risk_pct=round(r["avg_burnout_risk_pct"], 1), avg_wellbeing_score=round(r["avg_wellbeing_score"], 1),
                    avg_performance_score=round(r["avg_performance_score"], 1),
                    interventions_completed=int(iv_done.get((mth, d), 0)), ideas_implemented=int(im_cnt.get((mth, d), 0)),
                    expected_exits_baseline=round(base_exits, 2), exits_avoided=round(avoided, 2),
                    retention_savings_sar=round(retention, -1), productivity_gain_sar=round(prod, -1),
                    innovation_value_sar=round(inno, -1), program_cost_sar=round(cost, -1), net_impact_sar=round(net, -1),
                    roi_pct=round(net / cost * 100, 0) if cost else None))
eco = pd.DataFrame(eco)

# ------------------------------------------------------------------ 13. write files
OUT.mkdir(parents=True, exist_ok=True)
cur_out = cur.copy()
cur_out.insert(1, "as_of", AS_OF.date().isoformat())
tables = {
    "departments": dept_df, "teams": team_df, "employees": emp_out.sort_values("id"),
    "employee_current": cur_out.sort_values("employee_id"), "weekly_metrics": weekly, "interventions": interv,
    "ideas": ideas, "recognitions": recs, "skills": skills, "economic_impact_monthly": eco,
}
for name, df in tables.items():
    df.to_csv(OUT / f"{name}.csv", index=False)
    print(f"{name:26s} {len(df):>7,d} rows")

write_schema_doc(tables, ROOT / "docs" / "DATA_SCHEMA.md", as_of=AS_OF.date().isoformat())

# ------------------------------------------------------------------ 14. sanity checks + summary
chk = []
ok = lambda c, m: chk.append((bool(c), m))
ok(len(emp_out) == 1240, "1,240 employees")
ok(len(dept_df) == 6 and len(team_df) == 31, "6 departments, 31 teams")
ok(emp_out["email"].is_unique and emp_out["full_name"].is_unique, "unique emails and names")
direct = emp_out.dropna(subset=["manager_id"]).groupby("manager_id").size()
line = emp_out[emp_out["id"].isin(mgr_of_group.values())]
line_sizes = direct.reindex(line["id"]).fillna(0)
ok(line_sizes.min() >= 5, f"every line manager has >= 5 direct reports (min {int(line_sizes.min())}, max {int(line_sizes.max())})")
yas = int(emp_out.loc[emp_out["email"] == "yasmin@horizon.demo", "id"].iloc[0])
team9 = cur_out.merge(emp_out[["id", "full_name", "manager_id"]], left_on="employee_id", right_on="id")
team9 = team9[team9["manager_id"] == yas]
ok(len(team9) == 9, "Yasmin has 9 direct reports")
want = {"Khalid Mansour": 72, "Tariq Zaki": 66, "Huda Nasser": 63, "Sami Youssef": 52, "Rami Khoury": 47,
        "Dana Farouk": 44, "Noura Al-Saud": 41, "Faisal Rahman": 38, "Maha Al-Otaibi": 35}
got = dict(zip(team9["full_name"], team9["burnout_risk_pct"]))
ok(all(abs(got[k] - v) <= 1 for k, v in want.items()), f"burnout risk of the 9 matches the design: {got}")
k = team9[team9["full_name"] == "Khalid Mansour"].iloc[0]
ok(k["wellbeing_score"] == 30 and k["performance_score"] == 91 and k["performance_tier"] == "Gold", "Khalid: wellbeing 30, performance 91 Gold")
ok((team9["burnout_risk_pct"] >= 60).sum() == 3, "3 high-risk people in Yasmin's team (badge 3)")
lay = cur_out.merge(emp_out[["id", "full_name"]], left_on="employee_id", right_on="id")
lay = lay[lay["full_name"] == "Layla Haddad"].iloc[0]
ok(lay["performance_score"] == 87 and lay["performance_tier"] == "Silver", "Layla: performance 87 Silver")
ok(len(weekly) == 1240 * 52, "52 weeks for every employee")
ok(len(ideas) > 0 and len(recs) > 0, "ideas and recognitions present")
ok(set(interv["employee_id"]) <= set(emp_out["id"]) and set(recs["giver_id"]) <= set(emp_out["id"]), "foreign keys valid")
corr_perf_wb = float(np.corrcoef(cur["performance_score"], cur["wellbeing_score"])[0, 1])
tier_counts = cur["performance_tier"].value_counts().to_dict()
lvl = cur["burnout_level"].value_counts().to_dict()
for passed, m in chk:
    print(("PASS " if passed else "FAIL ") + m)
assert all(p for p, _ in chk), "sanity checks failed"

summary = ["# Generated data summary", "", f"As-of week: {AS_OF.date()} (52 weekly points per employee). All data is synthetic.", "", "## Checks", ""]
summary += [f"- {'PASS' if p else 'FAIL'}: {m}" for p, m in chk]
summary += ["", "## Distributions", "", f"- Burnout levels: {lvl}", f"- Performance tiers: {tier_counts}",
            f"- Correlation performance vs wellbeing: {corr_perf_wb:.2f}",
            f"- Average burnout risk: {cur['burnout_risk_pct'].mean():.1f}%, average attrition risk: {cur['attrition_risk_pct'].mean():.1f}%",
            f"- Ideas: {len(ideas):,}; recognitions: {len(recs):,}; interventions: {len(interv)} "
            f"({interv['status'].value_counts().to_dict()})",
            f"- Intervention outcomes (where measured): {interv['outcome'].value_counts().to_dict()}",
            f"- Economic impact, last 12 months: retention {eco['retention_savings_sar'].sum():,.0f} SAR, productivity "
            f"{eco['productivity_gain_sar'].sum():,.0f}, innovation {eco['innovation_value_sar'].sum():,.0f}, program cost "
            f"{eco['program_cost_sar'].sum():,.0f}, net {eco['net_impact_sar'].sum():,.0f} SAR"]
(HERE / "reports" / "data_summary.md").write_text("\n".join(summary), encoding="utf-8")
print("\n".join(summary[-8:]))
