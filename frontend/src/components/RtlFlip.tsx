import type { ReactNode } from 'react'

/** Mirrors directional icons in RTL (chevrons, arrows). */
export function RtlFlip({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span className={['inline-flex rtl:-scale-x-100', className].join(' ')}>
      {children}
    </span>
  )
}
