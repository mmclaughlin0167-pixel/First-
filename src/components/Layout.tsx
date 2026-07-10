import { NavLink, Outlet } from 'react-router-dom'
import {
  Dumbbell,
  LayoutDashboard,
  ListPlus,
  History,
  TrendingUp,
  ListChecks,
  Ruler,
  PieChart,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard, end: true },
  { to: '/log', label: 'Log Workout', shortLabel: 'Log', icon: ListPlus, end: false },
  { to: '/history', label: 'History', shortLabel: 'History', icon: History, end: false },
  { to: '/progress', label: 'Progress', shortLabel: 'Progress', icon: TrendingUp, end: false },
  { to: '/reports', label: 'Reports', shortLabel: 'Reports', icon: PieChart, end: false },
  { to: '/body-stats', label: 'Body Stats', shortLabel: 'Body', icon: Ruler, end: false },
  { to: '/exercises', label: 'Exercises', shortLabel: 'Moves', icon: ListChecks, end: false },
]

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row pt-[env(safe-area-inset-top)]">
      <aside className="hidden md:flex md:w-60 md:min-h-screen md:flex-col border-r border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400">
            <Dumbbell size={22} />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">IronLog</h1>
            <p className="text-xs text-slate-400">Workout Tracker</p>
          </div>
        </div>
        <nav className="flex flex-col px-3 gap-1">
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

      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/60 px-5 py-4 backdrop-blur md:hidden">
        <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400">
          <Dumbbell size={20} />
        </div>
        <div>
          <h1 className="text-base font-semibold leading-tight">IronLog</h1>
          <p className="text-xs text-slate-400">Workout Tracker</p>
        </div>
      </div>

      <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8 max-w-5xl w-full mx-auto">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-800 bg-slate-900/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV_ITEMS.map(({ to, shortLabel, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                isActive ? 'text-emerald-400' : 'text-slate-500'
              }`
            }
          >
            <Icon size={20} />
            {shortLabel}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
