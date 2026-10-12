from django.urls import path

from pulse.manager_batch import (
    ManagerInnovationView,
    ManagerInterventionDetailView,
    ManagerInterventionsView,
    ManagerMoraleView,
    ManagerRecognitionView,
    ManagerReportsView,
)
from pulseai.views import HrPulseAIView, ManagerPulseAIView, MePulseAIView
from pulse.manager_team import ManagerTeamView
from pulse.hr_batch3b import (
    HrBurnoutIntelligenceView,
    HrMoraleView,
    HrPerformanceView,
    HrTeamMembersView,
    HrTeamsView,
)
from pulse.hr_batch3c import (
    HrInnovationView,
    HrInterventionDetailView,
    HrInterventionsView,
    HrMatrixView,
    HrRecognitionAnalyticsView,
)
from pulse.hr_batch3d import (
    HrCapabilityView,
    HrEconomicImpactView,
    HrGovernanceView,
    HrReportsExportView,
    HrReportsView,
)
from pulse.hr_simulate import (
    HrSimulateCompareView,
    HrSimulateMetaView,
    HrSimulateView,
)
from pulse.hr_views import (
    HrEmployeeProfileView,
    HrEmployeesExportView,
    HrEmployeesView,
    HrExecutivePulseView,
    HrOrganizationView,
)
from pulse.me_views import (
    MeGrowthView,
    MeInnovationDnaView,
    MeInnovationLabView,
    MeMarketplaceView,
    MeOverviewView,
    MePerformanceView,
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
    path("me/pulseai/", MePulseAIView.as_view(), name="me-pulseai"),
    path("me/reports/", MeReportsView.as_view(), name="me-reports"),
    path("me/settings/", MeSettingsStubView.as_view(), name="me-settings"),
    path("hr/employees/", HrEmployeesView.as_view(), name="hr-employees"),
    path(
        "hr/employees/export/",
        HrEmployeesExportView.as_view(),
        name="hr-employees-export",
    ),
    path(
        "hr/employees/<int:pk>/",
        HrEmployeeProfileView.as_view(),
        name="hr-employee-profile",
    ),
    path(
        "hr/executive-pulse/",
        HrExecutivePulseView.as_view(),
        name="hr-executive-pulse",
    ),
    path("hr/organization/", HrOrganizationView.as_view(), name="hr-organization"),
    path("hr/teams/", HrTeamsView.as_view(), name="hr-teams"),
    path(
        "hr/teams/<int:pk>/members/",
        HrTeamMembersView.as_view(),
        name="hr-team-members",
    ),
    path("hr/performance/", HrPerformanceView.as_view(), name="hr-performance"),
    path(
        "hr/burnout-intelligence/",
        HrBurnoutIntelligenceView.as_view(),
        name="hr-burnout-intelligence",
    ),
    path("hr/morale/", HrMoraleView.as_view(), name="hr-morale"),
    path("hr/innovation/", HrInnovationView.as_view(), name="hr-innovation"),
    path(
        "hr/recognition/",
        HrRecognitionAnalyticsView.as_view(),
        name="hr-recognition",
    ),
    path(
        "hr/interventions/",
        HrInterventionsView.as_view(),
        name="hr-interventions",
    ),
    path(
        "hr/interventions/<int:pk>/",
        HrInterventionDetailView.as_view(),
        name="hr-intervention-detail",
    ),
    path("hr/matrix/", HrMatrixView.as_view(), name="hr-matrix"),
    path("hr/capability/", HrCapabilityView.as_view(), name="hr-capability"),
    path("hr/economic/", HrEconomicImpactView.as_view(), name="hr-economic"),
    path("hr/reports/", HrReportsView.as_view(), name="hr-reports"),
    path(
        "hr/reports/export/",
        HrReportsExportView.as_view(),
        name="hr-reports-export",
    ),
    path("hr/governance/", HrGovernanceView.as_view(), name="hr-governance"),
    path("hr/pulseai/", HrPulseAIView.as_view(), name="hr-pulseai"),
    path("hr/simulate/meta/", HrSimulateMetaView.as_view(), name="hr-simulate-meta"),
    path("hr/simulate/", HrSimulateView.as_view(), name="hr-simulate"),
    path(
        "hr/simulate/compare/",
        HrSimulateCompareView.as_view(),
        name="hr-simulate-compare",
    ),
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
    path("manager/pulseai/", ManagerPulseAIView.as_view(), name="manager-pulseai"),
]
