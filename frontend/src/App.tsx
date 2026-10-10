import { Navigate, Route, Routes } from 'react-router-dom'

import { DesignPreview } from './screens/DesignPreview'
import { HealthPage } from './screens/HealthPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HealthPage />} />
      <Route path="/design-preview" element={<DesignPreview />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
