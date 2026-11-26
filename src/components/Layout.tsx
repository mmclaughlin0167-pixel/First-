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
  Settings,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'
import { useTheme, type ThemePreference } from '../store/ThemeContext'

const THEME_ICON: Record<ThemePreference, typeof Sun> = {
  dark: Moon,
  light: Sun,
  system: Monitor,
}

const THEME_LABEL: Record<ThemePreference, string> = {
  dark: 'Dark theme',
  light: 'Light theme',
  system: 'System theme',
}

function ThemeToggleButton({ className = '' }: { className?: string }) {
  const { theme, cycleTheme } = useTheme()
  const Icon = THEME_ICON[theme]
  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={`rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 ${className}`}
      aria-label={`Theme: ${THEME_LABEL[theme]}. Click to change.`}
      title={`Theme: ${THEME_LABEL[theme]} (click to cycle)`}
    >
      <Icon size={18} />
    </button>
  )
}

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard, end: true },
  { to: '/log', label: 'Log Workout', shortLabel: 'Log', icon: ListPlus, end: false },
  { to: '/history', label: 'History', shortLabel: 'History', icon: History, end: false },
  { to: '/progress', label: 'Progress', shortLabel: 'Progress', icon: TrendingUp, end: false },
  { to: '/reports', label: 'Reports', shortLabel: 'Reports', icon: PieChart, end: false },
  { to: '/body-stats', label: 'Body Stats', shortLabel: 'Body', icon: Ruler, end: false },
  { to: '/exercises', label: 'Exercises', shortLabel: 'Moves', icon: ListChecks, end: false },
  { to: '/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings, end: false },
]

const MOBILE_TAB_ITEMS = NAV_ITEMS.filter((item) => item.to !== '/settings')

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row pt-[env(safe-area-inset-top)]">
      <aside className="hidden md:flex md:w-60 md:min-h-screen md:flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur">
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-600 dark:text-emerald-400">
              <Dumbbell size={22} />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">IronLog</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Workout Tracker</p>
            </div>
          </div>
          <ThemeToggleButton />
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
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-5 py-4 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-600 dark:text-emerald-400">
            <Dumbbell size={20} />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">IronLog</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Workout Tracker</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggleButton />
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `rounded-lg p-2 transition-colors ${
                isActive ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`
            }
            aria-label="Settings"
          >
            <Settings size={20} />
          </NavLink>
        </div>
      </div>

      <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8 max-w-5xl w-full mx-auto">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden">
        {MOBILE_TAB_ITEMS.map(({ to, shortLabel, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-500'
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
