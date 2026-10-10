import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  padded?: boolean
}

export function Card({
  children,
  padded = true,
  className = '',
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        'rounded-lg border border-border bg-white shadow-card',
        padded ? 'p-4' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}
