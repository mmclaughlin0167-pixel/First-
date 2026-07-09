import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Plus, Trash2 } from 'lucide-react'
import { useWorkoutData } from '../store/WorkoutDataContext'
import { Button, Card, EmptyState } from '../components/ui'
import { bmiCategory, calculateAge, calculateBMI } from '../lib/stats'
import { toCm, toIn, toKg } from '../lib/units'
import type { BodyMeasurements } from '../types'

const BMI_CATEGORY_COLOR: Record<ReturnType<typeof bmiCategory>, string> = {
  Underweight: 'text-sky-400',
  Normal: 'text-emerald-400',
  Overweight: 'text-amber-400',
  Obese: 'text-red-400',
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function computeBMI(
  weight: number,
  weightUnit: 'lb' | 'kg',
  height: number | undefined,
  heightUnit: 'in' | 'cm',
): number | undefined {
  if (height === undefined) return undefined
  return calculateBMI(toKg(weight, weightUnit), toCm(height, heightUnit))
}

const MEASUREMENT_FIELDS: { key: keyof BodyMeasurements; label: string }[] = [
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'biceps', label: 'Biceps' },
  { key: 'thighs', label: 'Thighs' },
  { key: 'calves', label: 'Calves' },
  { key: 'neck', label: 'Neck' },
]

