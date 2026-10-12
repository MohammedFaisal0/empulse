"""PulseAI ask() — shared engine for employee / manager / HR / executive."""

from __future__ import annotations

from datetime import date
from typing import Any

from accounts.models import AuditLog, UserProfile
from accounts.permissions import get_user_employee, get_user_role
from interventions.models import Intervention
from org.privacy import employees_visible_to

from pulseai.gemini import (
    gemini_available,
    phrase_answer_with_gemini,
    pick_tools_with_gemini,
)
from pulseai.router import (
    detect_language,
    employee_out_of_scope,
    extract_what_if_controls,
    is_refusal,
    route_tools,
)
from pulseai.tools import (
    DISCLAIMER,
    allowed_tools_for,
    run_tool,
)

NEVER_SEES = {
    UserProfile.Role.EMPLOYEE: [
        "Other people's private scores",
        "Private check-in free text",
        "Health or medical data",
    ],
    UserProfile.Role.MANAGER: [
        "Private check-in free text",
        "Email / chat content",
        "Health or medical data",
        "People outside your direct reports",
    ],
    UserProfile.Role.HR: [
        "Private check-in free text",
        "Email / chat content",
        "Health or medical data",
    ],
    UserProfile.Role.EXECUTIVE: [
        "Individual employee records",
        "Private check-in free text",
        "Health or medical data",
    ],
    UserProfile.Role.ADMIN: [
        "Private check-in free text",
        "Email / chat content",
        "Health or medical data",
    ],
}


def _refusal_answer(question: str, language: str, reason: str) -> dict[str, Any]:
    if language == "ar":
        if reason == "diagnose":
            findings = [
                "لا أقدم تشخيصاً طبياً أو نفسياً.",
                "خطر الاحتراق دعم قرار فقط — وليس تشخيصاً.",
            ]
            summary = "أرفض طلبات التشخيص. يمكنني مشاركة مؤشرات مجمّعة ضمن نطاقك."
            actions = ["افتح شاشة الرفاهية المناسبة لدورك", "ناقش الدعم مع الموارد البشرية"]
        else:
            findings = [
                "EMPULSE لا يرتّب الأشخاص ولا يعرض لوحة صدارة.",
                "الدلائل أبجدية؛ المجموعات أقل من 5 تُخفى.",
            ]
            summary = "لا أرتّب الأشخاص أو أكشف من هم خارج نطاقك."
            actions = ["اسأل عن مجمّعات الفريق أو القسم", "استخدم محاكي ماذا لو للسياسات"]
    else:
        if reason == "diagnose":
            findings = [
                "I do not provide medical or psychological diagnoses.",
                "Burnout risk is decision support only — not a diagnosis.",
            ]
            summary = (
                "I refuse diagnosis requests. I can share scoped aggregates instead."
            )
            actions = [
                "Open the wellbeing screen for your role",
                "Discuss support options with HR",
            ]
        else:
            findings = [
                "EMPULSE never ranks people or shows leaderboards.",
                "Directories stay alphabetical; groups under 5 are suppressed.",
            ]
            summary = (
                "I will not rank people or reveal anyone outside your access scope."
            )
            actions = [
                "Ask about team or department aggregates",
                "Use the What-if Simulator for policy scenarios",
            ]
    return {
        "question": question,
        "language": language,
        "refused": True,
        "refusal_reason": reason,
        "data_used": [],
        "findings": findings,
        "recommendation": {"summary": summary, "actions": actions},
        "disclaimer": DISCLAIMER,
        "never_sees": [],
        "tools_called": [],
        "engine": "rules",
        "proposed_intervention": None,
        "awaiting_confirmation": False,
    }


