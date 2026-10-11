import json

from rest_framework import serializers

from pulse.models import EmployeeCurrent, WeeklyMetric


def parse_drivers(raw: str) -> dict:
    if not raw:
        return {"increasing": [], "protective": []}
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {"increasing": [], "protective": []}
    if not isinstance(data, dict):
        return {"increasing": [], "protective": []}
    return {
        "increasing": data.get("increasing") or [],
        "protective": data.get("protective") or [],
    }


class BurnoutPersonSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    job_title = serializers.CharField()
    team = serializers.CharField(allow_null=True)
    manager_name = serializers.CharField(allow_null=True)
    burnout_risk_pct = serializers.IntegerField()
    burnout_level = serializers.CharField()
    burnout_change_6w_pts = serializers.IntegerField()
    burnout_6w_ago_pct = serializers.IntegerField()
    performance_score = serializers.IntegerField()
    performance_tier = serializers.CharField()
    wellbeing_score = serializers.IntegerField()
    detected_on = serializers.CharField(allow_null=True)
    as_of = serializers.CharField()
    drivers = serializers.DictField()
    trajectory = serializers.ListField(child=serializers.DictField())


class ManagerBurnoutResponseSerializer(serializers.Serializer):
    attention_count = serializers.IntegerField()
    watch_count = serializers.IntegerField()
    healthy_count = serializers.IntegerField()
    direct_reports = serializers.IntegerField()
    people = BurnoutPersonSerializer(many=True)
