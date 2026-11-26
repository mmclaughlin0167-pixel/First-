import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

export function Card({ children, className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  icon?: ReactNode
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-50',
  secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700 disabled:opacity-50',
  danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50',
  ghost: 'text-slate-400 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-50',
}

export function Button({ variant = 'primary', icon, className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-800 py-16 text-center">
      <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
      <p className="max-w-sm text-sm text-slate-400">{description}</p>
      {action}
    </div>
  )
}