def _data_used_chips(tool_results: list[dict]) -> list[dict[str, Any]]:
    chips: list[dict[str, Any]] = []
    for block in tool_results:
        tool = block.get("tool") or block.get("error")
        tables = block.get("tables") or []
        if block.get("suppressed"):
            chips.append(
                {
                    "label": f"{tool} (suppressed)",
                    "value": block.get("n"),
                    "tool": tool,
                    "tables": tables,
                }
            )
            continue
        metrics = block.get("metrics") or {}
        for k, v in list(metrics.items())[:4]:
            chips.append({"label": k.replace("_", " "), "value": v, "tool": tool})
        if "burnout_risk_avg_pct" in block:
            chips.append(
                {
                    "label": "burnout risk avg %",
                    "value": block["burnout_risk_avg_pct"],
                    "tool": tool,
                }
            )
        if "high_risk_count" in block:
            chips.append(
                {
                    "label": "high risk count",
                    "value": block["high_risk_count"],
                    "tool": tool,
                }
            )
        if "departments" in block:
            chips.append(
                {
                    "label": "departments",
                    "value": len(block["departments"]),
                    "tool": tool,
                }
            )
        if block.get("result"):
            r = block["result"]
            chips.append(
                {
                    "label": "simulated burnout avg %",
                    "value": (r.get("burnout_risk_avg_pct") or [None, None])[-1],
                    "tool": tool,
                }
            )
        if "net_impact_sar" in block:
            chips.append(
                {
                    "label": "net impact SAR",
                    "value": block["net_impact_sar"],
                    "tool": tool,
                }
            )
        if "counts_by_status" in block:
            chips.append(
                {
                    "label": "interventions total",
                    "value": block.get("total"),
                    "tool": tool,
                }
            )
        if "people_with_zero_recognition_90d" in block:
            chips.append(
                {
                    "label": "zero recognition (90d)",
                    "value": block["people_with_zero_recognition_90d"],
                    "tool": tool,
                }
            )
        if not chips or chips[-1].get("tool") != tool:
            chips.append({"label": str(tool), "value": None, "tool": tool, "tables": tables})
    # de-dupe by label keeping first
    seen: set[str] = set()
    out = []
    for c in chips:
        key = f"{c.get('tool')}:{c.get('label')}"
        if key in seen:
            continue
        seen.add(key)
        out.append(c)
    return out[:10]


