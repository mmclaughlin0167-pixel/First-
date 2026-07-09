import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { LogWorkout } from './pages/LogWorkout'
import { HistoryPage } from './pages/HistoryPage'
import { ProgressPage } from './pages/ProgressPage'
import { ExercisesPage } from './pages/ExercisesPage'
import { WorkoutDataProvider } from './store/WorkoutDataContext'

function App() {
  return (
    <WorkoutDataProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="log" element={<LogWorkout />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="exercises" element={<ExercisesPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </WorkoutDataProvider>
  )
}

export default App
