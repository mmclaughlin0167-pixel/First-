import { NavLink, Outlet } from 'react-router-dom'
import {
  Dumbbell,
  LayoutDashboard,
  ListPlus,
  History,
  TrendingUp,
  ListChecks,
  Ruler,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/log', label: 'Log Workout', icon: ListPlus, end: false },
  { to: '/history', label: 'History', icon: History, end: false },
  { to: '/progress', label: 'Progress', icon: TrendingUp, end: false },
  { to: '/body-stats', label: 'Body Stats', icon: Ruler, end: false },
  { to: '/exercises', label: 'Exercises', icon: ListChecks, end: false },
]

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      <aside className="md:w-60 md:min-h-screen border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400">
            <Dumbbell size={22} />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">IronLog</h1>
            <p className="text-xs text-slate-400">Workout Tracker</p>
          </div>
        </div>
        <nav className="flex md:flex-col overflow-x-auto md:overflow-visible px-2 md:px-3 pb-3 md:pb-0 gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-5xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
