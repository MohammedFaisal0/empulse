from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.exceptions import ApiError
from accounts.permissions import get_user_profile
from accounts.serializers import LoginSerializer, MeSerializer


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        request=LoginSerializer,
        responses={200: LoginSerializer},
        tags=["auth"],
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class RefreshView(TokenRefreshView):
    """POST /api/auth/refresh/ — body: {\"refresh\": \"...\"}."""

    @extend_schema(tags=["auth"])
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: MeSerializer}, tags=["users"])
    def get(self, request):
        profile = get_user_profile(request.user)
        if profile is None:
            raise ApiError("auth.profile_missing", status_code=status.HTTP_403_FORBIDDEN)

        employee = profile.employee
        team_name = None
        name = None
        employee_id = None
        if employee is not None:
            employee_id = employee.id
            name = employee.full_name
            if employee.team_id is not None:
                team_name = employee.team.name

        payload = {
            "role": profile.role,
            "employee_id": employee_id,
            "name": name,
            "team": team_name,
            "email": request.user.email,
        }
        return Response(MeSerializer(payload).data)
