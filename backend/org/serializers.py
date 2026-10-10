from rest_framework import serializers

from org.models import Employee


class EmployeeListSerializer(serializers.ModelSerializer):
    team = serializers.CharField(source="team.name", allow_null=True)
    department = serializers.CharField(source="department.name")

    class Meta:
        model = Employee
        fields = (
            "id",
            "employee_code",
            "full_name",
            "email",
            "job_title",
            "department",
            "team",
        )


class EmployeeDetailSerializer(EmployeeListSerializer):
    manager_id = serializers.IntegerField(allow_null=True)

    class Meta(EmployeeListSerializer.Meta):
        fields = EmployeeListSerializer.Meta.fields + (
            "first_name",
            "last_name",
            "job_level",
            "work_location",
            "work_mode",
            "manager_id",
        )
