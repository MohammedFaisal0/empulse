import { Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { A01Login } from './screens/access/A01-Login'
import { A02RoleRouting } from './screens/access/A02-RoleRouting'
import { DesignPreview } from './screens/DesignPreview'
import { HealthPage } from './screens/HealthPage'
import { M01TeamOverview } from './screens/manager/M01-TeamOverview'
import { M02TeamPerformance } from './screens/manager/M02-TeamPerformance'
import { M03TeamPulse } from './screens/manager/M03-TeamPulse'
import { M04TeamMembers } from './screens/manager/M04-TeamMembers'
import { M04bTeamMemberProfile } from './screens/manager/M04b-TeamMemberProfile'
import { M05PerformanceWellbeing } from './screens/manager/M05-PerformanceWellbeing'
import { M06BurnoutEarlyWarning } from './screens/manager/M06-BurnoutEarlyWarning'
import { M07TeamMorale } from './screens/manager/M07-TeamMorale'
import { M08Recognition } from './screens/manager/M08-Recognition'
import { M09TeamInnovation } from './screens/manager/M09-TeamInnovation'
import { M10Interventions } from './screens/manager/M10-Interventions'
import { M11TeamReports } from './screens/manager/M11-TeamReports'
import { M12PulseAI } from './screens/manager/M12-PulseAI'
import { M13Settings } from './screens/manager/M13-Settings'
import { E01MyOverview } from './screens/employee/E01-MyOverview'
import { E02MyPerformance } from './screens/employee/E02-MyPerformance'
import { E03MyDigitalTwin } from './screens/employee/E03-MyDigitalTwin'
import { E04MyInnovationDna } from './screens/employee/E04-MyInnovationDna'
import { E05InnovationLab } from './screens/employee/E05-InnovationLab'
import { E06InnovationMarketplace } from './screens/employee/E06-InnovationMarketplace'
import { E07MyGrowthPath } from './screens/employee/E07-MyGrowthPath'
import { E08Recognition } from './screens/employee/E08-Recognition'
import { E09PulseAI } from './screens/employee/E09-PulseAI'
import { E10MyReports } from './screens/employee/E10-MyReports'
import { E11Settings } from './screens/employee/E11-Settings'
import { PlaceholderScreen } from './screens/PlaceholderScreen'

const managerRoles = ['manager', 'hr', 'admin'] as const
const employeeRoles = ['employee'] as const

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HealthPage />} />
        <Route path="/login" element={<A01Login />} />
        <Route path="/role" element={<A02RoleRouting />} />
        <Route path="/design-preview" element={<DesignPreview />} />

        <Route
          path="/manager/overview"
          element={
            <RequireAuth roles={[...managerRoles]}>
              <M01TeamOverview />
            </RequireAuth>
          }
        />
        <Route
          path="/manager/performance"
          element={
            <RequireAuth roles={[...managerRoles]}>
              <M02TeamPerformance />
            </RequireAuth>
          }
        />
        <Route
          path="/manager/pulse"
          element={
            <RequireAuth roles={[...managerRoles]}>
              <M03TeamPulse />
            </RequireAuth>
          }
        />
        <Route
          path="/manager/members"
          element={
            <RequireAuth roles={[...managerRoles]}>
              <M04TeamMembers />
            </RequireAuth>
          }
        />
        <Route
          path="/manager/members/:id"
          element={
            <RequireAuth roles={[...managerRoles]}>
              <M04bTeamMemberProfile />
            </RequireAuth>
          }
        />
        <Route
          path="/manager/matrix"
          element={
            <RequireAuth roles={[...managerRoles]}>
              <M05PerformanceWellbeing />
            </RequireAuth>
          }
        />
        <Route
          path="/manager/burnout"
          element={
            <RequireAuth roles={[...managerRoles]}>
              <M06BurnoutEarlyWarning />
            </RequireAuth>
          }
        />
        <Route
          path="/manager/morale"
          element={
            <RequireAuth roles={[...managerRoles]}>
              <M07TeamMorale />
            </RequireAuth>
          }
        />
        <Route
          path="/manager/recognition"
          element={
            <RequireAuth roles={[...managerRoles]}>
              <M08Recognition />
            </RequireAuth>
          }
        />
        <Route
          path="/manager/innovation"
          element={
            <RequireAuth roles={[...managerRoles]}>
              <M09TeamInnovation />
            </RequireAuth>
          }
        />
        <Route
          path="/manager/interventions"
          element={
            <RequireAuth roles={[...managerRoles]}>
              <M10Interventions />
            </RequireAuth>
          }
        />
        <Route
          path="/manager/reports"
          element={
            <RequireAuth roles={[...managerRoles]}>
              <M11TeamReports />
            </RequireAuth>
          }
        />
        <Route
          path="/manager/pulseai"
          element={
            <RequireAuth roles={[...managerRoles]}>
              <M12PulseAI />
            </RequireAuth>
          }
        />
        <Route
          path="/manager/settings"
          element={
            <RequireAuth roles={[...managerRoles]}>
              <M13Settings />
            </RequireAuth>
          }
        />
        <Route
          path="/employee/overview"
          element={
            <RequireAuth roles={[...employeeRoles]}>
              <E01MyOverview />
            </RequireAuth>
          }
        />
        <Route
          path="/employee/performance"
          element={
            <RequireAuth roles={[...employeeRoles]}>
              <E02MyPerformance />
            </RequireAuth>
          }
        />
        <Route
          path="/employee/twin"
          element={
            <RequireAuth roles={[...employeeRoles]}>
              <E03MyDigitalTwin />
            </RequireAuth>
          }
        />
        <Route
          path="/employee/innovation-dna"
          element={
            <RequireAuth roles={[...employeeRoles]}>
              <E04MyInnovationDna />
            </RequireAuth>
          }
        />
        <Route
          path="/employee/innovation-lab"
          element={
            <RequireAuth roles={[...employeeRoles]}>
              <E05InnovationLab />
            </RequireAuth>
          }
        />
        <Route
          path="/employee/marketplace"
          element={
            <RequireAuth roles={[...employeeRoles]}>
              <E06InnovationMarketplace />
            </RequireAuth>
          }
        />
        <Route
          path="/employee/growth"
          element={
            <RequireAuth roles={[...employeeRoles]}>
              <E07MyGrowthPath />
            </RequireAuth>
          }
        />
        <Route
          path="/employee/recognition"
          element={
            <RequireAuth roles={[...employeeRoles]}>
              <E08Recognition />
            </RequireAuth>
          }
        />
        <Route
          path="/employee/pulseai"
          element={
            <RequireAuth roles={[...employeeRoles]}>
              <E09PulseAI />
            </RequireAuth>
          }
        />
        <Route
          path="/employee/reports"
          element={
            <RequireAuth roles={[...employeeRoles]}>
              <E10MyReports />
            </RequireAuth>
          }
        />
        <Route
          path="/employee/settings"
          element={
            <RequireAuth roles={[...employeeRoles]}>
              <E11Settings />
            </RequireAuth>
          }
        />
        <Route
          path="/hr/executive"
          element={
            <RequireAuth roles={['hr', 'executive', 'admin']}>
              <PlaceholderScreen
                role="hr"
                path="/hr/executive"
                titleKey="shell.hr.items.executive"
              />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
