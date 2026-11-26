import { useRef, useState } from 'react'
import { Download, Upload, Trash2, ListChecks } from 'lucide-react'
import { useWorkoutData, type BackupData } from '../store/WorkoutDataContext'
import { Button, Card, EmptyState } from '../components/ui'
import { ConfirmDialog } from '../components/ConfirmDialog'

function isBackupData(value: unknown): value is BackupData {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    v.version === 1 &&
    Array.isArray(v.exercises) &&
    Array.isArray(v.sessions) &&
    Array.isArray(v.bodyLogs) &&
    Array.isArray(v.templates) &&
    typeof v.profile === 'object' &&
    v.profile !== null
  )
}

export function SettingsPage() {
  const { templates, deleteTemplate, exportAllData, importAllData } = useWorkoutData()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<BackupData | null>(null)
  const [pendingDeleteTemplateId, setPendingDeleteTemplateId] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  function handleExport() {
    const data = exportAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ironlog-backup-${data.exportedAt.slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setImportError(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (!isBackupData(parsed)) {
          setImportError('That file doesn’t look like a valid IronLog backup.')
          return
        }
        setPendingImport(parsed)
      } catch {
        setImportError('Could not read that file as JSON.')
      }
    }
    reader.readAsText(file)
  }

  function confirmImport() {
    if (pendingImport) importAllData(pendingImport)
    setPendingImport(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <ConfirmDialog
        open={pendingImport !== null}
        title="Replace all app data?"
        description="Importing a backup overwrites every workout, exercise, body stat, and template currently stored on this device. This can't be undone."
        confirmLabel="Import & Replace"
        danger
        onConfirm={confirmImport}
        onCancel={() => setPendingImport(null)}
      />
      <ConfirmDialog
        open={pendingDeleteTemplateId !== null}
        title="Delete this template?"
        description="This removes the saved template. Workouts already logged from it are not affected."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (pendingDeleteTemplateId) deleteTemplate(pendingDeleteTemplateId)
          setPendingDeleteTemplateId(null)
        }}
        onCancel={() => setPendingDeleteTemplateId(null)}
      />

      <div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Settings</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage your templates and back up your data.</p>
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Backup &amp; Restore</h3>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          All of your data lives only in this browser. Export a backup to keep it safe, or move it
          to another device.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExport} icon={<Download size={16} />}>
            Export Backup
          </Button>
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            icon={<Upload size={16} />}
          >
            Import Backup
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleFileSelected}
            className="hidden"
          />
        </div>
        {importError && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{importError}</p>}
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Workout Templates</h3>
        {templates.length === 0 ? (
          <EmptyState
            title="No templates saved yet"
            description="Save a workout as a template from the Log Workout page to reuse it later."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between rounded-lg bg-slate-100 dark:bg-slate-950/60 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <ListChecks size={16} className="text-slate-600 dark:text-slate-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{template.name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-500">
                      {template.exercises.length} exercise{template.exercises.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPendingDeleteTemplateId(template.id)}
                  className="rounded-lg p-2 text-slate-600 dark:text-slate-500 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
