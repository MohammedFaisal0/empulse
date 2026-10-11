from django.urls import path

from pulse.manager_batch import (
    ManagerInnovationView,
    ManagerInterventionDetailView,
    ManagerInterventionsView,
    ManagerMoraleView,
    ManagerPulseAIStubView,
    ManagerRecognitionView,
    ManagerReportsView,
)
from pulse.manager_team import ManagerTeamView
from pulse.me_views import (
    MeGrowthView,
    MeInnovationDnaView,
    MeInnovationLabView,
    MeMarketplaceView,
    MeOverviewView,
    MePerformanceView,
    MePulseAIStubView,
    MeRecognitionWallView,
    MeReportsView,
    MeSettingsStubView,
    MeTwinView,
)
from pulse.views import (
    InterventionStubView,
    ManagerBurnoutView,
    ManagerMemberProfileView,
)

urlpatterns = [
    path("me/overview/", MeOverviewView.as_view(), name="me-overview"),
    path("me/performance/", MePerformanceView.as_view(), name="me-performance"),
    path("me/twin/", MeTwinView.as_view(), name="me-twin"),
    path("me/innovation-dna/", MeInnovationDnaView.as_view(), name="me-innovation-dna"),
    path("me/innovation-lab/", MeInnovationLabView.as_view(), name="me-innovation-lab"),
    path("me/marketplace/", MeMarketplaceView.as_view(), name="me-marketplace"),
    path("me/growth/", MeGrowthView.as_view(), name="me-growth"),
    path("me/recognition/", MeRecognitionWallView.as_view(), name="me-recognition"),
    path("me/pulseai/", MePulseAIStubView.as_view(), name="me-pulseai"),
    path("me/reports/", MeReportsView.as_view(), name="me-reports"),
    path("me/settings/", MeSettingsStubView.as_view(), name="me-settings"),
    path("manager/team/", ManagerTeamView.as_view(), name="manager-team"),
    path("manager/burnout/", ManagerBurnoutView.as_view(), name="manager-burnout"),
    path(
        "manager/members/<int:pk>/",
        ManagerMemberProfileView.as_view(),
        name="manager-member-profile",
    ),
    path(
        "manager/members/<int:pk>/intervention-stub/",
        InterventionStubView.as_view(),
        name="manager-intervention-stub",
    ),
    path("manager/morale/", ManagerMoraleView.as_view(), name="manager-morale"),
    path(
        "manager/recognition/",
        ManagerRecognitionView.as_view(),
        name="manager-recognition",
    ),
    path(
        "manager/innovation/",
        ManagerInnovationView.as_view(),
        name="manager-innovation",
    ),
    path(
        "manager/interventions/",
        ManagerInterventionsView.as_view(),
        name="manager-interventions",
    ),
    path(
        "manager/interventions/<int:pk>/",
        ManagerInterventionDetailView.as_view(),
        name="manager-intervention-detail",
    ),
    path("manager/reports/", ManagerReportsView.as_view(), name="manager-reports"),
    path("manager/pulseai/", ManagerPulseAIStubView.as_view(), name="manager-pulseai"),
]
