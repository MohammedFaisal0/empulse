import type { ReactNode } from 'react'

type ChipProps = {
  children: ReactNode
  className?: string
  active?: boolean
  onClick?: () => void
}

export function Chip({ children, className = '', active = false, onClick }: ChipProps) {
  const Comp = onClick ? 'button' : 'span'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={[
        'inline-flex h-7 items-center rounded-xl px-2.5 text-xs font-medium',
        active
          ? 'bg-teal-light text-teal-dark'
          : 'bg-surface-4 text-mutedText2',
        onClick ? 'cursor-pointer hover:bg-teal-lighter' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Comp>
  )
}
