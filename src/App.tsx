import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { WorkoutDataProvider } from './store/WorkoutDataContext'
import { ThemeProvider } from './store/ThemeContext'

const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const LogWorkout = lazy(() => import('./pages/LogWorkout').then((m) => ({ default: m.LogWorkout })))
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })))
const ProgressPage = lazy(() => import('./pages/ProgressPage').then((m) => ({ default: m.ProgressPage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const BodyStatsPage = lazy(() =>
  import('./pages/BodyStatsPage').then((m) => ({ default: m.BodyStatsPage })),
)
const ExercisesPage = lazy(() =>
  import('./pages/ExercisesPage').then((m) => ({ default: m.ExercisesPage })),
)
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)

function RouteFallback() {
  return <div className="p-8 text-sm text-slate-600 dark:text-slate-500">Loading…</div>
}

function App() {
  return (
    <ThemeProvider>
      <WorkoutDataProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="log" element={<LogWorkout />} />
                <Route path="log/:sessionId" element={<LogWorkout />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="progress" element={<ProgressPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="body-stats" element={<BodyStatsPage />} />
                <Route path="exercises" element={<ExercisesPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </WorkoutDataProvider>
    </ThemeProvider>
  )
}

export default App
