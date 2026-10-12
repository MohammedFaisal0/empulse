import re

SKIP = {
    "EMPULSE",
    "HR & EXECUTIVE",
    "Horizon Group",
    "1,240 people · 6 departments",
    "Executive Pulse",
    "Organization",
    "Employees",
    "Teams & Departments",
    "Performance Intelligence",
    "Burnout Intelligence",
    "Organization Morale",
    "Innovation Intelligence",
    "Recognition Analytics",
    "AI Intervention Center",
    "Performance-Wellbeing Matrix",
    "Economic Impact",
    "What-if Simulator",
    "Reports",
    "Governance",
    "PulseAI",
    "Settings",
    "Rana Aziz",
    "Chief People Officer",
    "DATA 06:00",
    "Q3 2026",
}

for sid in ["H08", "H09", "H10", "H11"]:
    text = open(f"design/specs/{sid}.md", encoding="utf-8").read()
    m = re.search(r'FRAME "[^"]+" \| @0,0 (\d+)x(\d+)', text)
    texts = re.findall(r'TEXT "[^"]+" \|[^|]*\| "([^"]+)"', text)
    seen = set()
    out = []
    for content in texts:
        if content in SKIP or content in seen:
            continue
        if re.fullmatch(r"[\d.,%+\-\s]+", content):
            continue
        seen.add(content)
        out.append(content)
    with open(f"scripts/_copy_{sid}.txt", "w", encoding="utf-8") as f:
        f.write(f"frame {m.groups() if m else None}\n")
        for c in out:
            f.write(c + "\n")
    print(sid, m.groups() if m else None, len(out))
