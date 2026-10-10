from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import viewsets
from rest_framework.response import Response

from accounts.permissions import (
    DenyExecutiveIndividualAccess,
    IsAuthenticatedWithProfile,
)
from org.privacy import (
    assert_not_executive_individual,
    employees_visible_to,
    maybe_audit_profile_read,
)
from org.serializers import EmployeeDetailSerializer, EmployeeListSerializer


@extend_schema_view(
    list=extend_schema(tags=["employees"]),
    retrieve=extend_schema(tags=["employees"]),
)
class EmployeeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Role-scoped employee directory / profile.
    Lists stay alphabetical (model Meta.ordering). Never ranked by score.
    """

    permission_classes = [IsAuthenticatedWithProfile, DenyExecutiveIndividualAccess]
    lookup_field = "pk"

    def get_queryset(self):
        assert_not_executive_individual(self.request.user)
        return employees_visible_to(self.request.user).order_by("full_name")

    def get_serializer_class(self):
        if self.action == "retrieve":
            return EmployeeDetailSerializer
        return EmployeeListSerializer

    def retrieve(self, request, *args, **kwargs):
        assert_not_executive_individual(request.user)
        instance = self.get_object()
        maybe_audit_profile_read(request, instance)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
