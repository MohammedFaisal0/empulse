"""Rule-based intent router (EN + AR keywords)."""

from __future__ import annotations

import re
from typing import Any


def detect_language(question: str) -> str:
    if re.search(r"[\u0600-\u06FF]", question or ""):
        return "ar"
    return "en"


# Refusal: ranking, out-of-scope reveal, medical diagnosis
REFUSAL_PATTERNS = [
    re.compile(
        r"\b(rank|ranking|leaderboard|top\s+\d+|best\s+employee|worst\s+|"
        r"who\s+is\s+(the\s+)?(best|worst)|compare\s+people|"
        r"sort\s+(everyone|people|employees)\s+by)\b",
        re.I,
    ),
    re.compile(
        r"(ترتيب|لوحة\s*الصدارة|أفضل\s*موظف|أسوأ|من\s*الأفضل|قارن\s*بين\s*الموظف)",
        re.I,
    ),
    re.compile(
        r"\b(diagnos|depression|anxiety disorder|bipolar|PTSD|medical\s+condition|"
        r"are\s+they\s+sick|clinical)\b",
        re.I,
    ),
    re.compile(r"(تشخيص|اكتئاب|اضطراب\s*قلق|مرض\s*نفسي)", re.I),
]

# Employee asking about other people / team aggregates they shouldn't have
EMPLOYEE_OUT_OF_SCOPE = [
    re.compile(
        r"\b(my\s+team('s)?|team\s+burnout|department\s+average|"
        r"who\s+on\s+my\s+team|colleague('s)?\s+(score|burnout)|"
        r"someone\s+else('s)?|other\s+people('s)?)\b",
        re.I,
    ),
    re.compile(r"(فريق\s*ي|احتراق\s*الفريق|درجة\s*زميل|موظف\s*آخر)", re.I),
]

# Tool keyword maps: tool → patterns
TOOL_RULES: list[tuple[str, list[re.Pattern[str]]]] = [
    (
        "what_if",
        [
            re.compile(
                r"\b(what[\s-]?if|simulate|simulation|reduce\s+workload|"
                r"workload\s*-?\s*10|policy\s+impact|scenario)\b",
                re.I,
            ),
            re.compile(r"(ماذا\s*لو|محاكاة|خفض\s*عبء|سيناريو)", re.I),
        ],
    ),
    (
        "org_burnout_by_department",
        [
            re.compile(
                r"\b(department|org(anization)?\s+burnout|systemic|"
                r"across\s+the\s+org|hotspot)\b",
                re.I,
            ),
            re.compile(r"(قسم|احتراق\s*المنظمة|على\s*مستوى\s*المنظمة)", re.I),
        ],
    ),
    (
        "economic_impact_summary",
        [
            re.compile(r"\b(economic|roi|saving|cost\s+avoid|SAR|financial)\b", re.I),
            re.compile(r"(اقتصاد|توفير|تكلفة|عائد)", re.I),
        ],
    ),
    (
        "recognition_gaps",
        [
            re.compile(r"\b(recognit|kudos|thanks|who\s+needs\s+recognit)\b", re.I),
            re.compile(r"(تقدير|شكر|اعتراف)", re.I),
        ],
    ),
    (
        "intervention_status",
        [
            re.compile(
                r"\b(intervention|relief\s+plan|follow[\s-]?up|proposed)\b", re.I
            ),
            re.compile(r"(تدخل|خطة\s*تخفيف|مقترح)", re.I),
        ],
    ),
    (
        "team_drivers",
        [
            re.compile(r"\b(driver|why.*(burnout|drop)|root\s+cause)\b", re.I),
            re.compile(r"(محرك|لماذا.*(احتراق|انخفاض)|سبب)", re.I),
        ],
    ),
    (
        "team_burnout_summary",
        [
            re.compile(r"\b(burnout|wellbeing\s+risk|at[\s-]?risk)\b", re.I),
            re.compile(r"(احتراق|خطر\s*الرفاه)", re.I),
        ],
    ),
    (
        "team_performance_summary",
        [
            re.compile(r"\b(performance|productivity|engagement\s+drop)\b", re.I),
            re.compile(r"(أداء|إنتاجية|انخفاض\s*الاندماج)", re.I),
        ],
    ),
    (
        "my_growth",
        [
            re.compile(
                r"\b(course|skill|growth|learn|gold|career|ready\s+for)\b", re.I
            ),
            re.compile(r"(دورة|مهارة|نمو|تعلم|ذهبي|مسار)", re.I),
        ],
    ),
    (
        "my_summary",
        [
            re.compile(
                r"\b(how\s+am\s+i|my\s+(score|progress|summary|wellbeing|"
                r"innovation|idea)|summarise|summarize)\b",
                re.I,
            ),
            re.compile(r"(كيف\s*حالي|درجتي|ملخص|تقدمي|أفكاري)", re.I),
        ],
    ),
]


def is_refusal(question: str) -> str | None:
    q = question or ""
    for pat in REFUSAL_PATTERNS:
        if pat.search(q):
            if re.search(r"diagnos|clinical|medical|تشخيص|اكتئاب", q, re.I):
                return "diagnose"
            return "rank"
    return None


def employee_out_of_scope(question: str) -> bool:
    q = question or ""
    return any(p.search(q) for p in EMPLOYEE_OUT_OF_SCOPE)


def extract_what_if_controls(question: str) -> dict[str, Any]:
    """Heuristic lever extraction from free text."""
    q = (question or "").lower()
    controls: dict[str, Any] = {}
    m = re.search(r"(?:workload|عبء)[^\d\-]*(-?\d+)\s*%", q)
    if m:
        controls["workload_pct"] = max(-20, min(10, int(m.group(1))))
    elif re.search(r"reduce\s+workload|خفض\s*عبء", q):
        controls["workload_pct"] = -10
    if re.search(r"2\s+streams|مسارين|redistribut", q):
        controls["task_streams"] = 2
    if re.search(r"recognition.*(50|100)|تقدير.*50|تقدير.*100", q):
        controls["recognition_pct"] = 50
    if re.search(r"training|تدريب", q):
        controls["training_hours_month"] = 4
    if re.search(r"on[\s-]?call|مناوبة", q):
        controls["shared_on_call"] = True
    if not controls:
        controls["workload_pct"] = -10
    return controls


def route_tools(question: str, allowed: list[str]) -> list[str]:
    """Pick up to 3 tools from allowed set by keyword score order."""
    q = question or ""
    picked: list[str] = []
    for name, patterns in TOOL_RULES:
        if name not in allowed:
            continue
        if any(p.search(q) for p in patterns):
            picked.append(name)
        if len(picked) >= 3:
            break
    if not picked and allowed:
        # Defaults by role capability
        for fallback in (
            "my_summary",
            "team_burnout_summary",
            "org_burnout_by_department",
            "intervention_status",
        ):
            if fallback in allowed:
                picked.append(fallback)
                break
    return picked