def _rule_phrase(
    *,
    question: str,
    language: str,
    role: str,
    tool_results: list[dict],
) -> dict[str, Any]:
    findings: list[str] = []
    actions: list[str] = []
    summary = ""

    for block in tool_results:
        if block.get("error") == "tool_not_allowed":
            findings.append(
                "Requested data is outside your role scope."
                if language == "en"
                else "البيانات المطلوبة خارج نطاق دورك."
            )
            continue
        if block.get("suppressed"):
            findings.append(
                "This group has fewer than 5 people — aggregates are suppressed."
                if language == "en"
                else "هذه المجموعة أقل من 5 أشخاص — المجمّعات مخفية."
            )
            continue
        tool = block.get("tool")
        if tool == "my_summary":
            m = block.get("metrics") or {}
            score = m.get("performance_score")
            burn = m.get("burnout_risk_pct")
            ideas = m.get("ideas_total")
            shipped = m.get("ideas_shipped")
            if language == "ar":
                findings.append(f"درجة أدائك الحالية {score} — ليست ترتيباً.")
                findings.append(
                    f"خطر الاحتراق {burn}% (دعم قرار، وليس تشخيصاً)."
                )
                findings.append(f"أفكار: {ideas} · نُفّذ منها {shipped}.")
                summary = "ركز على شحن فكرة واحدة وتنمية مهارة واحدة هذا الشهر."
                actions = [
                    "افتح مسار النمو",
                    "قدّم أو انضم لفكرة في مختبر الابتكار",
                ]
            else:
                findings.append(
                    f"Your EMPULSE score is {score} on your own series — never a rank."
                )
                findings.append(
                    f"Burnout risk is {burn}% (decision support, not a diagnosis)."
                )
                findings.append(
                    f"Ideas: {ideas} submitted · {shipped} shipped."
                )
                summary = (
                    "Ship one idea and pair it with one growth skill this month."
                )
                actions = [
                    "Open My Growth Path",
                    "Submit or join one Innovation Lab idea if capacity allows",
                ]
        elif tool == "my_growth":
            n = block.get("skills_count", 0)
            findings.append(
                f"You have {n} skills on file."
                if language == "en"
                else f"لديك {n} مهارات مسجّلة."
            )
            if not summary:
                summary = (
                    "Pick the skill with the largest gap to your next role."
                    if language == "en"
                    else "اختر المهارة ذات أكبر فجوة لدورك التالي."
                )
        elif tool == "team_burnout_summary":
            findings.append(
                f"Team burnout average {block.get('burnout_risk_avg_pct')}% · "
                f"high-risk count {block.get('high_risk_count')} (n={block.get('n')})."
                if language == "en"
                else f"متوسط احتراق الفريق {block.get('burnout_risk_avg_pct')}% · "
                f"عدد عالي المخاطر {block.get('high_risk_count')}."
            )
            summary = (
                "Reallocate load for at-risk people and schedule supportive check-ins."
                if language == "en"
                else "أعد توزيع الحمل وجدول لقاءات دعم."
            )
            actions = [
                "Open Burnout Early Warning",
                "Propose an intervention (starts as proposed — you approve)",
            ]
        elif tool == "team_drivers":
            drivers = ", ".join(d["driver"] for d in block.get("drivers") or [])
            findings.append(
                f"Leading drivers: {drivers}."
                if language == "en"
                else f"أبرز المحركات: {drivers}."
            )
        elif tool == "team_performance_summary":
            findings.append(
                f"Performance avg {block.get('performance_avg')} · "
                f"engagement avg {block.get('engagement_avg')}."
                if language == "en"
                else f"متوسط الأداء {block.get('performance_avg')} · "
                f"الاندماج {block.get('engagement_avg')}."
            )
        elif tool == "org_burnout_by_department":
            depts = block.get("departments") or []
            top = sorted(
                depts,
                key=lambda d: (-(d.get("high_risk_count") or 0), d.get("department") or ""),
            )[:3]
            for d in top:
                findings.append(
                    f"{d['department']}: burnout avg {d['burnout_risk_avg_pct']}% "
                    f"(high-risk {d['high_risk_count']}, n={d['n']})."
                )
            summary = (
                "Target workload and recognition programs in the hottest departments."
                if language == "en"
                else "وجّه برامج عبء العمل والتقدير للأقسام الأكثر ضغطاً."
            )
            actions = ["Open Burnout Intelligence", "Run a What-if scenario"]
        elif tool == "intervention_status":
            findings.append(
                f"Interventions by status: {block.get('counts_by_status')}."
                if language == "en"
                else f"التدخلات حسب الحالة: {block.get('counts_by_status')}."
            )
        elif tool == "recognition_gaps":
            if block.get("own_data_only"):
                findings.append(
                    f"Received {block.get('received_90d')} · sent {block.get('sent_90d')} (90d)."
                    if language == "en"
                    else f"استلمت {block.get('received_90d')} · أرسلت {block.get('sent_90d')} (90 يوماً)."
                )
            else:
                findings.append(
                    f"{block.get('people_with_zero_recognition_90d')} people with zero "
                    f"recognition in 90 days (aggregates only)."
                    if language == "en"
                    else f"{block.get('people_with_zero_recognition_90d')} بلا تقدير خلال 90 يوماً."
                )
            if not summary:
                summary = (
                    "Close recognition gaps with a structured program."
                    if language == "en"
                    else "أغلق فجوات التقدير ببرنامج منظم."
                )
        elif tool == "economic_impact_summary":
            if block.get("available"):
                findings.append(
                    f"Net impact {block.get('net_impact_sar')} SAR · "
                    f"retention savings {block.get('retention_savings_sar')} SAR "
                    f"({block.get('month')}) — estimated."
                )
            else:
                findings.append("Economic monthly series not available yet.")
        elif tool == "what_if":
            if not block.get("allowed"):
                findings.append(block.get("message") or "Simulation not available.")
            else:
                r = block.get("result") or {}
                bb = r.get("burnout_risk_avg_pct") or [None, None]
                findings.append(
                    f"Simulated burnout avg {bb[0]}% → {bb[1]}% · "
                    f"estimated saving {r.get('estimated_saving_sar')} SAR."
                )
                summary = (
                    "Treat the simulation as estimated decision support — confirm before acting."
                    if language == "en"
                    else "عامل المحاكاة كدعم قرار تقديري — أكّد قبل التنفيذ."
                )
                actions = ["Open What-if Simulator", "Send to Intervention Center"]

    if not findings:
        findings = [
            "I used your allowed tools but found limited signal for this question."
            if language == "en"
            else "استخدمت الأدوات المسموحة لكن الإشارة محدودة لهذا السؤال."
        ]
    if not summary:
        summary = (
            "Review the findings and choose one human-approved next step."
            if language == "en"
            else "راجع النتائج واختر خطوة تالية بموافقة بشرية."
        )
    if not actions:
        actions = (
            ["Open the relevant EMPULSE screen for your role"]
            if language == "en"
            else ["افتح الشاشة المناسبة لدورك في EMPULSE"]
        )

    # Propose intervention draft for manager/hr (not created until confirm)
    propose = None
    if role in (
        UserProfile.Role.MANAGER,
        UserProfile.Role.HR,
        UserProfile.Role.ADMIN,
    ) and any(
        b.get("tool") in ("team_burnout_summary", "team_drivers", "what_if")
        for b in tool_results
        if not b.get("error")
    ):
        propose = {
            "type": "workload_relief",
            "driver": "workload",
            "rationale": summary,
            "expected_risk_reduction_pts": 10,
            "requires_confirmation": True,
        }

    return {
        "summary": summary,
        "findings": findings[:5],
        "recommendation": {
            "summary": summary,
            "actions": actions[:4],
            "propose_intervention": propose,
        },
    }


