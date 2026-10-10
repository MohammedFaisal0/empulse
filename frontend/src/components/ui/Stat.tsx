type StatProps = {
  label: string
  value: string | number
  delta?: string
  deltaTone?: 'up' | 'down' | 'neutral'
  className?: string
}

const deltaClass = {
  up: 'text-green',
  down: 'text-coral',
  neutral: 'text-muted',
} as const

export function Stat({
  label,
  value,
  delta,
  deltaTone = 'neutral',
  className = '',
}: StatProps) {
  return (
    <div className={['flex flex-col gap-1', className].filter(Boolean).join(' ')}>
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      <span className="ltr-nums text-[28px] font-semibold leading-none text-ink">
        {value}
      </span>
      {delta ? (
        <span className={['text-xs font-medium', deltaClass[deltaTone]].join(' ')}>
          {delta}
        </span>
      ) : null}
    </div>
  )
}
