import type { ReactNode } from 'react'

export type BadgeTone = 'teal' | 'coral' | 'amber' | 'violet' | 'slate'

const toneClass: Record<BadgeTone, string> = {
  teal: 'bg-teal-light text-teal-dark',
  coral: 'bg-coral-light text-coral-dark',
  amber: 'bg-amber/15 text-amber-dark',
  violet: 'bg-violet-light text-violet',
  slate: 'bg-surface-4 text-muted',
}

type BadgeProps = {
  children: ReactNode
  tone?: BadgeTone
  className?: string
  /** Defaults to uppercase mono labels; set false for sentence-case chips. */
  uppercase?: boolean
}

export function Badge({
  children,
  tone = 'slate',
  className = '',
  uppercase = true,
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex h-5 items-center rounded-sm px-1.5 font-medium',
        uppercase
          ? 'font-mono text-[10px] uppercase tracking-wide'
          : 'font-sans text-[11px] tracking-normal',
        toneClass[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  )
}