def _log_query(*, user, path: str, tools: list[str], language: str, refused: bool) -> None:
    role = get_user_role(user)
    meta: dict[str, Any] = {
        "tools": tools,
        "language": language,
        "refused": refused,
        "role": role,
    }
    # Never store employee question text.
    if role != UserProfile.Role.EMPLOYEE:
        meta["question_logged"] = False
    AuditLog.objects.create(
        actor=user,
        action=AuditLog.Action.PULSEAI_QUERY,
        employee=None,
        path=path,
        metadata=meta,
    )


def confirm_proposed_intervention(user, draft: dict[str, Any]) -> dict[str, Any] | None:
    """Create status=proposed only after explicit user confirmation."""
    role = get_user_role(user)
    if role not in (
        UserProfile.Role.MANAGER,
        UserProfile.Role.HR,
        UserProfile.Role.ADMIN,
    ):
        return None
    owner = get_user_employee(user)
    if owner is None:
        return None

    employee_id = draft.get("employee_id")
    visible = set(employees_visible_to(user).values_list("id", flat=True))
    if role == UserProfile.Role.MANAGER:
        if employee_id not in visible:
            # default: first direct report with elevated burnout
            from pulse.models import EmployeeCurrent

            elev = (
                EmployeeCurrent.objects.filter(employee_id__in=visible, burnout_risk_pct__gte=60)
                .order_by("employee__full_name")
                .first()
            )
            if elev is None:
                return None
            employee_id = elev.employee_id
    elif employee_id is None:
        return None
    elif role in (UserProfile.Role.HR, UserProfile.Role.ADMIN) and employee_id not in visible:
        return None

    from pulse.models import EmployeeCurrent

    try:
        baseline = EmployeeCurrent.objects.get(employee_id=employee_id).burnout_risk_pct
    except EmployeeCurrent.DoesNotExist:
        baseline = int(draft.get("baseline_risk_pct") or 0)

    next_id = (
        Intervention.objects.order_by("-id").values_list("id", flat=True).first() or 0
    ) + 1
    item = Intervention.objects.create(
        id=next_id,
        employee_id=employee_id,
        type=str(draft.get("type") or "workload_relief")[:128],
        rationale=str(draft.get("rationale") or "PulseAI proposal")[:4000],
        driver=str(draft.get("driver") or "workload")[:128],
        status="proposed",
        proposed_by="pulseai",
        owner=owner,
        created_at=date.today(),
        expected_risk_reduction_pts=int(draft.get("expected_risk_reduction_pts") or 10),
        cost_sar=int(draft.get("cost_sar") or 0),
        human_approved=False,
        baseline_risk_pct=int(baseline),
        outcome="",
    )
    return {
        "id": item.id,
        "status": item.status,
        "type": item.type,
        "employee_id": item.employee_id,
        "human_approved": False,
    }


