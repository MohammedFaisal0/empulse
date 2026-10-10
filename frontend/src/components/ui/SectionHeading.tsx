import type { ReactNode } from 'react'

type SectionHeadingProps = {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export function SectionHeading({
  title,
  subtitle,
  action,
  className = '',
}: SectionHeadingProps) {
  return (
    <div
      className={[
        'mb-3 flex items-start justify-between gap-3',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
