type ProgressBarProps = {
  value: number
  max?: number
  tone?: 'teal' | 'coral' | 'amber' | 'violet' | 'navy'
  className?: string
  showLabel?: boolean
}

const fillClass = {
  teal: 'bg-teal',
  coral: 'bg-coral',
  amber: 'bg-amber',
  violet: 'bg-violet',
  navy: 'bg-navy',
} as const

export function ProgressBar({
  value,
  max = 100,
  tone = 'teal',
  className = '',
  showLabel = false,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))

  return (
    <div
      dir="ltr"
      className={['flex items-center gap-2', className].filter(Boolean).join(' ')}
    >
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className={['h-full rounded-full transition-all', fillClass[tone]].join(' ')}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel ? (
        <span className="ltr-nums shrink-0 font-mono text-[11px] text-muted">
          {Math.round(pct)}%
        </span>
      ) : null}
    </div>
  )
}
