"""Optional Gemini API — tool picking + phrasing from aggregated tool JSON only."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any

from django.conf import settings


def gemini_available() -> bool:
    return bool(getattr(settings, "GEMINI_API_KEY", "") or "")


def _endpoint() -> str:
    model = getattr(settings, "GEMINI_MODEL", "gemini-2.0-flash") or "gemini-2.0-flash"
    key = settings.GEMINI_API_KEY
    return (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={key}"
    )


def _post(payload: dict) -> dict | None:
    if not gemini_available():
        return None
    try:
        req = urllib.request.Request(
            _endpoint(),
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError):
        return None


def pick_tools_with_gemini(
    question: str, allowed: list[str], language: str
) -> list[str] | None:
    """Ask Gemini to choose tool names from the allow-list only."""
    prompt = (
        "You are EMPULSE PulseAI router. Pick 1-3 tools from this allow-list only. "
        f"Allow-list: {allowed}. "
        f"Respond with JSON only: {{\"tools\": [\"name\", ...]}}. "
        f"Language of question: {language}. Question: {question}"
    )
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 128},
    }
    data = _post(body)
    if not data:
        return None
    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
        parsed = json.loads(text)
        tools = [t for t in parsed.get("tools", []) if t in allowed]
        return tools[:3] or None
    except (KeyError, IndexError, TypeError, json.JSONDecodeError):
        return None


def phrase_answer_with_gemini(
    *,
    question: str,
    language: str,
    tool_results: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """
    Phrase findings + recommendation from aggregated tool JSON only.
    Never pass employee names unless already present in tool_results (usually not).
    """
    # Strip any accidental name-like keys for safety.
    safe = json.loads(json.dumps(tool_results, default=str))
    for block in safe:
        for k in list(block.keys()):
            if k.endswith("_name") or k in ("full_name", "names", "people_list"):
                block.pop(k, None)

    prompt = (
        "You are EMPULSE PulseAI. Using ONLY the aggregated JSON tool results, "
        "write an answer. Respond with JSON only:\n"
        '{"summary":"...","findings":["...","...","..."],'
        '"recommendation":{"summary":"...","actions":["...","..."]}}\n'
        f"Language must be {'Arabic' if language == 'ar' else 'English'}. "
        "Do not invent individuals. Do not rank people. "
        "Wellbeing is decision support, not a diagnosis. "
        f"Question: {question}\nTool results: {json.dumps(safe, ensure_ascii=False)}"
    )
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 512},
    }
    data = _post(body)
    if not data:
        return None
    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
        return json.loads(text)
    except (KeyError, IndexError, TypeError, json.JSONDecodeError):
        return None
