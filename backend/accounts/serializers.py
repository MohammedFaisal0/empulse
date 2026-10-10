from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import serializers, status
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.exceptions import ApiError
from accounts.permissions import get_user_profile


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        email = attrs["email"].strip().lower()
        password = attrs["password"]

        user = authenticate(
            request=self.context.get("request"),
            username=email,
            password=password,
        )
        if user is None:
            try:
                existing = User.objects.get(email__iexact=email)
            except User.DoesNotExist:
                existing = None
            if existing is not None:
                user = authenticate(
                    request=self.context.get("request"),
                    username=existing.username,
                    password=password,
                )

        if user is None or not user.is_active:
            raise ApiError(
                "auth.invalid_credentials",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        profile = get_user_profile(user)
        if profile is None:
            raise ApiError(
                "auth.invalid_credentials",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }


class MeSerializer(serializers.Serializer):
    role = serializers.CharField()
    employee_id = serializers.IntegerField(allow_null=True)
    name = serializers.CharField(allow_null=True)
    team = serializers.CharField(allow_null=True)
    email = serializers.EmailField()