def ask(
    user,
    question: str,
    *,
    path: str = "/api/pulseai/",
    confirm_intervention: bool = False,
    intervention_draft: dict | None = None,
) -> dict[str, Any]:
    role = get_user_role(user)
    q = (question or "").strip() or (
        "How am I doing?" if role == UserProfile.Role.EMPLOYEE else "What should I know?"
    )
    language = detect_language(q)

    # Confirm path (human in the loop)
    if confirm_intervention and intervention_draft:
        created = confirm_proposed_intervention(user, intervention_draft)
        _log_query(
            user=user,
            path=path,
            tools=["confirm_intervention"],
            language=language,
            refused=False,
        )
        return {
            "question": q,
            "language": language,
            "refused": False,
            "data_used": [],
            "findings": [
                "Intervention created as proposed — a person must approve before it starts."
                if language == "en"
                else "أُنشئ التدخل كمقترح — يجب موافقة شخص قبل البدء."
            ],
            "recommendation": {
                "summary": "Review the proposed intervention in Intervention Center.",
                "actions": ["Open Intervention Center"],
            },
            "disclaimer": DISCLAIMER,
            "never_sees": NEVER_SEES.get(role or "", []),
            "tools_called": ["confirm_intervention"],
            "engine": "rules",
            "proposed_intervention": created,
            "awaiting_confirmation": False,
        }

    refusal = is_refusal(q)
    if refusal:
        ans = _refusal_answer(q, language, refusal)
        ans["never_sees"] = NEVER_SEES.get(role or "", [])
        _log_query(user=user, path=path, tools=[], language=language, refused=True)
        return ans

    if role == UserProfile.Role.EMPLOYEE and employee_out_of_scope(q):
        ans = _refusal_answer(q, language, "rank")
        if language == "ar":
            ans["recommendation"]["summary"] = (
                "أرى بياناتك فقط. اسأل عن ملخصك أو نموك أو أفكارك."
            )
        else:
            ans["recommendation"]["summary"] = (
                "You only see your own data. Ask about your summary, growth, or ideas."
            )
        ans["refusal_reason"] = "out_of_scope"
        ans["never_sees"] = NEVER_SEES.get(role or "", [])
        _log_query(user=user, path=path, tools=[], language=language, refused=True)
        return ans

    allowed = allowed_tools_for(role)
    engine = "rules"
    tools: list[str] = []

    if gemini_available():
        picked = pick_tools_with_gemini(q, allowed, language)
        if picked:
            tools = picked
            engine = "gemini"

    if not tools:
        tools = route_tools(q, allowed)
        engine = "rules" if engine != "gemini" else engine

    tool_kwargs: dict[str, Any] = {}
    if "what_if" in tools:
        tool_kwargs["controls"] = extract_what_if_controls(q)

    results = [run_tool(name, user, **tool_kwargs) for name in tools]

    phrased = None
    if gemini_available() and engine == "gemini":
        phrased = phrase_answer_with_gemini(
            question=q, language=language, tool_results=results
        )
        if not phrased:
            engine = "rules"

    if not phrased:
        phrased = _rule_phrase(
            question=q, language=language, role=role or "", tool_results=results
        )

    findings = phrased.get("findings") or []
    rec = phrased.get("recommendation") or {}
    if isinstance(rec, str):
        rec = {"summary": rec, "actions": []}
    # Ensure propose_intervention from rules if gemini omitted it
    if not rec.get("propose_intervention"):
        rules = _rule_phrase(
            question=q, language=language, role=role or "", tool_results=results
        )
        rec["propose_intervention"] = rules["recommendation"].get(
            "propose_intervention"
        )

    headline = phrased.get("summary") or rec.get("summary") or ""

    answer = {
        "question": q,
        "language": language,
        "refused": False,
        "headline": headline,
        "data_used": _data_used_chips(results),
        "findings": findings[:5],
        "recommendation": {
            "summary": rec.get("summary") or headline,
            "actions": list(rec.get("actions") or [])[:4],
            "propose_intervention": rec.get("propose_intervention"),
        },
        "disclaimer": DISCLAIMER,
        "never_sees": NEVER_SEES.get(role or "", []),
        "tools_called": tools,
        "engine": engine,
        "own_data_only": role == UserProfile.Role.EMPLOYEE,
        "individuals_included": False,
        "executive_aggregates_only": role == UserProfile.Role.EXECUTIVE,
        "proposed_intervention": None,
        "awaiting_confirmation": bool(
            (rec.get("propose_intervention") or {}).get("requires_confirmation")
        ),
        "stub": False,
    }

    _log_query(user=user, path=path, tools=tools, language=language, refused=False)
    return answer