export function BodyStatsPage() {
  const { profile, updateProfile, bodyLogs, addBodyLog, deleteBodyLog } = useWorkoutData()

  const [date, setDate] = useState(todayISO())
  const [weight, setWeight] = useState('')
  const [weightUnit, setWeightUnit] = useState<'lb' | 'kg'>('lb')
  const [measurementUnit, setMeasurementUnit] = useState<'in' | 'cm'>(profile.heightUnit)
  const [measurements, setMeasurements] = useState<BodyMeasurements>({})
  const [chartMetric, setChartMetric] = useState<keyof BodyMeasurements | 'weight' | 'bmi'>(
    'weight',
  )

  const age = profile.birthDate ? calculateAge(profile.birthDate) : null

  const heightFeet = profile.height !== undefined ? Math.floor(profile.height / 12) : undefined
  const heightInches =
    profile.height !== undefined
      ? Math.round((profile.height - Math.floor(profile.height / 12) * 12) * 10) / 10
      : undefined

  function updateHeightFeetInches(feetStr: string, inchesStr: string) {
    if (feetStr.trim() === '' && inchesStr.trim() === '') {
      updateProfile({ ...profile, height: undefined })
      return
    }
    const feet = feetStr.trim() === '' ? 0 : Number(feetStr)
    const inches = inchesStr.trim() === '' ? 0 : Number(inchesStr)
    updateProfile({ ...profile, height: feet * 12 + inches })
  }

  function updateHeightUnit(newUnit: 'cm' | 'in') {
    updateProfile({
      ...profile,
      heightUnit: newUnit,
      height:
        profile.height === undefined
          ? undefined
          : Math.round(
              (newUnit === 'in'
                ? toIn(profile.height, profile.heightUnit)
                : toCm(profile.height, profile.heightUnit)) * 10,
            ) / 10,
    })
  }

  const latestWeightEntry = bodyLogs.find((e) => e.weight !== undefined)
  const currentBMI =
    latestWeightEntry?.weight !== undefined
      ? computeBMI(latestWeightEntry.weight, latestWeightEntry.weightUnit, profile.height, profile.heightUnit)
      : undefined

  const chartData = useMemo(() => {
    return [...bodyLogs]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => {
        let value: number | undefined
        if (chartMetric === 'weight') value = entry.weight
        else if (chartMetric === 'bmi') {
          value =
            entry.weight !== undefined
              ? computeBMI(entry.weight, entry.weightUnit, profile.height, profile.heightUnit)
              : undefined
        } else {
          value = entry.measurements[chartMetric]
        }
        return {
          date: entry.date,
          label: format(parseISO(entry.date), 'MMM d'),
          value,
        }
      })
      .filter((point) => point.value !== undefined && point.value !== null)
  }, [bodyLogs, chartMetric, profile.height, profile.heightUnit])

  function handleAddEntry(e: React.FormEvent) {
    e.preventDefault()
    const weightValue = weight.trim() === '' ? undefined : Number(weight)
    const hasMeasurement = Object.values(measurements).some((v) => v !== undefined)
    if (weightValue === undefined && !hasMeasurement) return

    addBodyLog({
      date,
      weight: weightValue,
      weightUnit,
      measurementUnit,
      measurements,
    })
    setWeight('')
    setMeasurements({})
  }

  function updateMeasurement(key: keyof BodyMeasurements, value: string) {
    setMeasurements((prev) => ({
      ...prev,
      [key]: value.trim() === '' ? undefined : Number(value),
    }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-100">Body Stats</h2>
        <p className="text-sm text-slate-400">Track weight, height, measurements, and age over time.</p>
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-300">Profile</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Birth date</label>
            <input
              type="date"
              value={profile.birthDate ?? ''}
              onChange={(e) => updateProfile({ ...profile, birthDate: e.target.value || undefined })}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500 sm:w-44"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Height</label>
            <div className="flex gap-2">
              {profile.heightUnit === 'in' ? (
                <>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={heightFeet ?? ''}
                    onChange={(e) =>
                      updateHeightFeetInches(e.target.value, String(heightInches ?? ''))
                    }
                    placeholder="ft"
                    className="w-16 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                  />
                  <input
                    type="number"
                    min={0}
                    max={11.9}
                    step={0.1}
                    value={heightInches ?? ''}
                    onChange={(e) =>
                      updateHeightFeetInches(String(heightFeet ?? ''), e.target.value)
                    }
                    placeholder="in"
                    className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                  />
                </>
              ) : (
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={profile.height ?? ''}
                  onChange={(e) =>
                    updateProfile({
                      ...profile,
                      height: e.target.value.trim() === '' ? undefined : Number(e.target.value),
                    })
                  }
                  placeholder="Height"
                  className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                />
              )}
              <select
                value={profile.heightUnit}
                onChange={(e) => updateHeightUnit(e.target.value as 'cm' | 'in')}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
              >
                <option value="in">ft/in</option>
                <option value="cm">cm</option>
              </select>
            </div>
          </div>
          {age !== null && (
            <div className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200">
              Age: <span className="font-semibold text-emerald-400">{age}</span>
            </div>
          )}
          {currentBMI !== undefined && (
            <div className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200">
              BMI: <span className="font-semibold text-slate-100">{currentBMI.toFixed(1)}</span>{' '}
              <span className={`font-semibold ${BMI_CATEGORY_COLOR[bmiCategory(currentBMI)]}`}>
                {bmiCategory(currentBMI)}
              </span>
            </div>
          )}
        </div>
        {profile.height !== undefined && currentBMI === undefined && (
          <p className="mt-2 text-xs text-slate-500">Log a weight entry below to see your BMI.</p>
        )}
        {profile.height === undefined && (
          <p className="mt-2 text-xs text-slate-500">Add your height to see your BMI.</p>
        )}
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-300">Log an entry</h3>
        <form onSubmit={handleAddEntry} className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500 sm:w-44"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Weight</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Weight"
                  className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                />
                <select
                  value={weightUnit}
                  onChange={(e) => setWeightUnit(e.target.value as 'lb' | 'kg')}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                >
                  <option value="lb">lb</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Measurement unit</label>
              <select
                value={measurementUnit}
                onChange={(e) => setMeasurementUnit(e.target.value as 'in' | 'cm')}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
              >
                <option value="in">in</option>
                <option value="cm">cm</option>
              </select>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-slate-400">Measurements (optional)</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {MEASUREMENT_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs text-slate-500">{label}</label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={measurements[key] ?? ''}
                    onChange={(e) => updateMeasurement(key, e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Button type="submit" icon={<Plus size={16} />}>
              Add Entry
            </Button>
          </div>
        </form>
      </Card>

      {bodyLogs.length === 0 ? (
        <EmptyState
          title="No body stats logged yet"
          description="Add an entry above to start tracking your weight and measurements over time."
        />
      ) : (
        <>
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-300">Trend</h3>
              <div className="flex flex-wrap gap-2">
                {(['weight', 'bmi', ...MEASUREMENT_FIELDS.map((f) => f.key)] as const).map(
                  (metric) => (
                    <button
                      key={metric}
                      onClick={() => setChartMetric(metric)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        chartMetric === metric
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {metric === 'weight'
                        ? 'Weight'
                        : metric === 'bmi'
                          ? 'BMI'
                          : MEASUREMENT_FIELDS.find((f) => f.key === metric)?.label}
                    </button>
                  ),
                )}
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="flex flex-col gap-3">
            {bodyLogs.map((entry) => {
              const measurementSummary = MEASUREMENT_FIELDS.filter(
                ({ key }) => entry.measurements[key] !== undefined,
              )
                .map(({ key, label }) => `${label} ${entry.measurements[key]}${entry.measurementUnit}`)
                .join(' · ')
              const bmi =
                entry.weight !== undefined
                  ? computeBMI(entry.weight, entry.weightUnit, profile.height, profile.heightUnit)
                  : undefined
              return (
                <Card key={entry.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-100">
                      {format(parseISO(entry.date), 'EEE, MMM d yyyy')}
                      {entry.weight !== undefined && (
                        <span className="ml-2 text-emerald-400">
                          {entry.weight}
                          {entry.weightUnit}
                        </span>
                      )}
                      {bmi !== undefined && (
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          BMI {bmi.toFixed(1)}
                        </span>
                      )}
                    </p>
                    {measurementSummary && (
                      <p className="text-xs text-slate-400">{measurementSummary}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteBodyLog(entry.id)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
