import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Flame, ListPlus, Dumbbell, TrendingUp, Scale, Cake, Activity, Calendar, BarChart3 } from 'lucide-react'
import { useWorkoutData } from '../store/WorkoutDataContext'
import { Card, Button, EmptyState } from '../components/ui'
import {
  calculateAge,
  calculateBMI,
  currentStreak,
  sessionsThisWeek,
  sessionsToday,
  totalVolume,
  totalVolumeAllTime,
} from '../lib/stats'
import { toCm, toKg } from '../lib/units'

export function Dashboard() {
  const { sessions, exercises, profile, bodyLogs } = useWorkoutData()

  const streak = currentStreak(sessions)
  const thisWeek = sessionsThisWeek(sessions)
  const weeklyVolume = thisWeek.reduce((sum, s) => sum + totalVolume(s), 0)
  const todaysSessions = sessionsToday(sessions)
  const dailyVolume = todaysSessions.reduce((sum, s) => sum + totalVolume(s), 0)
  const allTimeVolume = totalVolumeAllTime(sessions)
  const recentSessions = sessions.slice(0, 5)
  const exerciseById = Object.fromEntries(exercises.map((e) => [e.id, e]))

  const latestWeightEntry = bodyLogs.find((e) => e.weight !== undefined)
  const age = profile.birthDate ? calculateAge(profile.birthDate) : null
  const bmi =
    latestWeightEntry?.weight !== undefined && profile.height !== undefined
      ? calculateBMI(
          toKg(latestWeightEntry.weight, latestWeightEntry.weightUnit),
          toCm(profile.height, profile.heightUnit),
        )
      : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-100">Welcome back</h2>
          <p className="text-sm text-slate-400">Here's how your training is going.</p>
        </div>
        <Link to="/log">
          <Button icon={<ListPlus size={16} />}>Log Workout</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-slate-400">
            <Dumbbell size={16} />
            <span className="text-xs font-medium">Total Workouts</span>
          </div>
          <p className="text-2xl font-semibold text-slate-100">{sessions.length}</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-slate-400">
            <Flame size={16} />
            <span className="text-xs font-medium">Current Streak</span>
          </div>
          <p className="text-2xl font-semibold text-slate-100">{streak}d</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-slate-400">
            <ListPlus size={16} />
            <span className="text-xs font-medium">This Week</span>
          </div>
          <p className="text-2xl font-semibold text-slate-100">{thisWeek.length}</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-slate-400">
            <Calendar size={16} />
            <span className="text-xs font-medium">Today's Volume</span>
          </div>
          <p className="text-2xl font-semibold text-slate-100">{dailyVolume.toLocaleString()}</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-slate-400">
            <TrendingUp size={16} />
            <span className="text-xs font-medium">Weekly Volume</span>
          </div>
          <p className="text-2xl font-semibold text-slate-100">{weeklyVolume.toLocaleString()}</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-slate-400">
            <BarChart3 size={16} />
            <span className="text-xs font-medium">Total Weight Lifted</span>
          </div>
          <p className="text-2xl font-semibold text-slate-100">{allTimeVolume.toLocaleString()}</p>
        </Card>
        {latestWeightEntry && (
          <Card className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-slate-400">
              <Scale size={16} />
              <span className="text-xs font-medium">Latest Weight</span>
            </div>
            <p className="text-2xl font-semibold text-slate-100">
              {latestWeightEntry.weight}
              {latestWeightEntry.weightUnit}
            </p>
          </Card>
        )}
        {age !== null && (
          <Card className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-slate-400">
              <Cake size={16} />
              <span className="text-xs font-medium">Age</span>
            </div>
            <p className="text-2xl font-semibold text-slate-100">{age}</p>
          </Card>
        )}
        {bmi !== null && (
          <Card className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-slate-400">
              <Activity size={16} />
              <span className="text-xs font-medium">BMI</span>
            </div>
            <p className="text-2xl font-semibold text-slate-100">{bmi.toFixed(1)}</p>
          </Card>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-300">Recent Workouts</h3>
        {recentSessions.length === 0 ? (
          <EmptyState
            title="No workouts yet"
            description="Log your first workout to start tracking your progress."
            action={
              <Link to="/log">
                <Button>Log a Workout</Button>
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {recentSessions.map((session) => (
              <Card key={session.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-100">{session.name}</p>
                  <p className="text-xs text-slate-400">
                    {format(parseISO(session.date), 'EEE, MMM d yyyy')} &middot;{' '}
                    {session.exercises
                      .map((e) => exerciseById[e.exerciseId]?.name)
                      .filter(Boolean)
                      .slice(0, 3)
                      .join(', ')}
                    {session.exercises.length > 3 ? '…' : ''}
                  </p>
                </div>
                <p className="text-sm font-semibold text-emerald-400">
                  {totalVolume(session).toLocaleString()} vol
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
