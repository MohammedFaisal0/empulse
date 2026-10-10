from django.urls import include, path
from rest_framework.routers import DefaultRouter

from org.views import EmployeeViewSet

router = DefaultRouter()
router.register("employees", EmployeeViewSet, basename="employee")

urlpatterns = [
    path("", include(router.urls)),
]
