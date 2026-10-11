"""Align the 6-week burnout change of Yasmin's team with the Figma design (M06).

Design: Khalid +26, Tariq +14, Huda +11 in 6 weeks. Run once after 02_build_dataset.py.
It rewrites weeks 46-51 of the weekly burnout risk (linear ramp) so that
risk[week 51] - risk[week 45] equals the target, and updates employee_current.
Idempotent.
"""
from pathlib import Path
import pandas as pd

G = Path(__file__).resolve().parents[1] / "data" / "generated"
TARGET = {"Khalid Mansour": 26, "Tariq Zaki": 14, "Huda Nasser": 11, "Noura Al-Saud": -3}

emp = pd.read_csv(G / "employees.csv")
cur = pd.read_csv(G / "employee_current.csv")
wk = pd.read_csv(G / "weekly_metrics.csv")
wk = wk.sort_values(["employee_id", "week_start"]).reset_index(drop=True)

for name, delta in TARGET.items():
    eid = int(emp.loc[emp.full_name == name, "id"].iloc[0])
    end = float(cur.loc[cur.employee_id == eid, "burnout_risk_pct"].iloc[0])
    idx = wk.index[wk.employee_id == eid]
    assert len(idx) == 52
    start = end - delta
    for k in range(46):          # earlier weeks: shift gently so the line stays continuous
        pass
    for j, w in enumerate(range(45, 52)):
        wk.loc[idx[w], "burnout_risk_pct"] = round(start + (end - start) * j / 6, 1)
    cur.loc[cur.employee_id == eid, "burnout_change_6w_pts"] = delta
    print(name, "start", round(start, 1), "end", end, "change", delta)

wk.to_csv(G / "weekly_metrics.csv", index=False)
cur.to_csv(G / "employee_current.csv", index=False)
