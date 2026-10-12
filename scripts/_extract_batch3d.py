import re, pathlib, json
out = {}
for sid in ["H02b","H12","H14","H15","H16"]:
    text = pathlib.Path(f"design/specs/{sid}.md").read_text(encoding="utf-8", errors="replace")
    vals = re.findall(r'\| "([^"]*)" \|', text)
    skip = {"EMPULSE","HR & EXECUTIVE","Horizon Group","Executive Pulse","Organization","Employees","Teams & Departments","Performance Intelligence","Burnout Intelligence","Organization Morale","Innovation Intelligence","Recognition Analytics","AI Intervention Center","Performance-Wellbeing Matrix","Economic Impact","What-if Simulator","Reports","Governance","PulseAI","Settings","RA","Rana Aziz","Chief People Officer","DATA 06:00","Q3 2026","\u2318K"}
    seen=set(); items=[]
    for v in vals:
        if v in skip or v in seen: continue
        if v.startswith("Search people") or (v.startswith("Horizon Group /")): continue
        seen.add(v); items.append(v)
    out[sid]=items
    pathlib.Path(f"scripts/_copy_{sid}.txt").write_text("\n".join(items), encoding="utf-8")
print({k: len(v) for k,v in out.items()})
